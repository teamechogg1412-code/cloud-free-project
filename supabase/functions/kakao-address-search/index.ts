import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KAKAO_KEY = Deno.env.get("KAKAO_REST_API_KEY");
    if (!KAKAO_KEY) {
      throw new Error("KAKAO_REST_API_KEY is not configured");
    }

    const { query, page = 1, size = 5 } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and limit query length
    const sanitizedQuery = query.trim().slice(0, 100);

    // Search using Kakao Local keyword API (returns places with coordinates)
    const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(sanitizedQuery)}&page=${page}&size=${size}`;

    const response = await fetch(keywordUrl, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Kakao API error [${response.status}]: ${errText}`);
    }

    const data = await response.json();

    const results = (data.documents || []).map((doc: any) => ({
      place_name: doc.place_name,
      address_name: doc.address_name,
      road_address_name: doc.road_address_name || doc.address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      category: doc.category_group_name || "",
      phone: doc.phone || "",
    }));

    return new Response(
      JSON.stringify({ results, total: data.meta?.total_count || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
