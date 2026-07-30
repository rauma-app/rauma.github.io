export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Header CORS Lengkap
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // =============================================================
      // 1. ENDPOINT UPLOAD & TAMPIL GAMBAR R2
      // =============================================================
      if (path === "/upload" && method === "POST") {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
          return new Response(JSON.stringify({ error: "File tidak ditemukan" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const fileExt = file.name.split(".").pop() || "jpg";
        const key = `properties/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        await env.RAUMA_IMAGES.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || "image/jpeg" },
        });

        const imageUrl = `${url.origin}/images/${key}`;
        return new Response(JSON.stringify({ url: imageUrl, key }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

        // GET /api/listings/:id (DETAIL 1 PROPERTI)
        const pathParts = path.split("/").filter(Boolean); // ['api', 'listings', 'item_xxx']
        if (pathParts.length === 3 && method === "GET") {
          const id = pathParts[2];
          const result = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();

          if (!result) {
            return new Response(JSON.stringify({ error: "Properti tidak ditemukan" }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // DELETE /api/listings/:id (HAPUS PROPERTI)
        if (pathParts.length === 3 && method === "DELETE") {
          const id = pathParts[2];
          await env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(id).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // GET /api/listings (AMBIL SEMUA PROPERTI)
        if (path === "/api/listings" && method === "GET") {
          const category = url.searchParams.get("category");
          let query = "SELECT * FROM listings ORDER BY created_at DESC";
          let params = [];

          if (category) {
            query = "SELECT * FROM listings WHERE category = ? ORDER BY created_at DESC";
            params.push(category);
          }

          const { results } = await env.DB.prepare(query).bind(...params).all();
          return new Response(JSON.stringify(results || []), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // POST /api/listings (POSTING PROPERTI BARU)
        if (path === "/api/listings" && method === "POST") {
          const body = await request.json();
          const { id, title, price, location, category, description, seller_uid, seller_phone, images } = body;
          const idToSave = id || `item_${Date.now()}`;
          const imagesJson = typeof images === "string" ? images : JSON.stringify(images || []);

          await env.DB.prepare(
            `INSERT INTO listings (id, title, price, location, category, description, seller_uid, seller_phone, images) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(idToSave, title, Number(price), location, category, description || "", seller_uid, seller_phone || "", imagesJson)
          .run();

          return new Response(JSON.stringify({ success: true, id: idToSave }), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ error: "Endpoint tidak ditemukan" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
