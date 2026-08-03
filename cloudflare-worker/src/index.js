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

          if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return json({ error: "Parameter lat & lon wajib diisi angka" }, 400);
          }

          const query = type
            ? "SELECT * FROM listings WHERE status = 'approved' AND lat IS NOT NULL AND lon IS NOT NULL AND type = ?"
            : "SELECT * FROM listings WHERE status = 'approved' AND lat IS NOT NULL AND lon IS NOT NULL";
          const stmt = type ? env.DB.prepare(query).bind(type) : env.DB.prepare(query);
          const { results } = await stmt.all();

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
        if (path === "/api/listings" && method === "GET") {
          const type = url.searchParams.get("type");
          const category = url.searchParams.get("category");
          const owner = url.searchParams.get("owner");
          const status = url.searchParams.get("status");
          const whatsapp = url.searchParams.get("whatsapp");

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
              images, status
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              title=excluded.title, type=excluded.type, category=excluded.category, price=excluded.price,
              cicilanPerBulan=excluded.cicilanPerBulan, location=excluded.location, kabupaten=excluded.kabupaten,
              kecamatan=excluded.kecamatan, lat=excluded.lat, lon=excluded.lon, luasTanah=excluded.luasTanah,
              luasBangunan=excluded.luasBangunan, unitTersedia=excluded.unitTersedia, bedrooms=excluded.bedrooms,
              bathrooms=excluded.bathrooms, electricity=excluded.electricity, air=excluded.air,
              sertifikat=excluded.sertifikat, videoUrl=excluded.videoUrl, description=excluded.description,
              phone=excluded.phone, seller_phone=excluded.seller_phone, whatsapp=excluded.whatsapp,
              seller_uid=excluded.seller_uid, ownerUid=excluded.ownerUid, ownerName=excluded.ownerName,
              ownerPhoto=excluded.ownerPhoto, images=excluded.images, status=excluded.status`
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
              body.status || "pending"
            )
            .run();

          return json({ success: true, id: idToSave }, 201);
        }
      }

      return json({ error: "Endpoint tidak ditemukan" }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
