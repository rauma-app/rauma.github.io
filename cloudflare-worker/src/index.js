// =============================================================
// Verifikasi Firebase ID Token TANPA library luar (murni Web Crypto API
// bawaan Cloudflare Workers) -- supaya bisa langsung ditempel di editor
// dashboard Cloudflare tanpa proses "npm install"/bundling apapun.
// =============================================================

let cachedJWKS = null;
let cachedJWKSAt = 0;

async function getGoogleJWKS() {
  const ONE_HOUR = 3600 * 1000;
  if (cachedJWKS && Date.now() - cachedJWKSAt < ONE_HOUR) return cachedJWKS;
  const res = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );
  const data = await res.json();
  cachedJWKS = data.keys || [];
  cachedJWKSAt = Date.now();
  return cachedJWKS;
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(str) {
  return new TextDecoder().decode(base64UrlDecode(str));
}

async function verifyFirebaseIdToken(token, projectId) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(base64UrlDecodeToString(headerB64));
  const payload = JSON.parse(base64UrlDecodeToString(payloadB64));

  if (header.alg !== "RS256" || !header.kid) return null;

  // --- Cek klaim dasar dulu (murah), baru verifikasi tanda tangan (mahal) ---
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) return null;
  if (!payload.iat || payload.iat > nowSec + 60) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.sub) return null;

  const keys = await getGoogleJWKS();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  let cryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch {
    return null;
  }

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(sigB64);

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData);
  if (!valid) return null;

  return { uid: payload.sub, email: payload.email || null, name: payload.name || null };
}

