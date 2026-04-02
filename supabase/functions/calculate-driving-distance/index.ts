import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

interface RouteRequest {
  routes: { origin: RoutePoint; destination: RoutePoint }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KAKAO_KEY = Deno.env.get("KAKAO_REST_API_KEY");
    if (!KAKAO_KEY) {
      throw new Error("KAKAO_REST_API_KEY is not configured");
    }

    const { routes } = (await req.json()) as RouteRequest;

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      throw new Error("routes array is required");
    }

    // Batch calculate distances using Kakao Mobility Directions API
    const results = await Promise.all(
      routes.map(async (route) => {
        try {
          const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${route.origin.lng},${route.origin.lat}&destination=${route.destination.lng},${route.destination.lat}&priority=RECOMMEND`;

          const response = await fetch(url, {
            headers: {
              Authorization: `KakaoAK ${KAKAO_KEY}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error(`Kakao API error [${response.status}]:`, errText);
            return {
              origin: route.origin,
              destination: route.destination,
              distance_km: 0,
              duration_min: 0,
              error: `Kakao API ${response.status}`,
            };
          }

          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const summary = data.routes[0].summary;
            return {
              origin: route.origin,
              destination: route.destination,
              distance_km: Math.round((summary.distance / 1000) * 100) / 100,
              duration_min: Math.round(summary.duration / 60),
              error: null,
            };
          }

          return {
            origin: route.origin,
            destination: route.destination,
            distance_km: 0,
            duration_min: 0,
            error: "No route found",
          };
        } catch (e) {
          return {
            origin: route.origin,
            destination: route.destination,
            distance_km: 0,
            duration_min: 0,
            error: e.message,
          };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
