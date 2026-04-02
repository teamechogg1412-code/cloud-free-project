import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getBotToken(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", "TELEGRAM_BOT_TOKEN")
    .single();
  if (error || !data?.value) throw new Error("TELEGRAM_BOT_TOKEN이 설정되지 않았습니다.");
  return data.value;
}

async function sendMessage(botToken: string, chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const update = await req.json();
    const message = update.message || update.edited_message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = String(message.chat.id);
    const chatType = message.chat.type; // "private" | "group" | "supergroup" | "channel"
    const chatTitle = message.chat.title || message.chat.first_name || "Unknown";
    const text = message.text || "";

    const botToken = await getBotToken(supabase);

    // ── 개인 DM 처리 ──────────────────────────────────────────
    if (chatType === "private") {
      if (text.startsWith("/register")) {
        const email = text.split(" ").slice(1).join("").trim();

        if (!email) {
          await sendMessage(botToken, chatId,
            `👤 <b>개인 알림 등록</b>\n\n` +
            `이메일 주소를 함께 입력해주세요.\n` +
            `예: <code>/register hong@company.com</code>`
          );
          return new Response("ok", { status: 200 });
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("email", email)
          .single();

        if (!profile) {
          await sendMessage(botToken, chatId,
            `❌ <b>${email}</b> 으로 등록된 계정을 찾을 수 없습니다.\n가입한 이메일 주소를 확인해주세요.`
          );
          return new Response("ok", { status: 200 });
        }

        await supabase
          .from("profiles")
          .update({ telegram_chat_id: chatId })
          .eq("id", profile.id);

        await sendMessage(botToken, chatId,
          `✅ <b>${profile.full_name}</b>님, 텔레그램 알림이 등록됐습니다!\n\n` +
          `이제 계약서 검토 요청 등 업무 알림을 이 채팅으로 받을 수 있습니다.`
        );
        return new Response("ok", { status: 200 });
      }

      if (text.startsWith("/help") || text.startsWith("/start")) {
        await sendMessage(botToken, chatId,
          `🤖 <b>Arkport Bot</b>\n\n` +
          `개인 알림을 받으려면 아래 명령어를 사용하세요:\n\n` +
          `/register [이메일] — 내 계정에 텔레그램 연동\n` +
          `예: <code>/register hong@company.com</code>`
        );
        return new Response("ok", { status: 200 });
      }

      return new Response("ok", { status: 200 });
    }

    // ── 그룹/채널 처리 ────────────────────────────────────────
    if (text.startsWith("/register")) {
      const { data: existing } = await supabase
        .from("telegram_rooms")
        .select("id, tenant_id, tenants(name)")
        .eq("chat_id", chatId)
        .single();

      if (existing?.tenant_id) {
        await sendMessage(botToken, chatId,
          `✅ 이 방은 이미 <b>${(existing as any).tenants?.name}</b>로 등록되어 있습니다.`
        );
      } else {
        await supabase.from("telegram_rooms").upsert({
          chat_id: chatId,
          chat_title: chatTitle,
          tenant_id: null,
          is_active: true,
        }, { onConflict: "chat_id" });

        await sendMessage(botToken, chatId,
          `🔗 <b>Arkport 연동 대기 중</b>\n\n` +
          `채널 ID: <code>${chatId}</code>\n` +
          `채널명: ${chatTitle}\n\n` +
          `관리자 페이지에서 이 채널 ID로 고객사를 연결해주세요.`
        );
      }
      return new Response("ok", { status: 200 });
    }

    if (text.startsWith("/help")) {
      await sendMessage(botToken, chatId,
        `🤖 <b>Arkport Bot 명령어</b>\n\n` +
        `/register - 이 방을 Arkport에 등록\n` +
        `/status - 연동 상태 확인\n` +
        `/help - 도움말`
      );
      return new Response("ok", { status: 200 });
    }

    if (text.startsWith("/status")) {
      const { data: room } = await supabase
        .from("telegram_rooms")
        .select("id, tenant_id, room_type, tenants(name)")
        .eq("chat_id", chatId)
        .single();

      if (!room || !room.tenant_id) {
        await sendMessage(botToken, chatId,
          `❌ 아직 연동되지 않은 방입니다.\n/register 를 입력해 등록해주세요.`
        );
      } else {
        await sendMessage(botToken, chatId,
          `✅ <b>연동 상태</b>\n\n` +
          `고객사: <b>${(room as any).tenants?.name}</b>\n` +
          `방 유형: ${room.room_type}\n` +
          `채널 ID: <code>${chatId}</code>`
        );
      }
      return new Response("ok", { status: 200 });
    }

    return new Response("ok", { status: 200 });

  } catch (err: any) {
    console.error("telegram-webhook error:", err);
    return new Response("ok", { status: 200 });
  }
});