// Domain yang boleh manggil API ini. Ganti/tambah kalau sudah pakai domain
// sendiri (misal https://rauma.id) -- JANGAN dibiarkan "*" lagi, karena
// digabung dengan endpoint yang sekarang udah butuh login, browser tetap
// perlu tau origin mana yang "dipercaya" buat kirim cookie/header auth.
const ALLOWED_ORIGINS = [
  "https://rauma.id",
  "https://rauma.github.io", // sementara, boleh dihapus nanti kalau domain rauma.id sudah aktif penuh
  "http://localhost:5173",
  "http://localhost:3000",
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- Helper tanggal WIB (UTC+7), dipakai buat filter periode statistik ---
    function wibNow() {
      return new Date(Date.now() + 7 * 3600 * 1000);
    }
    function toSqlUTC(wibWallClockDate) {
      return new Date(wibWallClockDate.getTime() - 7 * 3600 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    }
    function getPeriodRange(period) {
      const now = wibNow();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const d = now.getUTCDate();
      if (period === "today") {
        return { start: toSqlUTC(new Date(Date.UTC(y, m, d, 0, 0, 0))), end: null };
      }
      if (period === "lastmonth") {
        return {
          start: toSqlUTC(new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))),
          end: toSqlUTC(new Date(Date.UTC(y, m, 1, 0, 0, 0))),
        };
      }
      return { start: toSqlUTC(new Date(Date.UTC(y, m, 1, 0, 0, 0))), end: null };
    }

    // --- CORS: cuma refleksikan origin yang ada di whitelist, bukan "*" ---
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    };
    if (ALLOWED_ORIGINS.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const unauthorized = (msg = "Kamu harus login dulu") => json({ error: msg }, 401);
    const forbidden = (msg = "Kamu tidak punya akses untuk aksi ini") => json({ error: msg }, 403);

    // =============================================================
    // AUTH: verifikasi Firebase ID Token dari header Authorization.
    // Ini yang tadinya HILANG SAMA SEKALI -- semua endpoint sensitif di
    // bawah sekarang wajib lewat sini dulu.
    // =============================================================
    async function getAuthedUser() {
      const header = request.headers.get("Authorization") || "";
      const m = header.match(/^Bearer (.+)$/);
      if (!m) return null;
      try {
        return await verifyFirebaseIdToken(m[1], env.FIREBASE_PROJECT_ID);
      } catch (err) {
        return null;
      }
    }

    function isAdminUid(uid) {
      const list = (env.ADMIN_UIDS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return list.includes(uid);
    }

    // --- Rate limiting ringan (opsional). Cuma aktif kalau ada binding KV
    // bernama RATE_LIMIT di wrangler.toml. Kalau belum di-setup, fungsi ini
    // gak ngapa-ngapain (skip diam-diam) -- jadi gak bikin apa pun rusak
    // buat yang belum sempat setup KV-nya sebelum launching.
    async function tooManyRequests(key, limit, windowSeconds) {
      if (!env.RATE_LIMIT) return false;
      try {
        const current = Number((await env.RATE_LIMIT.get(key)) || "0");
        if (current >= limit) return true;
        await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: windowSeconds });
        return false;
      } catch {
        return false; // kalau KV lagi error, jangan sampai nge-block user beneran
      }
    }
    function clientIp() {
      return request.headers.get("CF-Connecting-IP") || "unknown";
    }

    // --- Slug URL SEO buat listing perumahan, misal "Green Residen
    // Parahyangan" -> "green-residen-parahyangan". Dibuat SEKALI waktu
    // listing perumahan pertama kali dibuat, lalu dikunci selamanya
    // (lihat catatan di endpoint POST /api/listings).
    function slugify(str) {
      return String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // buang aksen
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    }

    async function generateUniqueSlug(base) {
      const cleanBase = slugify(base) || "perumahan";
      let slug = cleanBase;
      let n = 2;
      // Coba maks 50x biar gak infinite loop kalau ada hal aneh
      for (let i = 0; i < 50; i++) {
        const row = await env.DB.prepare("SELECT id FROM listings WHERE perumahanSlug = ?").bind(slug).first();
        if (!row) return slug;
        slug = `${cleanBase}-${n}`;
        n++;
      }
      return `${cleanBase}-${Date.now()}`; // fallback super jarang kepake
    }

    try {
      // =============================================================
      // 0b. SITEMAP DINAMIS UNTUK HALAMAN DETAIL LISTING
      // =============================================================
      // Berbeda dari sitemap-listings.xml (yang cuma dari pencarian yang
      // pernah diketik orang), ini mendaftarkan SEMUA listing approved
      // apa adanya -- jadi listing di lokasi manapun (misal Cililin) tetap
      // punya jalur pasti buat ditemukan Google, walau belum pernah ada
      // yang search lokasi itu di web. Route-nya ikut src/App.jsx:
      //   - listing dengan perumahanSlug -> /perumahan/:slug
      //   - listing biasa (rumah individu)-> /id/:id
      if (path === "/sitemap-detail.xml" && method === "GET") {
        const rows = await env.DB.prepare(
          `SELECT id, perumahanSlug, created_at FROM listings WHERE status = 'approved' ORDER BY created_at DESC LIMIT 45000`
        ).all();

        const urlEntries = (rows.results || []).map((row) => {
          const loc = row.perumahanSlug
            ? `https://rauma.id/perumahan/${row.perumahanSlug}`
            : `https://rauma.id/id/${row.id}`;
          const lastmod = row.created_at ? String(row.created_at).slice(0, 10) : "";
          return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>0.6</priority></url>`;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=UTF-8",
            "Cache-Control": "public, max-age=21600",
          },
        });
      }

      // =============================================================
      // 0c. SITEMAP DINAMIS UNTUK HALAMAN PENCARIAN (/cari/:slug)
      // =============================================================
      // Setiap pencarian yang diketik orang di rauma.id (lihat
      // d1Api.logEvent('search', ...) di frontend) tercatat di tabel
      // analytics_events. Endpoint ini mengambil pencarian yang PALING
      // SERING diketik, mengecek apakah pencarian itu BENERAN punya
      // listing yang cocok, dan cuma memasukkan yang punya hasil ke
      // sitemap -- supaya Google gak nemu halaman kosong (thin content).
      //
      // Setup di Cloudflare dashboard: tambahkan Workers Route
      //   rauma.id/sitemap-listings.xml
      // yang mengarah ke worker ini (biar URL-nya sehost dengan rauma.id,
      // syarat wajib sitemap menurut aturan Google), lalu tambahkan baris
      //   Sitemap: https://rauma.id/sitemap-listings.xml
      // di public/robots.txt.
      if (path === "/sitemap-listings.xml" && method === "GET") {
        // Port ringan dari src/lib/searchParser.js (frontend) -- HARUS
        // tetap disamakan kalau logika parsing di frontend diubah nanti.
        function unitMultiplier(unit) {
          if (/^(jt|juta|jutaan)$/.test(unit)) return 1_000_000;
          if (/^(m|miliar|milyar|milyaran|miliaran)$/.test(unit)) return 1_000_000_000;
          return 1;
        }
        const UNIT = "jt|juta|jutaan|m|miliar|milyar|milyaran|miliaran";
        function bucketRange(value) {
          const base = Math.floor(value / 100_000_000) * 100_000_000;
          return { min: base, max: base + 99_000_000 };
        }
        function parseSearchLite(rawText) {
          const text = (rawText || "").trim();
          if (!text) return null;
          let working = ` ${text.toLowerCase()} `;
          let minPrice = null;
          let maxPrice = null;

          const rangeRe = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:-|–|sampai|s\\.?d\\.?|hingga|\\s+)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b`);
          const underRe = new RegExp(`(di\\s*bawah|maksimal|maks|kurang\\s*dari)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b`);
          const overRe = new RegExp(`(di\\s*atas|minimal|min|lebih\\s*dari)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b`);
          const singleRe = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b\\s*(an\\b)?`);

          let m = working.match(rangeRe);
          if (m) {
            const mult = unitMultiplier(m[3]);
            const a = parseFloat(m[1].replace(",", ".")) * mult;
            const b = parseFloat(m[2].replace(",", ".")) * mult;
            minPrice = Math.min(a, b);
            maxPrice = Math.max(a, b);
            working = working.replace(m[0], " ");
          } else if ((m = working.match(underRe))) {
            maxPrice = parseFloat(m[2].replace(",", ".")) * unitMultiplier(m[3]);
            working = working.replace(m[0], " ");
          } else if ((m = working.match(overRe))) {
            minPrice = parseFloat(m[2].replace(",", ".")) * unitMultiplier(m[3]);
            working = working.replace(m[0], " ");
          } else if ((m = working.match(singleRe))) {
            const value = parseFloat(m[1].replace(",", ".")) * unitMultiplier(m[2]);
            const { min, max } = bucketRange(value);
            minPrice = min;
            maxPrice = max;
            working = working.replace(m[0], " ");
          }

          const stopwords = [
            "rumah", "rmh", "properti", "hunian", "tanah", "ruko", "kavling", "perumahan",
            "dijual", "jual", "beli", "cari", "carikan", "mau", "pengen", "ingin", "nyari",
            "ada", "apa", "yang", "dong", "min", "kak", "tolong", "bantu", "di", "ke", "ya",
            "daerah", "kawasan", "wilayah", "sekitar", "dekat", "area", "lokasi", "harga",
            "kisaran", "sekitaran", "budget", "dgn", "dengan", "murah", "termurah", "baru",
            "dong", "gan", "kak", "plis", "please",
          ];
          const stopRe = new RegExp(`\\b(${stopwords.join("|")})\\b`, "g");
          const location = working.replace(stopRe, " ").replace(/\s+/g, " ").trim();

          if (!location && minPrice == null && maxPrice == null) return null;
          return { minPrice, maxPrice, location };
        }

        // Sama seperti src/lib/searchParser.js -> slugifySearch(), supaya
        // URL yang dihasilkan cocok dengan yang dikenali route /cari/:slug.
        function slugifySearchTerm(text) {
          return (text || "")
            .toLowerCase()
            .trim()
            .replace(/(\d),(\d)/g, "$1.$2")
            .replace(/[^a-z0-9\s.-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
        }

        const rows = await env.DB.prepare(
          `SELECT query_text, COUNT(*) AS cnt
           FROM analytics_events
           WHERE event_type = 'search' AND query_text IS NOT NULL AND TRIM(query_text) != ''
           GROUP BY query_text
           ORDER BY cnt DESC
           LIMIT 800`
        ).all();

        const seenSlugs = new Set();
        const urlEntries = [];

        for (const row of rows.results || []) {
          const parsed = parseSearchLite(row.query_text);
          if (!parsed) continue; // gak ada harga & lokasi sama sekali, gak layak jadi landing page

          const slug = slugifySearchTerm(row.query_text);
          if (!slug || seenSlugs.has(slug)) continue;

          // Cek beneran ada listing yang cocok -- ini yang mencegah
          // halaman kosong (thin content) masuk sitemap.
          const conditions = ["status = 'approved'"];
          const binds = [];
          if (parsed.minPrice != null) {
            conditions.push("price >= ?");
            binds.push(parsed.minPrice);
          }
          if (parsed.maxPrice != null) {
            conditions.push("price <= ?");
            binds.push(parsed.maxPrice);
          }
          if (parsed.location) {
            const words = parsed.location.split(/\s+/).filter(Boolean).slice(0, 5);
            for (const w of words) {
              conditions.push("(kabupaten LIKE ? OR kecamatan LIKE ? OR location LIKE ?)");
              binds.push(`%${w}%`, `%${w}%`, `%${w}%`);
            }
          }

          const countRow = await env.DB.prepare(
            `SELECT COUNT(*) AS n FROM listings WHERE ${conditions.join(" AND ")}`
          ).bind(...binds).first();

          if (!countRow || countRow.n <= 0) continue;

          seenSlugs.add(slug);
          // Prioritas mengikuti seberapa sering dicari (dibatasi 0.5 - 0.8
          // biar tetap di bawah halaman utama/kategori yang priority-nya
          // di-set manual di public/sitemap.xml).
          const priority = Math.min(0.8, Math.max(0.5, 0.5 + Math.log10(row.cnt + 1) / 10)).toFixed(1);
          urlEntries.push(`  <url><loc>https://rauma.id/cari/${slug}</loc><priority>${priority}</priority></url>`);
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=UTF-8",
            // Cache 6 jam di edge Cloudflare -- endpoint ini query lumayan
            // banyak (N+1 ke listings), gak perlu dihitung ulang tiap kali
            // Googlebot mampir.
            "Cache-Control": "public, max-age=21600",
          },
        });
      }

      // =============================================================
      // 1. ENDPOINT UPLOAD & TAMPIL GAMBAR R2
      // =============================================================
      if (path === "/upload" && method === "POST") {
        const authed = await getAuthedUser();
        if (!authed) return unauthorized("Login dulu untuk upload foto");

        if (await tooManyRequests(`upload:${authed.uid}`, 40, 3600)) {
          return json({ error: "Terlalu banyak upload, coba lagi nanti" }, 429);
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || typeof file === "string") {
          return json({ error: "File tidak ditemukan" }, 400);
        }
        if (!file.type || !file.type.startsWith("image/")) {
          return json({ error: "File harus berupa gambar" }, 400);
        }
        const MAX_BYTES = 10 * 1024 * 1024; // 10MB, longgar buat jaga-jaga kompresi gagal
        if (file.size > MAX_BYTES) {
          return json({ error: "Ukuran gambar maksimal 10MB" }, 400);
        }

        const fileExt = (file.name || "").split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = /^[a-z0-9]{2,5}$/.test(fileExt) ? fileExt : "jpg";
        const key = `properties/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;

        await env.RAUMA_IMAGES.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || "image/jpeg" },
        });

        const imageUrl = `${url.origin}/images/${key}`;
        return json({ url: imageUrl, key });
      }

      if (path.startsWith("/images/") && method === "GET") {
        const key = path.replace("/images/", "");
        const object = await env.RAUMA_IMAGES.get(key);

        if (!object) {
          return new Response("Gambar tidak ditemukan", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes(origin) ? origin : "");

        return new Response(object.body, { headers });
      }

      // =============================================================
      // 2a. ENDPOINT PREMIUM ACCOUNTS -- GET publik (buat nampilin badge di
      // seluruh situs), tapi POST/DELETE (nambah/cabut premium) SEKARANG
      // WAJIB ADMIN. Ini yang tadinya bisa dipanggil siapa aja.
      // =============================================================
      if (path === "/api/premium" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT uid, label, created_at FROM premium_accounts ORDER BY created_at DESC"
        ).all();
        return json(results || []);
      }

      if (path === "/api/premium" && method === "POST") {
        const authed = await getAuthedUser();
        if (!authed) return unauthorized();
        if (!isAdminUid(authed.uid)) return forbidden("Hanya admin yang bisa mengelola akun Premium");

        const body = await request.json().catch(() => ({}));
        if (!body.uid) {
          return json({ error: "Field 'uid' wajib diisi" }, 400);
        }
        await env.DB.prepare(
          `INSERT INTO premium_accounts (uid, label, created_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(uid) DO UPDATE SET label = excluded.label`
        )
          .bind(body.uid, body.label || null)
          .run();
        return json({ success: true });
      }

      if (path.startsWith("/api/premium/") && method === "DELETE") {
        const authed = await getAuthedUser();
        if (!authed) return unauthorized();
        if (!isAdminUid(authed.uid)) return forbidden("Hanya admin yang bisa mengelola akun Premium");

        const uid = path.split("/").filter(Boolean)[2];
        await env.DB.prepare("DELETE FROM premium_accounts WHERE uid = ?").bind(uid).run();
        return json({ success: true });
      }

      // =============================================================
      // 2b. ENDPOINT ADMIN PERUMAHAN -- sama seperti Premium: GET publik,
      // POST/DELETE admin-only.
      // =============================================================
      if (path === "/api/perumahan-admins" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT uid, label, created_at FROM perumahan_admins ORDER BY created_at DESC"
        ).all();
        return json(results || []);
      }

      if (path === "/api/perumahan-admins" && method === "POST") {
        const authed = await getAuthedUser();
        if (!authed) return unauthorized();
        if (!isAdminUid(authed.uid)) return forbidden("Hanya admin yang bisa mengelola Admin Perumahan");

        const body = await request.json().catch(() => ({}));
        if (!body.uid) {
          return json({ error: "Field 'uid' wajib diisi" }, 400);
        }
        await env.DB.prepare(
          `INSERT INTO perumahan_admins (uid, label, created_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(uid) DO UPDATE SET label = excluded.label`
        )
          .bind(body.uid, body.label || null)
          .run();
        return json({ success: true });
      }

      if (path.startsWith("/api/perumahan-admins/") && method === "DELETE") {
        const authed = await getAuthedUser();
        if (!authed) return unauthorized();
        if (!isAdminUid(authed.uid)) return forbidden("Hanya admin yang bisa mengelola Admin Perumahan");

        const uid = path.split("/").filter(Boolean)[2];
        await env.DB.prepare("DELETE FROM perumahan_admins WHERE uid = ?").bind(uid).run();
        return json({ success: true });
      }

      // =============================================================
      // 2c. ENDPOINT ANALYTICS (pageview, klik whatsapp, pencarian)
      // Tetap publik/anonim (memang buat pengunjung yang belum login),
      // tapi dibatasi rate + panjang teks biar gak gampang di-spam bot.
      // =============================================================
      if (path === "/api/events" && method === "POST") {
        if (await tooManyRequests(`events:${clientIp()}`, 120, 60)) {
          return json({ error: "Terlalu banyak permintaan" }, 429);
        }
        const body = await request.json().catch(() => ({}));
        const eventType = body.event_type;
        if (!["pageview", "whatsapp_click", "search"].includes(eventType)) {
          return json({ error: "event_type tidak valid" }, 400);
        }
        const queryText = typeof body.query_text === "string" ? body.query_text.slice(0, 200) : null;
        await env.DB.prepare(
          `INSERT INTO analytics_events (event_type, anon_id, listing_id, query_text, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`
        )
          .bind(eventType, body.anon_id || null, body.listing_id || null, queryText)
          .run();
        return json({ success: true });
      }

      // GET /api/admin/stats?period=today|month|lastmonth  -- SEKARANG ADMIN-ONLY
      if (path === "/api/admin/stats" && method === "GET") {
        const authed = await getAuthedUser();
        if (!authed) return unauthorized();
        if (!isAdminUid(authed.uid)) return forbidden("Hanya admin yang bisa melihat statistik");

        const period = url.searchParams.get("period") || "today";
        const { start, end } = getPeriodRange(period);
        const endClause = end ? "AND created_at < ?" : "";
        const bindDate = (base) => (end ? [...base, start, end] : [...base, start]);

        const pageviewsRow = await env.DB.prepare(
          `SELECT COUNT(DISTINCT anon_id) AS n FROM analytics_events WHERE event_type = 'pageview' AND created_at >= ? ${endClause}`
        )
          .bind(...bindDate([]))
          .first();

        const waClicksRow = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'whatsapp_click' AND created_at >= ? ${endClause}`
        )
          .bind(...bindDate([]))
          .first();

        const searchesRow = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'search' AND created_at >= ? ${endClause}`
        )
          .bind(...bindDate([]))
          .first();

        const newListingsRow = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM listings WHERE created_at >= ? ${endClause}`
        )
          .bind(...bindDate([]))
          .first();

        const soldPeriodRow = await env.DB.prepare(
          `SELECT COALESCE(SUM(amount), 0) AS units, COALESCE(SUM(total_value), 0) AS value
           FROM sales_log WHERE created_at >= ? ${endClause}`
        )
          .bind(...bindDate([]))
          .first();

        const soldAllTimeRow = await env.DB.prepare(
          `SELECT COALESCE(SUM(amount), 0) AS units, COALESCE(SUM(total_value), 0) AS value FROM sales_log`
        ).first();

        const { results: byArea } = await env.DB.prepare(
          `SELECT COALESCE(kabupaten, 'Lainnya') AS kabupaten, COUNT(*) AS count
           FROM listings WHERE status = 'approved'
           GROUP BY kabupaten ORDER BY count DESC`
        ).all();

        return json({
          period: {
            pengunjung: pageviewsRow?.n || 0,
            klik_whatsapp: waClicksRow?.n || 0,
            pencarian: searchesRow?.n || 0,
            listing_baru: newListingsRow?.n || 0,
            unit_terjual: soldPeriodRow?.units || 0,
            nilai_terjual: soldPeriodRow?.value || 0,
          },
          all_time: {
            unit_terjual: soldAllTimeRow?.units || 0,
            nilai_terjual: soldAllTimeRow?.value || 0,
          },
          listing_per_daerah: byArea || [],
        });
      }

      // =============================================================
      // 2b. ENDPOINT SELLERS (statistik unit terjual per penjual) -- publik
      // =============================================================
      if (path.startsWith("/api/sellers/")) {
        const sellerParts = path.split("/").filter(Boolean);
        if (sellerParts.length === 3 && method === "GET") {
          const uid = sellerParts[2];
          const row = await env.DB.prepare("SELECT sold_units FROM sellers WHERE uid = ?").bind(uid).first();
          return json({ uid, sold_units: row ? row.sold_units : 0 });
        }
      }

      // =============================================================
      // 2b. ENDPOINT PROFIL PENGGUNA (nama, foto, deskripsi, username yang
      // bisa diedit) -- GET publik (dipakai di halaman profil penjual),
      // PUT WAJIB LOGIN dan cuma boleh ubah profil MILIK SENDIRI (uid
      // diambil dari token yang sudah diverifikasi, BUKAN dari body
      // request, biar gak bisa dipakai buat ubah profil orang lain).
      // =============================================================
      if (path.startsWith("/api/profile")) {
        const profileParts = path.split("/").filter(Boolean); // ["api", "profile", ...]

        // GET /api/profile/username/:username -> lookup buat resolve URL
        // rauma.id/u/:username jadi uid pemiliknya.
        if (profileParts.length === 4 && profileParts[2] === "username" && method === "GET") {
          const username = String(profileParts[3] || "").toLowerCase();
          const row = await env.DB.prepare(
            "SELECT uid, name, photo, description, username, updated_at FROM user_profiles WHERE username = ?"
          )
            .bind(username)
            .first();
          if (!row) return json({ error: "Username tidak ditemukan" }, 404);
          return json(row);
        }

        // GET /api/profile/:uid -> profil berdasarkan uid (dipakai fallback
        // link lama /penjual/:uid, dan buat isi awal form Profil Saya)
        if (profileParts.length === 3 && method === "GET") {
          const uid = profileParts[2];
          const row = await env.DB.prepare(
            "SELECT uid, name, photo, description, username, updated_at FROM user_profiles WHERE uid = ?"
          )
            .bind(uid)
            .first();
          return json(row || { uid, name: null, photo: null, description: null, username: null });
        }

        if (path === "/api/profile" && method === "PUT") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized("Login dulu untuk mengubah profil");

          if (await tooManyRequests(`profile:${authed.uid}`, 20, 3600)) {
            return json({ error: "Terlalu banyak percobaan, coba lagi nanti" }, 429);
          }

          const body = await request.json().catch(() => ({}));
          const name = String(body.name || "").trim().slice(0, 80);
          const photo = String(body.photo || "").trim().slice(0, 500);
          const description = String(body.description || "").trim().slice(0, 500);
          // Username OPSIONAL. Kalau diisi kosong/tidak dikirim -> disimpan
          // NULL (boleh dobel NULL, cuma yang keisi yang wajib unik).
          let username = body.username == null ? null : String(body.username).trim().toLowerCase();
          if (username === "") username = null;

          if (!name) return json({ error: "Nama tidak boleh kosong" }, 400);

          if (username !== null) {
            if (!/^[a-z0-9_]{3,20}$/.test(username)) {
              return json(
                { error: "Username 3-20 karakter, cuma huruf kecil, angka, dan underscore" },
                400
              );
            }
            const taken = await env.DB.prepare(
              "SELECT uid FROM user_profiles WHERE username = ? AND uid != ?"
            )
              .bind(username, authed.uid)
              .first();
            if (taken) return json({ error: "Username sudah dipakai, coba yang lain" }, 409);
          }

          try {
            await env.DB.prepare(
              `INSERT INTO user_profiles (uid, name, photo, description, username, updated_at)
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(uid) DO UPDATE SET
                 name=excluded.name, photo=excluded.photo,
                 description=excluded.description, username=excluded.username,
                 updated_at=CURRENT_TIMESTAMP`
            )
              .bind(authed.uid, name, photo, description, username)
              .run();
          } catch (err) {
            // Jaga-jaga race condition (2 orang klik simpan barengan dgn
            // username sama persis) -- unique index di DB yang jadi garis
            // pertahanan terakhir.
            return json({ error: "Username sudah dipakai, coba yang lain" }, 409);
          }

          // Ikut update nama & foto di SEMUA iklan aktif milik user ini,
          // biar konsisten (iklan lama gak nampilin nama/foto usang).
          await env.DB.prepare("UPDATE listings SET ownerName = ?, ownerPhoto = ? WHERE ownerUid = ?")
            .bind(name, photo, authed.uid)
            .run();

          return json({ uid: authed.uid, name, photo, description, username });
        }
      }

      // =============================================================
      // 2. ENDPOINT DATABASE D1 (/api/listings)
      // =============================================================
      if (path.startsWith("/api/listings")) {
        const pathParts = path.split("/").filter(Boolean);

        // GET /api/listings/nearby -- publik (cuma listing approved yang punya koordinat)
        if (pathParts.length === 3 && pathParts[2] === "nearby" && method === "GET") {
          const lat = parseFloat(url.searchParams.get("lat"));
          const lon = parseFloat(url.searchParams.get("lon"));
          const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 200);
          const type = url.searchParams.get("type");
          const minPrice = url.searchParams.get("minPrice");
          const maxPrice = url.searchParams.get("maxPrice");

          if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return json({ error: "Parameter lat & lon wajib diisi angka" }, 400);
          }

          const nearbyConditions = ["status = 'approved'", "lat IS NOT NULL", "lon IS NOT NULL"];
          const nearbyParams = [];
          if (type) {
            nearbyConditions.push("type = ?");
            nearbyParams.push(type);
          }
          if (minPrice) {
            nearbyConditions.push("price >= ?");
            nearbyParams.push(Number(minPrice));
          }
          if (maxPrice) {
            nearbyConditions.push("price <= ?");
            nearbyParams.push(Number(maxPrice));
          }

          const nearbyQuery = `SELECT * FROM listings WHERE ${nearbyConditions.join(" AND ")}`;
          const { results } = await env.DB.prepare(nearbyQuery).bind(...nearbyParams).all();

          const toRad = (deg) => (deg * Math.PI) / 180;
          const haversineKm = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          };

          const withDistance = (results || []).map((row) => ({
            ...row,
            distanceKm: Math.round(haversineKm(lat, lon, row.lat, row.lon) * 10) / 10,
          }));

          withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

          return json(withDistance.slice(0, limit));
        }

        // GET /api/listings/slug/:slug -- publik. Buat URL SEO listing
        // perumahan, misal rauma.id/perumahan/green-residen-parahyangan.
        if (pathParts.length === 4 && pathParts[2] === "slug" && method === "GET") {
          const slug = pathParts[3];
          const result = await env.DB.prepare("SELECT * FROM listings WHERE perumahanSlug = ?")
            .bind(slug)
            .first();
          if (!result) {
            return json({ error: "Properti tidak ditemukan" }, 404);
          }
          return json(result);
        }

        // GET /api/listings/:id -- publik (detail 1 properti)
        if (pathParts.length === 3 && method === "GET") {
          const id = pathParts[2];
          // LEFT JOIN user_profiles biar ikut bawa ownerUsername (kalau
          // pemiliknya sudah set username) -- dipakai frontend buat link
          // /u/username ke profil penjual, bukan cuma /penjual/uid.
          const result = await env.DB.prepare(
            `SELECT listings.*, user_profiles.username AS ownerUsername
             FROM listings
             LEFT JOIN user_profiles ON user_profiles.uid = listings.ownerUid
             WHERE listings.id = ?`
          )
            .bind(id)
            .first();

          if (!result) {
            return json({ error: "Properti tidak ditemukan" }, 404);
          }
          return json(result);
        }

        // POST /api/listings/:id/view -- publik. Catat 1 "dilihat" buat
        // listing ini. Di-dedup per hari pakai anon_id (ID acak dari
        // localStorage browser pengunjung, BUKAN dari IP -- 1 IP bisa
        // dipakai banyak orang beda, 1 HP juga bisa gonta-ganti IP).
        // Refresh berkali-kali di hari yang sama TIDAK nambah hitungan;
        // besok baru boleh nambah 1 lagi.
        if (pathParts.length === 4 && pathParts[3] === "view" && method === "POST") {
          const id = pathParts[2];
          const body = await request.json().catch(() => ({}));
          const anonId = String(body.anon_id || "").slice(0, 100);
          if (!anonId) return json({ error: "anon_id wajib diisi" }, 400);

          const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

          try {
            // INSERT ke tabel dedup -- kalau kombinasi listing+anon+tanggal
            // ini SUDAH ada (primary key bentrok), otomatis gagal & masuk
            // catch -> artinya sudah kehitung hari ini, gak usah nambah lagi.
            await env.DB.prepare(
              "INSERT INTO listing_views (listing_id, anon_id, view_date) VALUES (?, ?, ?)"
            )
              .bind(id, anonId, today)
              .run();

            await env.DB.prepare("UPDATE listings SET viewCount = viewCount + 1 WHERE id = ?")
              .bind(id)
              .run();

            return json({ counted: true });
          } catch (err) {
            // Sudah pernah kehitung hari ini -- bukan error, cuma gak nambah lagi.
            return json({ counted: false });
          }
        }

        // PATCH /api/listings/:id (approve/reject) -- ADMIN ONLY.
        // Tadinya siapa aja bisa approve iklan sendiri lewat sini.
        if (pathParts.length === 3 && method === "PATCH") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();
          if (!isAdminUid(authed.uid)) return forbidden("Hanya admin yang bisa mengubah status iklan");

          const id = pathParts[2];
          const body = await request.json();

          if (!body.status) {
            return json({ error: "Field 'status' wajib diisi" }, 400);
          }

          await env.DB.prepare("UPDATE listings SET status = ? WHERE id = ?")
            .bind(body.status, id)
            .run();

          return json({ success: true });
        }

        // POST /api/listings/:id/mark-sold -- pemilik iklan ATAU admin
        if (pathParts.length === 4 && pathParts[3] === "mark-sold" && method === "POST") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();

          const id = pathParts[2];
          const body = await request.json().catch(() => ({}));

          const listing = await env.DB.prepare("SELECT ownerUid, unitTersedia, price FROM listings WHERE id = ?")
            .bind(id)
            .first();
          if (!listing) {
            return json({ error: "Properti tidak ditemukan" }, 404);
          }
          if (listing.ownerUid !== authed.uid && !isAdminUid(authed.uid)) {
            return forbidden("Bukan pemilik iklan ini");
          }

          const currentUnits = Number(listing.unitTersedia);
          const isMultiUnit = Number.isFinite(currentUnits) && currentUnits > 1;

          let amount = 1;
          let newUnitTersedia = null;
          let newStatus = "sold";

          if (isMultiUnit) {
            const requested = Math.floor(Number(body.amount) || 1);
            amount = Math.min(Math.max(requested, 1), currentUnits);
            newUnitTersedia = currentUnits - amount;
            newStatus = newUnitTersedia <= 0 ? "sold" : "approved";
          }

          if (isMultiUnit) {
            await env.DB.prepare("UPDATE listings SET unitTersedia = ?, status = ? WHERE id = ?")
              .bind(newUnitTersedia, newStatus, id)
              .run();
          } else {
            await env.DB.prepare("UPDATE listings SET status = ? WHERE id = ?")
              .bind(newStatus, id)
              .run();
          }

          if (listing.ownerUid) {
            await env.DB.prepare(
              `INSERT INTO sellers (uid, sold_units) VALUES (?, ?)
               ON CONFLICT(uid) DO UPDATE SET sold_units = sold_units + excluded.sold_units`
            )
              .bind(listing.ownerUid, amount)
              .run();
          }

          const pricePerUnit = Number(listing.price) || 0;
          const totalValue = pricePerUnit * amount;
          await env.DB.prepare(
            `INSERT INTO sales_log (listing_id, uid, amount, price, total_value, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`
          )
            .bind(id, listing.ownerUid || null, amount, pricePerUnit, totalValue)
            .run();

          return json({ success: true, amount, newStatus, newUnitTersedia });
        }

        // DELETE /api/listings/:id -- pemilik iklan ATAU admin
        if (pathParts.length === 3 && method === "DELETE") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();

          const id = pathParts[2];
          const existing = await env.DB.prepare("SELECT ownerUid FROM listings WHERE id = ?").bind(id).first();
          if (!existing) {
            return json({ error: "Properti tidak ditemukan" }, 404);
          }
          if (existing.ownerUid !== authed.uid && !isAdminUid(authed.uid)) {
            return forbidden("Bukan pemilik iklan ini");
          }

          await env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(id).run();
          return json({ success: true });
        }

        // GET /api/listings -- publik HANYA untuk status='approved' (default).
        // Minta status lain (all/pending/rejected) sekarang wajib login, dan
        // cuma boleh: admin (lihat semua), atau pemilik lihat listingnya
        // sendiri (?owner=uid miliknya), atau cek nomor WA duplikat (?whatsapp=).
        if (path === "/api/listings" && method === "GET") {
          const type = url.searchParams.get("type");
          const category = url.searchParams.get("category");
          const owner = url.searchParams.get("owner");
          const status = url.searchParams.get("status");
          const whatsapp = url.searchParams.get("whatsapp");
          const minPrice = url.searchParams.get("minPrice");
          const maxPrice = url.searchParams.get("maxPrice");
          const location = url.searchParams.get("location");

          if (status && status !== "approved") {
            const authed = await getAuthedUser();
            if (!authed) return unauthorized();
            const admin = isAdminUid(authed.uid);
            const selfScoped = owner && owner === authed.uid;
            const phoneCheck = Boolean(whatsapp);
            if (!admin && !selfScoped && !phoneCheck) {
              return forbidden("Tidak boleh melihat iklan status ini");
            }
          }

          const conditions = [];
          const params = [];

          if (type) {
            conditions.push("type = ?");
            params.push(type);
          }
          if (category) {
            conditions.push("category = ?");
            params.push(category);
          }
          if (owner) {
            conditions.push("ownerUid = ?");
            params.push(owner);
          }
          if (whatsapp) {
            conditions.push("whatsapp = ?");
            params.push(whatsapp);
          }
          if (minPrice) {
            conditions.push("price >= ?");
            params.push(Number(minPrice));
          }
          if (maxPrice) {
            conditions.push("price <= ?");
            params.push(Number(maxPrice));
          }
          if (location) {
            const words = location.split(/\s+/).filter(Boolean).slice(0, 5);
            for (const word of words) {
              conditions.push("(kabupaten LIKE ? OR kecamatan LIKE ? OR location LIKE ?)");
              const like = `%${word}%`;
              params.push(like, like, like);
            }
          }

          if (status === "all") {
            // tidak ada filter status
          } else if (status) {
            conditions.push("status = ?");
            params.push(status);
          } else {
            conditions.push("status = 'approved'");
          }

          let query = "SELECT * FROM listings";
          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
          }
          query += " ORDER BY created_at DESC";

          const { results } = await env.DB.prepare(query).bind(...params).all();
          return json(results || []);
        }

        // POST /api/listings (POSTING BARU / EDIT) -- wajib login. Non-admin
        // cuma boleh posting/edit ATAS NAMA DIRINYA SENDIRI, gak bisa
        // menimpa listing orang lain, dan gak bisa set status='approved'
        // sendiri (dipaksa balik ke 'pending').
        if (path === "/api/listings" && method === "POST") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized("Login dulu untuk memasang iklan");

          const body = await request.json();
          const idToSave = body.id || `item_${Date.now()}`;
          const admin = isAdminUid(authed.uid);
          // Admin Perumahan (tabel perumahan_admins): iklan yang mereka
          // posting langsung approved otomatis, gak perlu tinjauan Admin
          // Utama -- soalnya mereka sendiri yang mengelola perumahannya.
          const perumahanAdminRow = admin
            ? null
            : await env.DB.prepare("SELECT uid FROM perumahan_admins WHERE uid = ?").bind(authed.uid).first();
          const isPerumahanAdmin = admin || Boolean(perumahanAdminRow);

          const existing = await env.DB.prepare("SELECT ownerUid FROM listings WHERE id = ?")
            .bind(idToSave)
            .first();
          if (existing && existing.ownerUid !== authed.uid && !admin) {
            return forbidden("Bukan pemilik iklan ini");
          }

          if (!admin && (await tooManyRequests(`post-listing:${authed.uid}`, 20, 3600))) {
            return json({ error: "Terlalu banyak posting, coba lagi nanti" }, 429);
          }

          const finalOwnerUid = admin ? body.ownerUid || body.seller_uid || authed.uid : authed.uid;
          const finalStatus = admin
            ? body.status || "pending"
            : isPerumahanAdmin
              ? "approved"
              : "pending";

          const imagesJson = typeof body.images === "string" ? body.images : JSON.stringify(body.images || []);
          const toNumberOrNull = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

          // Multi-tipe (khusus kategori Perumahan, maks 4 tipe per listing,
          // misal "Tipe 36/72" / "Tipe 45/90"). Kolom harga/cicilan/luas/
          // kamar/listrik di level listing tetap diisi dari TIPE TERMURAH,
          // supaya listing ini tetap ketemu normal di pencarian & filter
          // harga yang sudah ada -- gak perlu ubah logic pencarian sama
          // sekali. Detail semua tipe disimpan lengkap di kolom unitTypes.
          const unitTypesArr = Array.isArray(body.unitTypes) ? body.unitTypes.slice(0, 4) : [];
          const cheapestType = unitTypesArr.length
            ? [...unitTypesArr].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))[0]
            : null;
          const unitTypesJson = unitTypesArr.length ? JSON.stringify(unitTypesArr) : null;
          const src = cheapestType || body;

          // Slug URL SEO ("green-residen-parahyangan") -- CUMA dibuat &
          // dikunci untuk listing kategori 'perumahan'. Kalau ini listing
          // BARU (belum ada di DB), generate slug unik dari perumahanName.
          // Kalau ini EDIT listing yang sudah ada, pertahankan slug lama
          // apa adanya (TIDAK dibuat ulang) -- makanya perumahanSlug juga
          // sengaja TIDAK ada di klausa "ON CONFLICT DO UPDATE SET" di
          // bawah, biar walau kolom lain ke-update, URL-nya tetap sama
          // persis walau nama perumahannya diedit nanti.
          let perumahanSlug = null;
          if (body.type === "perumahan" && body.perumahanName) {
            if (existing) {
              const existingRow = await env.DB.prepare("SELECT perumahanSlug FROM listings WHERE id = ?")
                .bind(idToSave)
                .first();
              perumahanSlug = existingRow?.perumahanSlug || (await generateUniqueSlug(body.perumahanName));
            } else {
              perumahanSlug = await generateUniqueSlug(body.perumahanName);
            }
          }

          await env.DB.prepare(
            `INSERT INTO listings (
              id, title, type, category, price, cicilanPerBulan,
              location, kabupaten, kecamatan, lat, lon,
              luasTanah, luasBangunan, unitTersedia, bedrooms, bathrooms,
              electricity, air, sertifikat, videoUrl, description,
              phone, seller_phone, whatsapp, seller_uid, ownerUid, ownerName, ownerPhoto,
              images, status,
              materialPondasi, materialDinding, materialAtap, materialKusen, materialLantai, materialKloset,
              perumahanName, perumahanPhoto, unitTypes, perumahanSlug
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              title=excluded.title, type=excluded.type, category=excluded.category, price=excluded.price,
              cicilanPerBulan=excluded.cicilanPerBulan, location=excluded.location, kabupaten=excluded.kabupaten,
              kecamatan=excluded.kecamatan, lat=excluded.lat, lon=excluded.lon, luasTanah=excluded.luasTanah,
              luasBangunan=excluded.luasBangunan, unitTersedia=excluded.unitTersedia, bedrooms=excluded.bedrooms,
              bathrooms=excluded.bathrooms, electricity=excluded.electricity, air=excluded.air,
              sertifikat=excluded.sertifikat, videoUrl=excluded.videoUrl, description=excluded.description,
              phone=excluded.phone, seller_phone=excluded.seller_phone, whatsapp=excluded.whatsapp,
              seller_uid=excluded.seller_uid, ownerUid=excluded.ownerUid, ownerName=excluded.ownerName,
              ownerPhoto=excluded.ownerPhoto, images=excluded.images, status=excluded.status,
              materialPondasi=excluded.materialPondasi, materialDinding=excluded.materialDinding,
              materialAtap=excluded.materialAtap, materialKusen=excluded.materialKusen,
              materialLantai=excluded.materialLantai, materialKloset=excluded.materialKloset,
              perumahanName=excluded.perumahanName, perumahanPhoto=excluded.perumahanPhoto,
              unitTypes=excluded.unitTypes`
          )
            .bind(
              idToSave,
              body.title || "",
              body.type || null,
              body.category || null,
              toNumberOrNull(src.price) || 0,
              toNumberOrNull(src.cicilanPerBulan),
              body.location || null,
              body.kabupaten || null,
              body.kecamatan || null,
              toNumberOrNull(body.lat),
              toNumberOrNull(body.lon),
              toNumberOrNull(src.luasTanah),
              toNumberOrNull(src.luasBangunan),
              toNumberOrNull(body.unitTersedia),
              toNumberOrNull(src.bedrooms),
              toNumberOrNull(src.bathrooms),
              src.electricity || null,
              body.air || null,
              body.sertifikat || null,
              body.videoUrl || null,
              body.description || "",
              body.phone || null,
              body.seller_phone || body.phone || "",
              body.whatsapp || body.phone || null,
              admin ? body.seller_uid || authed.uid : authed.uid,
              finalOwnerUid,
              body.ownerName || null,
              body.ownerPhoto || null,
              imagesJson,
              finalStatus,
              body.materialPondasi || null,
              body.materialDinding || null,
              body.materialAtap || null,
              body.materialKusen || null,
              body.materialLantai || null,
              body.materialKloset || null,
              body.perumahanName || null,
              body.perumahanPhoto || null,
              unitTypesJson,
              perumahanSlug
            )
            .run();

          return json({ success: true, id: idToSave, perumahanSlug }, 201);
        }
      }

      // =============================================================
      // 3. ENDPOINT SIMPAN/BOOKMARK LISTING (/api/saved) -- semua wajib
      // login, dan cuma boleh baca/tulis data simpanan DIRI SENDIRI.
      // =============================================================
      if (path.startsWith("/api/saved")) {
        const savedParts = path.split("/").filter(Boolean);

        if (savedParts.length === 3 && savedParts[2] === "status" && method === "GET") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();
          const uid = url.searchParams.get("uid");
          const listingId = url.searchParams.get("listingId");
          if (!uid || !listingId) {
            return json({ error: "Parameter uid & listingId wajib diisi" }, 400);
          }
          if (uid !== authed.uid) return forbidden();
          const row = await env.DB.prepare(
            "SELECT 1 FROM saved_listings WHERE uid = ? AND listing_id = ?"
          )
            .bind(uid, listingId)
            .first();
          return json({ saved: !!row });
        }

        if (path === "/api/saved" && method === "GET") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();
          const uid = url.searchParams.get("uid");
          if (!uid) {
            return json({ error: "Parameter uid wajib diisi" }, 400);
          }
          if (uid !== authed.uid) return forbidden();
          const { results } = await env.DB.prepare(
            `SELECT listings.* FROM saved_listings
             JOIN listings ON saved_listings.listing_id = listings.id
             WHERE saved_listings.uid = ?
             ORDER BY saved_listings.created_at DESC`
          )
            .bind(uid)
            .all();
          return json(results || []);
        }

        if (path === "/api/saved" && method === "POST") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();
          const body = await request.json();
          if (!body.uid || !body.listingId) {
            return json({ error: "uid & listingId wajib diisi" }, 400);
          }
          if (body.uid !== authed.uid) return forbidden();
          const savedId = `${body.uid}_${body.listingId}`;
          await env.DB.prepare(
            "INSERT OR IGNORE INTO saved_listings (id, uid, listing_id) VALUES (?, ?, ?)"
          )
            .bind(savedId, body.uid, body.listingId)
            .run();
          return json({ success: true });
        }

        if (path === "/api/saved" && method === "DELETE") {
          const authed = await getAuthedUser();
          if (!authed) return unauthorized();
          const body = await request.json();
          if (!body.uid || !body.listingId) {
            return json({ error: "uid & listingId wajib diisi" }, 400);
          }
          if (body.uid !== authed.uid) return forbidden();
          await env.DB.prepare(
            "DELETE FROM saved_listings WHERE uid = ? AND listing_id = ?"
          )
            .bind(body.uid, body.listingId)
            .run();
          return json({ success: true });
        }
      }

      return json({ error: "Endpoint tidak ditemukan" }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
