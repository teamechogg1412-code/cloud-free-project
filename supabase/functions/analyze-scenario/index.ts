import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepKey, variables, tenantId } = await req.json();

    if (!stepKey || !tenantId) {
      return new Response(
        JSON.stringify({ error: "stepKey와 tenantId가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to external Supabase to fetch prompt
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const extClient = createClient(extUrl, extKey);

    // Fetch prompt by key, prefer tenant-specific, fallback to global
    const { data: prompts, error: promptError } = await extClient
      .from("scenario_prompts")
      .select("*")
      .eq("key", stepKey)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order("tenant_id", { ascending: false, nullsFirst: false })
      .limit(1);

    if (promptError || !prompts || prompts.length === 0) {
      return new Response(
        JSON.stringify({ error: `프롬프트를 찾을 수 없습니다: ${stepKey}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const promptTemplate = prompts[0].content;

    // Variable substitution engine
    let finalPrompt = promptTemplate;
    if (variables && typeof variables === "object") {
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        finalPrompt = finalPrompt.replaceAll(placeholder, String(value || ""));
      }
    }

    // Remove any remaining unreplaced placeholders
    finalPrompt = finalPrompt.replace(/\{\{[A-Z_]+\}\}/g, "(정보 없음)");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "당신은 엔터테인먼트 업계 전문 시나리오 분석가입니다. 주어진 프롬프트에 따라 체계적이고 전문적인 분석을 수행합니다. 결과는 반드시 마크다운 형식으로 작성하세요."
          },
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI 분석 중 오류가 발생했습니다.");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI 응답이 비어있습니다.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        stepKey,
        result: content,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-scenario error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
