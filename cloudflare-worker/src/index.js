export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Header CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // =============================================================
    // JIKA URL DIAWALI DENGAN /api/ -> TANGANI SEBAGAI REST API D1
    // =============================================================
    if (path.startsWith("/api/")) {

      // GET /api/listings
      if (path === "/api/listings" && method === "GET") {
        try {
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
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // GET /api/listings/:id
      if (path.startsWith("/api/listings/") && method === "GET") {
        try {
          const id = path.split("/")[3];
          const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();

          if (!listing) {
            return new Response(JSON.stringify({ error: "Tidak ditemukan" }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify(listing), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // POST /api/listings
      if (path === "/api/listings" && method === "POST") {
        try {
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
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Route API tidak dikenal
      return new Response(JSON.stringify({ error: "API Endpoint Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =============================================================
    // BUKAN API -> BIARKAN CLOUDFLARE MENAMPILKAN FRONTEND REACT
    // =============================================================
    return env.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
  },
};
