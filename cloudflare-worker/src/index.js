/**
 * Worker upload gambar untuk Rauma.
 *
 * Tugasnya cuma 2:
 *   1. POST /upload  -> terima file dari browser (yang sudah login lewat
 *      Firebase), simpan ke bucket R2, balikin URL publik.
 *   2. GET  /i/:key  -> ambil file dari R2 dan kirim ke browser dengan
 *      header cache, supaya gambar yang sering dibuka di-cache di edge
 *      Cloudflare (nyaris instan & tidak membebani R2 sama sekali).
 *
 * Kenapa upload harus lewat Worker, bukan browser -> R2 langsung:
 *   - Access key R2 TIDAK boleh ada di kode frontend (beda dengan Cloudinary
 *     yang punya mode "unsigned upload" khusus buat dipanggil dari browser).
 *   - Di sini kita bisa pastikan: harus login Firebase dulu, tipe file harus
 *     gambar, ukuran dibatasi. Kalau bucket dibuat publik-writable, semua
 *     kontrol itu hilang dan siapa saja bisa upload apa saja ke bucket kita.
 */

import { importX509, jwtVerify } from 'jose';

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB -- generous, karena browser sudah mengompres duluan
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Cache sertifikat publik Google di memori isolate Worker ini, supaya tidak
// fetch ulang ke Google di setiap request upload.
let cachedCerts = null;
let cachedCertsExpiryMs = 0;

async function getGoogleCert(kid) {
  const now = Date.now();
  if (!cachedCerts || now > cachedCertsExpiryMs) {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/[email protected]'
    );
    cachedCerts = await res.json();
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
    cachedCertsExpiryMs = now + maxAgeMs;
  }
  return cachedCerts[kid];
}

function base64UrlToJson(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64));
}

/** Verifikasi Firebase ID token TANPA Firebase Admin SDK (Worker tidak
 * mendukung Admin SDK). Ini mengikuti langkah manual resmi dari dokumentasi
 * Firebase: https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
async function verifyFirebaseToken(idToken, projectId) {
  const [headerB64] = idToken.split('.');
  const header = base64UrlToJson(headerB64);

  const cert = await getGoogleCert(header.kid);
  if (!cert) throw new Error('Token tidak valid (kunci publik tidak ditemukan).');

  const publicKey = await importX509(cert, 'RS256');
  const { payload } = await jwtVerify(idToken, publicKey, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });
  return payload; // payload.sub = uid Firebase user yang login
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function extFromType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // --- Upload (perlu login) ---
    if (request.method === 'POST' && url.pathname === '/upload') {
      // Cek konfigurasi dulu SEBELUM verifikasi token. Kalau var/binding ini
      // kosong, request akan selalu gagal untuk SIAPA SAJA (bukan cuma user
      // tertentu) -- jadi jangan sampai kesalahan konfigurasi begini malah
      // dilaporkan ke browser sebagai "Login tidak valid", karena itu
      // langsung menyesatkan (kelihatan cuma masalah akun user, padahal
      // servernya sendiri yang belum di-setup lengkap).
      if (!env.FIREBASE_PROJECT_ID) {
        console.error('FIREBASE_PROJECT_ID belum di-set di Worker ini.');
        return jsonError(
          'Konfigurasi server belum lengkap (FIREBASE_PROJECT_ID kosong). Cek Settings > Variables and secrets di Worker rauma-uploader.',
          500,
          origin
        );
      }
      if (!env.RAUMA_IMAGES) {
        console.error('R2 binding RAUMA_IMAGES tidak ditemukan di Worker ini.');
        return jsonError(
          'Konfigurasi server belum lengkap (R2 bucket binding RAUMA_IMAGES tidak ditemukan). Cek tab Bindings di Worker rauma-uploader.',
          500,
          origin
        );
      }

      const authHeader = request.headers.get('Authorization') || '';
      const idToken = authHeader.replace(/^Bearer\s+/i, '');
      if (!idToken) return jsonError('Harus login.', 401, origin);

      let uid;
      try {
        const payload = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
        uid = payload.sub;
      } catch (err) {
        // Ini KHUSUS kegagalan verifikasi token Firebase (token kedaluwarsa,
        // salah project, dsb) -- baru di sini pesan "login tidak valid" itu
        // benar-benar akurat.
        console.error('Verifikasi token gagal:', err);
        return jsonError('Login tidak valid atau sudah kedaluwarsa.', 401, origin);
      }

      try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') {
          return jsonError('File tidak ditemukan di request.', 400, origin);
        }
        if (!ALLOWED_TYPES.has(file.type)) {
          return jsonError('Tipe file harus JPEG, PNG, atau WebP.', 400, origin);
        }
        if (file.size > MAX_FILE_BYTES) {
          return jsonError('Ukuran file maksimal 8MB.', 400, origin);
        }

        const ext = extFromType(file.type);
        const key = `listings/${uid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        await env.RAUMA_IMAGES.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type },
        });

        const publicUrl = `${url.origin}/i/${key}`;
        return new Response(JSON.stringify({ url: publicUrl }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (err) {
        // Kegagalan setelah token valid -- biasanya masalah R2 (bucket
        // penuh/salah nama/dsb), bukan soal login. Jangan dilabeli 401.
        console.error('Upload ke R2 gagal:', err);
        return jsonError('Gagal menyimpan gambar ke server. Coba lagi ya.', 500, origin);
      }
    }

    // --- Serve gambar (publik, tidak perlu login) ---
    if (request.method === 'GET' && url.pathname.startsWith('/i/')) {
      const key = url.pathname.slice('/i/'.length);
      const object = await env.RAUMA_IMAGES.get(key);
      if (!object) return new Response('Not found', { status: 404 });

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          // Nama file sudah unik (timestamp + random), jadi aman di-cache
          // selamanya -- ini yang bikin gambar yang sering dibuka nyaris
          // gak pernah "menyentuh" R2 lagi setelah di-cache Cloudflare.
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

                                                  
