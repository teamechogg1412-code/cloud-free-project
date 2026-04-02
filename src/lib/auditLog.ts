import { supabase } from "@/lib/supabase";

interface AuditLogParams {
  tenantId: string;
  userId: string;
  userName?: string;
  action: "create" | "update" | "delete" | "approve" | "login";
  entity: string;
  entityId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
}

export async function writeAuditLog(params: AuditLogParams) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      user_name: params.userName || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId || null,
      before: params.before || null,
      after: params.after || null,
    });
    if (error) console.error("[AuditLog] write failed:", error.message);
  } catch (err) {
    console.error("[AuditLog] unexpected error:", err);
  }
}
