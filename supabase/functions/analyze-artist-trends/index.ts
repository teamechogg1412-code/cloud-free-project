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
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { artistName, stageName } = await req.json();
    const searchName = stageName || artistName;

    if (!searchName) {
      return new Response(
        JSON.stringify({ error: "아티스트 이름이 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // AI를 사용해서 마켓 인사이트 데이터 생성
    const systemPrompt = `당신은 한국 엔터테인먼트 산업 전문 마케팅 애널리스트입니다. 
주어진 연예인/아티스트 이름에 대해 시장 분석 데이터를 JSON 형식으로 생성해주세요.

다음 형식으로 응답해주세요:
{
  "searchVolume": {
    "monthly": 숫자 (월간 검색량 추정치),
    "trend": "up" | "stable" | "down" (트렌드 방향),
    "changePercent": 숫자 (-100 ~ 100, 전월 대비 변화율)
  },
  "contentSaturation": {
    "percentage": 숫자 (0-100, 콘텐츠 포화도),
    "level": "매우 낮음" | "낮음" | "보통" | "높음" | "매우 높음"
  },
  "audienceInterest": {
    "grade": "A" | "B" | "C" | "D" (관심도 등급),
    "description": "한 줄 설명"
  },
  "demographics": {
    "femaleRatio": 숫자 (0-100, 여성 비율),
    "topAgeGroups": [
      { "age": "20대", "percentage": 숫자 },
      { "age": "30대", "percentage": 숫자 },
      { "age": "40대", "percentage": 숫자 }
    ]
  },
  "keywords": ["키워드1", "키워드2", ...] (최대 15개),
  "trendData": [
    { "year": "2020", "value": 숫자 (0-100) },
    { "year": "2021", "value": 숫자 },
    { "year": "2022", "value": 숫자 },
    { "year": "2023", "value": 숫자 },
    { "year": "2024", "value": 숫자 },
    { "year": "2025", "value": 숫자 }
  ],
  "summary": "3-4문장의 마케팅 전략 요약"
}

실제 인지도 트렌드를 반영하여 현실적인 수치를 생성해주세요.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `아티스트 "${searchName}"에 대한 마켓 인사이트 분석을 생성해주세요.` }
        ],
        temperature: 0.7,
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
          JSON.stringify({ error: "크레딧이 부족합니다. 워크스페이스에 크레딧을 추가해주세요." }),
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

    // JSON 파싱 시도
    let analysisData;
    try {
      // JSON 블록 추출 (```json ... ``` 형태 처리)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysisData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      throw new Error("분석 결과 파싱에 실패했습니다.");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        artistName: searchName,
        analysis: analysisData,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-artist-trends error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
