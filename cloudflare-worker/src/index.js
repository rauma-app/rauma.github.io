export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

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
      // 1. ENDPOINT API D1 DATABASE
      // =============================================================

      // GET /api/listings -> Ambil semua listing
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

      // GET /api/listings/:id -> Ambil detail 1 properti
      if (path.startsWith("/api/listings/") && method === "GET") {
        const id = path.split("/")[3];
        const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?")
          .bind(id)
          .first();

        if (!listing) {
          return new Response(JSON.stringify({ error: "Properti tidak ditemukan" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(listing), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // POST /api/listings -> Tambah properti baru ke D1
      if (path === "/api/listings" && method === "POST") {
        const body = await request.json();
        const {
          id,
          title,
          price,
          location,
          category,
          description,
          seller_uid,
          seller_phone,
          images,
        } = body;

        const idToSave = id || `item_${Date.now()}`;
        const imagesJson = typeof images === "string" ? images : JSON.stringify(images || []);

        await env.DB.prepare(
          `INSERT INTO listings (id, title, price, location, category, description, seller_uid, seller_phone, images) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            idToSave,
            title,
            Number(price),
            location,
            category,
            description || "",
            seller_uid,
            seller_phone || "",
            imagesJson
          )
          .run();

        return new Response(
          JSON.stringify({ success: true, message: "Properti berhasil ditambahkan", id: idToSave }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // DELETE /api/listings/:id -> Hapus properti
      if (path.startsWith("/api/listings/") && method === "DELETE") {
        const id = path.split("/")[3];

        await env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(id).run();

        return new Response(
          JSON.stringify({ success: true, message: "Properti berhasil dihapus" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =============================================================
      // 2. FALLBACK/SERVE R2 IMAGES OR FRONTEND
      // =============================================================
      
      // Jika request memanggil file/gambar dari R2 Bucket (jika ada binding env.MY_BUCKET)
      if (env.MY_BUCKET && path.startsWith("/images/")) {
        const key = path.replace("/images/", "");
        const object = await env.MY_BUCKET.get(key);

        if (!object) {
          return new Response("Gambar tidak ditemukan", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(object.body, { headers });
      }

      return new Response(JSON.stringify({ message: "Rauma API Server Ready" }), {
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
        
