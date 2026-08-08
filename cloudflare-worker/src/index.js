export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

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
              materialPondasi, materialDinding, materialAtap, materialKusen, materialLantai, materialKloset
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
              materialLantai=excluded.materialLantai, materialKloset=excluded.materialKloset`
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
              body.materialKloset || null
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

