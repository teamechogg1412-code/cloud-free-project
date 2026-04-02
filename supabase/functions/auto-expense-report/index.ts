import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(extUrl, extKey);

    const today = new Date();
    const dayOfMonth = today.getDate();

    // Find active templates for today's day
    const { data: templates, error: tErr } = await sb
      .from("expense_report_templates")
      .select("*, expense_report_template_items(*)")
      .eq("day_of_month", dayOfMonth)
      .eq("is_active", true);

    if (tErr) throw tErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: "No templates for today", day: dayOfMonth }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const tmpl of templates) {
      // Check if already generated this month
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: existing } = await sb
        .from("expense_reports")
        .select("id")
        .eq("tenant_id", tmpl.tenant_id)
        .eq("user_id", tmpl.assignee_user_id)
        .eq("title", tmpl.title)
        .eq("status", "draft")
        .gte("created_at", monthStart)
        .limit(1);

      if (existing && existing.length > 0) {
        results.push({ template_id: tmpl.id, skipped: true, reason: "already exists this month" });
        continue;
      }

      const totalAmount = (tmpl.expense_report_template_items || []).reduce(
        (sum: number, it: any) => sum + Number(it.amount), 0
      );

      // Create expense report as draft
      const { data: report, error: rErr } = await sb
        .from("expense_reports")
        .insert({
          tenant_id: tmpl.tenant_id,
          user_id: tmpl.assignee_user_id,
          title: tmpl.title,
          category: tmpl.category,
          description: tmpl.description || `자동 생성 (매월 ${tmpl.day_of_month}일)`,
          status: "draft",
          total_amount: totalAmount,
          requested_date: today.toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (rErr) {
        results.push({ template_id: tmpl.id, error: rErr.message });
        continue;
      }

      // Create items
      const items = (tmpl.expense_report_template_items || []).map((it: any, idx: number) => ({
        expense_report_id: report.id,
        description: it.description,
        amount: it.amount,
        payment_method: it.payment_method || "법인카드",
        receipt_note: it.receipt_note || "",
        item_date: today.toISOString().split("T")[0],
        sort_order: it.sort_order ?? idx,
      }));

      if (items.length > 0) {
        await sb.from("expense_report_items").insert(items);
      }

      results.push({ template_id: tmpl.id, report_id: report.id, created: true });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
