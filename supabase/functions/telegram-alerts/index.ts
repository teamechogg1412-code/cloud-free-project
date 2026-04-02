import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getBotToken(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", "TELEGRAM_BOT_TOKEN")
    .single();
  if (!data?.value) throw new Error("TELEGRAM_BOT_TOKEN 미설정");
  return data.value;
}

async function sendMessage(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

// 1. 일정 D-N 알림 (방별 설정 적용)
async function checkScheduleReminders(supabase: any, botToken: string) {
  // alert_schedule_enabled인 모든 활성 방 조회
  const { data: rooms } = await supabase
    .from("telegram_rooms")
    .select("chat_id, tenant_id, alert_schedule_days")
    .eq("is_active", true)
    .eq("alert_schedule_enabled", true);

  if (!rooms?.length) return;

  // (tenant_id, days) 조합별로 그룹핑
  const groups: Record<string, { days: number; chatIds: string[] }> = {};
  for (const room of rooms) {
    const days = room.alert_schedule_days ?? 3;
    const key = `${room.tenant_id}::${days}`;
    if (!groups[key]) groups[key] = { days, chatIds: [] };
    groups[key].chatIds.push(room.chat_id);
  }

  const now = new Date();

  for (const [key, { days, chatIds }] of Object.entries(groups)) {
    const tenantId = key.split("::")[0];

    const targetStart = new Date(now);
    targetStart.setDate(targetStart.getDate() + days);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetStart);
    targetEnd.setHours(23, 59, 59, 999);

    const { data: schedules } = await supabase
      .from("artist_schedules")
      .select("*, artists(name)")
      .eq("tenant_id", tenantId)
      .gte("start_time", targetStart.toISOString())
      .lte("start_time", targetEnd.toISOString());

    if (!schedules?.length) continue;

    const lines = schedules.map((s: any) => {
      const date = new Date(s.start_time).toLocaleDateString("ko-KR", {
        month: "long", day: "numeric", weekday: "short",
      });
      const time = s.is_all_day ? "종일" : new Date(s.start_time).toLocaleTimeString("ko-KR", {
        hour: "2-digit", minute: "2-digit",
      });
      return `• <b>${s.artists?.name || "미상"}</b> | ${s.title}\n  📅 ${date} ${time}${s.location ? `\n  📍 ${s.location}` : ""}`;
    }).join("\n\n");

    for (const chatId of chatIds) {
      await sendMessage(botToken, chatId, `🔔 <b>D-${days} 일정 알림</b>\n\n${lines}`);
    }
  }
}

// 2. 정산 완료 알림 (alert_settlement_enabled 확인)
async function notifySettlementConfirmed(supabase: any, botToken: string, settlementId: string) {
  const { data: s } = await supabase
    .from("revenue_settlements")
    .select("*, artists(name), tenants(name)")
    .eq("id", settlementId)
    .single();

  if (!s) throw new Error("정산 정보 없음");

  // 정산 완료 알림이 켜진 재무 방에만 발송
  const { data: rooms } = await supabase
    .from("telegram_rooms")
    .select("chat_id")
    .eq("tenant_id", s.tenant_id)
    .eq("is_active", true)
    .eq("room_type", "finance")
    .eq("alert_settlement_enabled", true);

  if (!rooms?.length) return;

  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";

  for (const room of rooms) {
    await sendMessage(botToken, room.chat_id,
      `✅ <b>정산 완료</b>\n\n` +
      `👤 아티스트: <b>${s.artists?.name || "미상"}</b>\n` +
      `📆 정산 기간: ${s.settlement_period}\n` +
      `💰 총 수익: ${fmt(s.total_revenue)}\n` +
      `🎭 아티스트 지급액: ${fmt(s.net_artist_amount)}\n` +
      `🏢 회사 수익: ${fmt(s.company_amount)}`
    );
  }
}

// 3. 계약 만료 임박 알림 (방별 alert_contract_days 적용)
async function checkContractExpiry(supabase: any, botToken: string) {
  // alert_contract_enabled인 재무 방 조회
  const { data: rooms } = await supabase
    .from("telegram_rooms")
    .select("chat_id, tenant_id, alert_contract_days")
    .eq("is_active", true)
    .eq("room_type", "finance")
    .eq("alert_contract_enabled", true);

  if (!rooms?.length) return;

  // (tenant_id, days) 조합별 그룹핑
  const groups: Record<string, { days: number; chatIds: string[] }> = {};
  for (const room of rooms) {
    const days = room.alert_contract_days ?? 30;
    const key = `${room.tenant_id}::${days}`;
    if (!groups[key]) groups[key] = { days, chatIds: [] };
    groups[key].chatIds.push(room.chat_id);
  }

  const now = new Date();

  for (const [key, { days, chatIds }] of Object.entries(groups)) {
    const tenantId = key.split("::")[0];

    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + days);

    const { data: artists } = await supabase
      .from("artists")
      .select("name, contract_end_date")
      .eq("tenant_id", tenantId)
      .not("contract_end_date", "is", null)
      .lte("contract_end_date", threshold.toISOString().split("T")[0])
      .gte("contract_end_date", now.toISOString().split("T")[0]);

    if (!artists?.length) continue;

    const lines = artists.map((a: any) => {
      const end = new Date(a.contract_end_date);
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `• <b>${a.name}</b> — D-${daysLeft} (${a.contract_end_date})`;
    }).join("\n");

    for (const chatId of chatIds) {
      await sendMessage(botToken, chatId,
        `⚠️ <b>계약 만료 임박</b>\n\n${lines}\n\n계약 갱신 여부를 확인해주세요.`
      );
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, settlement_id } = body;

    const botToken = await getBotToken(supabase);

    if (action === "daily_check") {
      await checkScheduleReminders(supabase, botToken);
      await checkContractExpiry(supabase, botToken);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "settlement_confirmed" && settlement_id) {
      await notifySettlementConfirmed(supabase, botToken, settlement_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "notify_reviewer") {
      const { reviewer_id, review_title, artist_name, notes, review_id } = body;
      if (!reviewer_id) throw new Error("reviewer_id 누락");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, telegram_chat_id")
        .eq("id", reviewer_id)
        .single();

      if (!profile?.telegram_chat_id) {
        return new Response(JSON.stringify({ success: false, reason: "telegram_not_registered" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lines = [
        `📋 <b>계약서 검토 요청</b>`,
        ``,
        `📄 제목: <b>${review_title}</b>`,
        artist_name ? `👤 아티스트: ${artist_name}` : null,
        notes ? `💬 특이사항: ${notes}` : null,
        ``,
        `Arkport 관리자 페이지 > 계약서 검토에서 확인해주세요.`,
      ].filter(Boolean).join("\n");

      await sendMessage(botToken, profile.telegram_chat_id, lines);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("telegram-alerts error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
