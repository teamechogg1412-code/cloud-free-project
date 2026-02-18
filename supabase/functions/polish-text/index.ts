import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS 프리플라이트 요청 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 Edge Function 'polish-text' 시작됨");

    // Authentication check
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

    // 1. Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get("DB_URL") ?? Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("DB_ADMIN_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("관리자 비밀키(DB_ADMIN_KEY)가 설정되지 않았습니다.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. DB에서 설정 값(토큰, 모델) 가져오기
    console.log("🔍 DB에서 시스템 설정 조회 중...");
    const { data: configs, error: configError } = await supabaseAdmin
      .from("system_configs")
      .select("key, value")
      .in("key", ["huggingface_token", "huggingface_model"]);

    if (configError) {
      console.error("❌ DB 조회 에러:", configError);
      throw new Error("시스템 설정을 DB에서 불러올 수 없습니다.");
    }

    if (!configs || configs.length === 0) {
      throw new Error("system_configs 테이블에 설정 값이 없습니다. 슈퍼 어드민 페이지를 확인하세요.");
    }

    // 배열을 객체로 변환
    const settings = configs.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
    
    const HF_TOKEN = settings["huggingface_token"];
    const MODEL_ID = settings["huggingface_model"];

    // 토큰 값 검증
    if (!HF_TOKEN || HF_TOKEN.trim() === "") {
      throw new Error("Hugging Face 토큰이 비어있습니다. [슈퍼 어드민 > 시스템 API 설정]에서 토큰을 저장해주세요.");
    }

    // 3. 클라이언트 요청 데이터 받기
    const { text } = await req.json();
    if (!text) throw new Error("입력된 텍스트가 없습니다.");

    // Input validation
    if (typeof text !== "string" || text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "텍스트는 5000자 이하여야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 텍스트 처리 요청 (길이: ${text.length}자)`);

    // 4. Hugging Face API 호출
    console.log(`🤖 AI 모델 호출 중 (${MODEL_ID})...`);
    
    const response = await fetch(
      `https://router.huggingface.co/v1/chat/completions`, 
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [
            { role: "system", content: "당신은 전문적인 에디터입니다. 입력된 문장을 정중하고 세련된 비즈니스 문체로 다듬어주세요. 설명 없이 결과 문장만 출력하세요." },
            { role: "user", content: `다음 문장을 다듬어줘:\n\n${text}` }
          ],
          max_tokens: 500,
          temperature: 0.2,
        }),
      }
    );

    const result = await response.json();

    // AI 응답 에러 체크
    if (result.error) {
      console.error("❌ Hugging Face API 에러:", result.error);
      
      // 모델 로딩 중 에러(자주 발생함)에 대한 친절한 메시지 처리
      if (typeof result.error === 'string' && result.error.includes("loading")) {
        throw new Error("AI 모델을 서버에 로딩 중입니다. 약 30초 뒤에 다시 시도해주세요. (Estimated time error)");
      }
      
      throw new Error("AI 호출 중 오류가 발생했습니다.");
    }

    console.log("✅ 변환 성공!");

    return new Response(JSON.stringify({ result: result.choices[0].message.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("🔥 Edge Function 내부 오류 발생:", error);

    return new Response(JSON.stringify({ error: error.message || "알 수 없는 서버 오류" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
