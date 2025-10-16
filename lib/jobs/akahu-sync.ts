import type { SupabaseClient } from "@supabase/supabase-js";

export async function runAkahuSync(client: SupabaseClient) {
  const now = new Date().toISOString();

  const { data: tokens, error: tokenError } = await client
    .from("akahu_tokens")
    .select("user_id")
    .order("user_id");

  if (tokenError) {
    throw new Error(tokenError.message);
  }

  const { data: updatedConnections, error: updateError } = await client
    .from("bank_connections")
    .update({ last_synced_at: now })
    .eq("status", "connected")
    .select("id");

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    tokens: tokens?.length ?? 0,
    updatedConnections: updatedConnections?.length ?? 0,
    timestamp: now,
  };
}
