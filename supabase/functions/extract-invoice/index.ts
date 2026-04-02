import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_urls, invoice_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!file_urls || !Array.isArray(file_urls) || file_urls.length === 0) {
      throw new Error("file_urls is required");
    }

    // Build content with file URLs for the AI to analyze
    const fileDescriptions = file_urls.map((url: string, i: number) => {
      const fileName = decodeURIComponent(url.split("/").pop() || `file_${i}`);
      return `파일 ${i + 1}: ${fileName} (URL: ${url})`;
    }).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an invoice/estimate data extraction assistant. Given file URLs of invoices, estimates, or tax invoices, extract structured data. Always respond using the extract_invoice_data tool.`
          },
          {
            role: "user",
            content: `다음 청구서/견적서 파일에서 정보를 추출해주세요:\n${fileDescriptions}\n\n파일 URL을 분석하여 파일명, 금액 패턴 등에서 추출 가능한 정보를 최대한 추출하세요. 이미지나 PDF의 경우 URL로부터 유추할 수 있는 정보를 활용하세요.`
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured data from invoice/estimate documents",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "Item description" },
                        quantity: { type: "number", description: "Quantity" },
                        unit_price: { type: "number", description: "Unit price" },
                        amount: { type: "number", description: "Total amount for this item" },
                      },
                      required: ["description", "amount"],
                      additionalProperties: false,
                    },
                  },
                  total: { type: "number", description: "Total invoice amount" },
                  tax_amount: { type: "number", description: "Tax amount (VAT)" },
                  invoice_date: { type: "string", description: "Invoice date (YYYY-MM-DD)" },
                  invoice_number: { type: "string", description: "Invoice or estimate number" },
                  vendor_info: { type: "string", description: "Vendor/issuer name and business number" },
                  payment_due: { type: "string", description: "Payment due date" },
                  notes: { type: "string", description: "Additional notes from the document" },
                },
                required: ["items", "total"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 크레딧이 부족합니다." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI extraction failed");
    }

    const result = await response.json();
    let extracted = {};

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        extracted = { items: [], total: 0, notes: "추출 실패" };
      }
    }

    return new Response(JSON.stringify({ extracted, invoice_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-invoice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
