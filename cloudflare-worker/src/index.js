export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- Helper tanggal WIB (UTC+7), dipakai buat filter periode statistik ---
    // datetime('now') di SQLite/D1 itu UTC, jadi semua boundary di sini
    // dihitung dulu di jam WIB terus dikonversi balik ke UTC buat query.
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
      // default: 'month' -> bulan ini
      return { start: toSqlUTC(new Date(Date.UTC(y, m, 1, 0, 0, 0))), end: null };
    }

    // Header CORS Lengkap
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    try {
      // =============================================================
      // 1. ENDPOINT UPLOAD & TAMPIL GAMBAR R2
      // =============================================================
      if (path === "/upload" && method === "POST") {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
          return json({ error: "File tidak ditemukan" }, 400);
        }

        const fileExt = file.name.split(".").pop() || "jpg";
        const key = `properties/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

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
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(object.body, { headers });
      }

      // =============================================================
      // 2a. ENDPOINT PREMIUM ACCOUNTS (kelola akun Premium tanpa perlu
      // edit kode -- dipakai halaman Admin -> "Kelola Premium")
      // =============================================================
      if (path === "/api/premium" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT uid, label, created_at FROM premium_accounts ORDER BY created_at DESC"
        ).all();
        return json(results || []);
      }

      if (path === "/api/premium" && method === "POST") {
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
        const uid = path.split("/").filter(Boolean)[2];
        await env.DB.prepare("DELETE FROM premium_accounts WHERE uid = ?").bind(uid).run();
        return json({ success: true });
      }

      // =============================================================
      // 2b. ENDPOINT ADMIN PERUMAHAN (akun centang kuning terbatas, cuma
      // bisa posting kategori Perumahan -- dikelola dari halaman Admin ->
      // "Kelola Admin Perumahan", sama seperti Premium)
      // =============================================================
      if (path === "/api/perumahan-admins" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT uid, label, created_at FROM perumahan_admins ORDER BY created_at DESC"
        ).all();
        return json(results || []);
      }

      if (path === "/api/perumahan-admins" && method === "POST") {
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
        const uid = path.split("/").filter(Boolean)[2];
        await env.DB.prepare("DELETE FROM perumahan_admins WHERE uid = ?").bind(uid).run();
        return json({ success: true });
      }

      // =============================================================
      // 2c. ENDPOINT ANALYTICS (pageview, klik whatsapp, pencarian)
      // =============================================================
      if (path === "/api/events" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const eventType = body.event_type;
        if (!["pageview", "whatsapp_click", "search"].includes(eventType)) {
          return json({ error: "event_type tidak valid" }, 400);
        }
        await env.DB.prepare(
          `INSERT INTO analytics_events (event_type, anon_id, listing_id, query_text, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`
        )
          .bind(eventType, body.anon_id || null, body.listing_id || null, body.query_text || null)
          .run();
        return json({ success: true });
      }

      // GET /api/admin/stats?period=today|month|lastmonth
      // Dashboard statistik buat Admin: pengunjung, klik WA, pencarian,
      // listing baru, unit & nilai terjual (per periode) + data all-time
      // dan listing per daerah (snapshot sekarang, gak difilter periode).
      if (path === "/api/admin/stats" && method === "GET") {
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
      // 2b. ENDPOINT SELLERS (statistik unit terjual per penjual)
      // =============================================================
      if (path.startsWith("/api/sellers/")) {
        const sellerParts = path.split("/").filter(Boolean); // ['api', 'sellers', uid]
        if (sellerParts.length === 3 && method === "GET") {
          const uid = sellerParts[2];
          const row = await env.DB.prepare("SELECT sold_units FROM sellers WHERE uid = ?").bind(uid).first();
          return json({ uid, sold_units: row ? row.sold_units : 0 });
        }
      }

      // =============================================================
      // 2. ENDPOINT DATABASE D1 (/api/listings)
      // =============================================================
      if (path.startsWith("/api/listings")) {
        const pathParts = path.split("/").filter(Boolean); // ['api', 'listings', 'item_xxx']

        // GET /api/listings/nearby?lat=&lon=&limit= (N RUMAH TERDEKAT SE-INDONESIA)
        // Hitung jarak asli (haversine) dari SEMUA listing yang punya
        // koordinat di database, bukan cuma dari data yang sudah ke-load di
        // frontend -- supaya hasilnya akurat dari Sabang sampai Merauke.
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

        // GET /api/listings/:id (DETAIL 1 PROPERTI)
        if (pathParts.length === 3 && method === "GET") {
          const id = pathParts[2];
          const result = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();

          if (!result) {
            return json({ error: "Properti tidak ditemukan" }, 404);
          }
          return json(result);
        }

        // PATCH /api/listings/:id (UPDATE STATUS: approve / reject, dsb)
        if (pathParts.length === 3 && method === "PATCH") {
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

        // POST /api/listings/:id/mark-sold  { amount }
        // Tandai sejumlah unit dari 1 listing sebagai terjual:
        //  - Listing biasa (unitTersedia kosong/1)      -> amount dipaksa 1, status jadi 'sold'
        //  - Listing perumahan (unitTersedia > 1)       -> unitTersedia dikurangi `amount`,
        //                                                   status jadi 'sold' HANYA kalau sisa unit jadi 0
        // Setiap unit yang terjual juga menambah hitungan `sold_units` milik
        // pemilik listing di tabel `sellers`, supaya tetap terhitung di profil
        // walau listing-nya nanti dihapus. Dicatat JUGA ke `sales_log` --
        // berlaku buat SEMUA user (bukan cuma premium/admin) -- supaya
        // dashboard statistik Admin (nilai properti terjual) akurat.
        if (pathParts.length === 4 && pathParts[3] === "mark-sold" && method === "POST") {
          const id = pathParts[2];
          const body = await request.json().catch(() => ({}));

          const listing = await env.DB.prepare("SELECT ownerUid, unitTersedia, price FROM listings WHERE id = ?")
            .bind(id)
            .first();
          if (!listing) {
            return json({ error: "Properti tidak ditemukan" }, 404);
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

        // DELETE /api/listings/:id (HAPUS PROPERTI)
        if (pathParts.length === 3 && method === "DELETE") {
          const id = pathParts[2];
          await env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(id).run();
          return json({ success: true });
        }

        // GET /api/listings (AMBIL SEMUA / FILTER PROPERTI)
        // Query params yang didukung:
        //   ?type=perumahan        -> filter kolom type
        //   ?category=Rumah        -> filter kolom category
        //   ?owner=<uid>           -> filter ownerUid (dipakai "Iklan Saya" & profil penjual)
        //   ?status=pending        -> filter status tertentu
        //   ?status=all            -> tanpa filter status sama sekali (khusus admin)
        //   (tanpa ?status)        -> default hanya status = 'approved' (aman utk publik)
        //   ?minPrice=&maxPrice=   -> filter rentang harga (dipakai Pasti Pas / HNWI)
        //   ?location=bandung     -> cari di kolom kabupaten/kecamatan/location (LIKE, dipakai fitur search)
        if (path === "/api/listings" && method === "GET") {
          const type = url.searchParams.get("type");
          const category = url.searchParams.get("category");
          const owner = url.searchParams.get("owner");
          const status = url.searchParams.get("status");
          const whatsapp = url.searchParams.get("whatsapp");
          const minPrice = url.searchParams.get("minPrice");
          const maxPrice = url.searchParams.get("maxPrice");
          const location = url.searchParams.get("location");

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
           // Kata pencarian bisa berupa beberapa kata (misal "bandung barat"),
            // masing-masing kata dicocokkan LIKE ke kabupaten/kecamatan/location
            // -- listing cocok kalau SEMUA kata ketemu di salah satu kolom itu.
            const words = location.split(/\s+/).filter(Boolean).slice(0, 5);
            for (const word of words) {
              conditions.push("(kabupaten LIKE ? OR kecamatan LIKE ? OR location LIKE ?)");
              const like = `%${word}%`;
              params.push(like, like, like);
            }
          }

          if (status === "all") {
            // tidak ada filter status, admin ingin lihat semuanya
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

        // POST /api/listings (POSTING PROPERTI BARU / EDIT PROPERTI LAMA)
        if (path === "/api/listings" && method === "POST") {
          const body = await request.json();
          const idToSave = body.id || `item_${Date.now()}`;
          const imagesJson = typeof body.images === "string" ? body.images : JSON.stringify(body.images || []);

          const toNumberOrNull = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

          await env.DB.prepare(
            `INSERT INTO listings (
              id, title, type, category, price, cicilanPerBulan,
              location, kabupaten, kecamatan, lat, lon,
              luasTanah, luasBangunan, unitTersedia, bedrooms, bathrooms,
              electricity, air, sertifikat, videoUrl, description,
              phone, seller_phone, whatsapp, seller_uid, ownerUid, ownerName, ownerPhoto,
              images, status,
              materialPondasi, materialDinding, materialAtap, materialKusen, materialLantai, materialKloset,
              perumahanName, perumahanPhoto
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
              perumahanName=excluded.perumahanName, perumahanPhoto=excluded.perumahanPhoto`
          )
            .bind(
              idToSave,
              body.title || "",
              body.type || null,
              body.category || null,
              toNumberOrNull(body.price) || 0,
              toNumberOrNull(body.cicilanPerBulan),
              body.location || null,
              body.kabupaten || null,
              body.kecamatan || null,
              toNumberOrNull(body.lat),
              toNumberOrNull(body.lon),
              toNumberOrNull(body.luasTanah),
              toNumberOrNull(body.luasBangunan),
              toNumberOrNull(body.unitTersedia),
              toNumberOrNull(body.bedrooms),
              toNumberOrNull(body.bathrooms),
              body.electricity || null,
              body.air || null,
              body.sertifikat || null,
              body.videoUrl || null,
              body.description || "",
              body.phone || null,
              body.seller_phone || body.phone || "",
              body.whatsapp || body.phone || null,
              body.seller_uid || "",
              body.ownerUid || body.seller_uid || "",
              body.ownerName || null,
              body.ownerPhoto || null,
              imagesJson,
              body.status || "pending",
              body.materialPondasi || null,
              body.materialDinding || null,
              body.materialAtap || null,
              body.materialKusen || null,
              body.materialLantai || null,
              body.materialKloset || null,
              body.perumahanName || null,
              body.perumahanPhoto || null
            )
            .run();

          return json({ success: true, id: idToSave }, 201);
        }
      }

      // =============================================================
      // 3. ENDPOINT SIMPAN/BOOKMARK LISTING (/api/saved)
      // =============================================================
      if (path.startsWith("/api/saved")) {
        const savedParts = path.split("/").filter(Boolean); // ['api','saved'] atau ['api','saved','status']

        // GET /api/saved/status?uid=&listingId=  -> cek apakah 1 listing sudah disimpan user ini
        if (savedParts.length === 3 && savedParts[2] === "status" && method === "GET") {
          const uid = url.searchParams.get("uid");
          const listingId = url.searchParams.get("listingId");
          if (!uid || !listingId) {
            return json({ error: "Parameter uid & listingId wajib diisi" }, 400);
          }
          const row = await env.DB.prepare(
            "SELECT 1 FROM saved_listings WHERE uid = ? AND listing_id = ?"
          )
            .bind(uid, listingId)
            .first();
          return json({ saved: !!row });
        }

        // GET /api/saved?uid=  -> daftar listing yang disimpan user ini (data lengkap, join ke tabel listings)
        if (path === "/api/saved" && method === "GET") {
          const uid = url.searchParams.get("uid");
          if (!uid) {
            return json({ error: "Parameter uid wajib diisi" }, 400);
          }
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

        // POST /api/saved { uid, listingId }  -> simpan listing
        if (path === "/api/saved" && method === "POST") {
          const body = await request.json();
          if (!body.uid || !body.listingId) {
            return json({ error: "uid & listingId wajib diisi" }, 400);
          }
          const savedId = `${body.uid}_${body.listingId}`;
          await env.DB.prepare(
            "INSERT OR IGNORE INTO saved_listings (id, uid, listing_id) VALUES (?, ?, ?)"
          )
            .bind(savedId, body.uid, body.listingId)
            .run();
          return json({ success: true });
        }

        // DELETE /api/saved { uid, listingId }  -> batalkan simpan (unsave)
        if (path === "/api/saved" && method === "DELETE") {
          const body = await request.json();
          if (!body.uid || !body.listingId) {
            return json({ error: "uid & listingId wajib diisi" }, 400);
          }
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
