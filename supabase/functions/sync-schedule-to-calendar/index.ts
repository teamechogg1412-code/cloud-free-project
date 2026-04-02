import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTERNAL_SUPABASE_URL = Deno.env.get("EXTERNAL_SUPABASE_URL") || "https://matcnptzugnaisuhowbk.supabase.co";
const EXTERNAL_SUPABASE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, scheduleId, tenantId, userId } = body;

    const authHeader = req.headers.get("Authorization");
    
    // Use service role key for external DB access
    const serviceKey = EXTERNAL_SUPABASE_KEY;
    const supabase = createClient(EXTERNAL_SUPABASE_URL, serviceKey);

    // Also create a user-scoped client for user-specific data
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdGNucHR6dWduYWlzdWhvd2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTU3MDEsImV4cCI6MjA4Njk5MTcwMX0.M4jrLYUrbFgGaKWTda1e1iLAfdMcU8oZSxsTC65DBnA";
    const userClient = createClient(EXTERNAL_SUPABASE_URL, anonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // ── Get Google OAuth credentials from tenant ──
    async function getGoogleCredentials(tid: string) {
      console.log("getGoogleCredentials called with tid:", tid);
      console.log("EXTERNAL_SUPABASE_URL:", EXTERNAL_SUPABASE_URL);
      console.log("EXTERNAL_SUPABASE_KEY length:", serviceKey?.length || 0);
      
      const { data: configs, error: cfgErr } = await supabase
        .from("tenant_api_configs")
        .select("config_key, config_value")
        .eq("tenant_id", tid)
        .in("config_key", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);

      console.log("tenant_api_configs query result:", JSON.stringify(configs), "error:", cfgErr);

      const clientId = configs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_ID")?.config_value;
      const clientSecret = configs?.find((c: any) => c.config_key === "GOOGLE_CLIENT_SECRET")?.config_value;
      return { clientId, clientSecret };
    }

    // ── Get user's Google tokens ──
    async function getUserTokens(uid: string, tid: string) {
      const { data } = await supabase
        .from("user_mail_configs")
        .select("*")
        .eq("user_id", uid)
        .eq("tenant_id", tid)
        .eq("provider", "gmail")
        .eq("is_active", true)
        .maybeSingle();
      return data;
    }

    // ── Refresh access token if expired ──
    async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("토큰 갱신 실패: " + (data.error_description || data.error));
      return data.access_token;
    }

    // ── Get valid access token ──
    async function getValidAccessToken(uid: string, tid: string) {
      const { clientId, clientSecret } = await getGoogleCredentials(tid);
      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth 설정이 없습니다. 관리자 > API 설정에서 등록하세요.");
      }

      const mailConfig = await getUserTokens(uid, tid);
      if (!mailConfig?.google_refresh_token) {
        throw new Error("Google 계정 연동이 필요합니다. 마이페이지에서 Gmail을 연동한 후 다시 시도하세요.");
      }

      // Check if token is still valid
      const expiry = mailConfig.google_token_expiry ? new Date(mailConfig.google_token_expiry) : new Date(0);
      if (expiry > new Date(Date.now() + 60000) && mailConfig.google_access_token) {
        return mailConfig.google_access_token;
      }

      // Refresh
      const newToken = await refreshAccessToken(mailConfig.google_refresh_token, clientId, clientSecret);

      // Update stored token
      const newExpiry = new Date(Date.now() + 3500 * 1000).toISOString();
      await supabase
        .from("user_mail_configs")
        .update({ google_access_token: newToken, google_token_expiry: newExpiry })
        .eq("id", mailConfig.id);

      return newToken;
    }

    // ── Build calendar event body ──
    function buildCalendarEvent(schedule: any) {
      const artistName = schedule.artist?.name || schedule.artist?.stage_name || "";
      const event: any = {
        summary: `[${artistName}] ${schedule.title}`,
        description: schedule.description || "",
        location: schedule.location || "",
      };

      if (schedule.is_all_day) {
        // All-day event: use date (not dateTime)
        event.start = { date: schedule.start_time.slice(0, 10) };
        event.end = { date: schedule.end_time.slice(0, 10) };
      } else {
        event.start = { dateTime: new Date(schedule.start_time).toISOString(), timeZone: "Asia/Seoul" };
        event.end = { dateTime: new Date(schedule.end_time).toISOString(), timeZone: "Asia/Seoul" };
      }

      return event;
    }

    // ═══ ACTION: create or update ═══
    if (action === "upsert") {
      if (!scheduleId || !tenantId || !userId) {
        return jsonResponse({ error: "scheduleId, tenantId, userId 필수" }, 400);
      }

      const accessToken = await getValidAccessToken(userId, tenantId);

      // Fetch schedule with artist info
      const { data: schedule, error: schedErr } = await supabase
        .from("artist_schedules")
        .select("*, artist:artist_id ( id, name, stage_name )")
        .eq("id", scheduleId)
        .single();

      if (schedErr || !schedule) {
        return jsonResponse({ error: "일정을 찾을 수 없습니다." }, 404);
      }

      const calendarEvent = buildCalendarEvent(schedule);
      const existingEventId = schedule.google_calendar_event_id;

      let calEventId: string;

      if (existingEventId) {
        // Update existing event
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(calendarEvent),
          }
        );

        if (!res.ok) {
          const errData = await res.json();
          // If event not found, create new
          if (res.status === 404) {
            const createRes = await fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(calendarEvent),
              }
            );
            const createData = await createRes.json();
            if (!createRes.ok) throw new Error("캘린더 이벤트 생성 실패: " + JSON.stringify(createData));
            calEventId = createData.id;
          } else {
            throw new Error("캘린더 이벤트 수정 실패: " + JSON.stringify(errData));
          }
        } else {
          const updateData = await res.json();
          calEventId = updateData.id;
        }
      } else {
        // Create new event
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(calendarEvent),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error("캘린더 이벤트 생성 실패: " + JSON.stringify(data));
        calEventId = data.id;
      }

      // Store event ID back to schedule
      await supabase
        .from("artist_schedules")
        .update({ google_calendar_event_id: calEventId })
        .eq("id", scheduleId);

      return jsonResponse({ success: true, calendarEventId: calEventId });
    }

    // ═══ ACTION: delete ═══
    if (action === "delete") {
      if (!tenantId || !userId) {
        return jsonResponse({ error: "tenantId, userId 필수" }, 400);
      }

      const { calendarEventId } = body;
      if (!calendarEventId) {
        return jsonResponse({ success: true, message: "캘린더 이벤트 ID 없음, 건너뜀" });
      }

      const accessToken = await getValidAccessToken(userId, tenantId);

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // 404 or 410 = already deleted, treat as success
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        const errText = await res.text();
        console.error("Calendar delete error:", errText);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Invalid action. Use 'upsert' or 'delete'." }, 400);
  } catch (e: any) {
    console.error("sync-schedule-to-calendar error:", e);
    return jsonResponse({ error: e.message || "Internal server error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
