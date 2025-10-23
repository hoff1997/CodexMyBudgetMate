import type { SupabaseClient } from "@supabase/supabase-js";

type AuditParams = {
  userId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
};

export async function logAuditEvent(client: SupabaseClient, { userId, action, metadata }: AuditParams) {
  if (!userId || !action) return;

  const { error } = await client.from("audit_logs").insert({
    user_id: userId,
    action,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error("Failed to record audit log", error);
  }
}
