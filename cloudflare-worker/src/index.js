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

// TIDAK pakai library 'jose' -- itu npm package yang cuma bisa di-bundle
// lewat `wrangler deploy` di CLI. Kalau kode ini di-edit langsung di editor
// browser Cloudflare (Quick Edit / Edit code) tanpa CLI, import package
// akan gagal. Jadi verifikasi token ditulis manual pakai Web Crypto API
// (crypto.subtle) yang sudah bawaan di runtime Workers, tanpa dependency
// apapun.

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB -- generous, karena browser sudah mengompres duluan
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Cache JWK publik Google di memori isolate Worker ini, supaya tidak fetch
// ulang ke Google di setiap request upload.
let cachedJwks = null;
let cachedJwksExpiryMs = 0;

async function getGoogleJwk(kid) {
  const now = Date.now();
  if (!cachedJwks || now > cachedJwksExpiryMs) {
    // Endpoint JWK (bukan x509) -- balikin public key format JWK yang bisa
    // langsung dipakai crypto.subtle.importKey tanpa parsing sertifikat.
    const res = await fetch(
      'https://www.googleapis.com/service_accounts/v1/jwk/[email protected]'
    );
    const data = await res.json();
    cachedJwks = {};
    for (const key of data.keys) cachedJwks[key.kid] = key;
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
    cachedJwksExpiryMs = now + maxAgeMs;
  }
  return cachedJwks[kid];
}

function base64UrlToJson(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64));
}

function base64UrlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Verifikasi Firebase ID token TANPA library eksternal, murni Web Crypto
 * API. Mengikuti aturan resmi Firebase:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
async function verifyFirebaseToken(idToken, projectId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Format token tidak valid.');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = base64UrlToJson(headerB64);
  const payload = base64UrlToJson(payloadB64);

  if (header.alg !== 'RS256') throw new Error('Algoritma token tidak didukung.');

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('Token sudah kedaluwarsa.');
  }
  if (typeof payload.iat === 'number' && payload.iat > now + 60) {
    throw new Error('Token belum berlaku.');
  }
  if (payload.aud !== projectId) throw new Error('Token bukan untuk project ini.');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Issuer token tidak valid.');
  }
  if (!payload.sub) throw new Error('Token tidak punya subject (uid).');

  const jwk = await getGoogleJwk(header.kid);
  if (!jwk) throw new Error('Kunci publik Google tidak ditemukan untuk kid ini.');

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signature = base64UrlToBytes(sigB64);
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature,
    signedData
  );
  if (!valid) throw new Error('Tanda tangan token tidak valid.');

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
        console.error('Verifikasi token gagal:', err);
        return jsonError(
          `Login tidak valid atau sudah kedaluwarsa. (${err.message})`,
          401,
          origin
        );
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
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
