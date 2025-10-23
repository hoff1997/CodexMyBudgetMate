import type { SupabaseClient } from "@supabase/supabase-js";
import { akahuRequest, refreshAkahuToken } from "@/lib/akahu/client";
import { deriveProvidersFromAccounts, type AkahuAccount } from "@/lib/akahu/providers";
import { logAuditEvent } from "@/lib/audit/log";

const REFRESH_THRESHOLD_MS = 60_000; // refresh 1 minute before expiry

export async function runAkahuSync(client: SupabaseClient) {
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: tokens, error: tokenError } = await client
    .from("akahu_tokens")
    .select("user_id, access_token, refresh_token, access_token_expires_at")
    .order("user_id");

  if (tokenError) {
    throw new Error(tokenError.message);
  }

  let refreshed = 0;
  let successes = 0;
  let failures = 0;

  for (const token of tokens ?? []) {
    let accessToken = token.access_token;
    const expiresAt = token.access_token_expires_at ? new Date(token.access_token_expires_at).getTime() : null;
    if (!expiresAt || expiresAt - Date.now() < REFRESH_THRESHOLD_MS) {
      try {
        const refreshedTokens = await refreshAkahuToken(token.refresh_token);
        accessToken = refreshedTokens.access_token;
        const accessExpiresAt = refreshedTokens.expires_in
          ? new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString()
          : null;
        const refreshExpiresIn = refreshedTokens.refresh_expires_in ?? (refreshedTokens as { refresh_token_expires_in?: number }).refresh_token_expires_in;
        const refreshExpiresAt = refreshExpiresIn
          ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
          : null;

        const { error: updateError } = await client
          .from("akahu_tokens")
          .update({
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
            access_token_expires_at: accessExpiresAt,
            refresh_token_expires_at: refreshExpiresAt,
            scopes: refreshedTokens.scope ? refreshedTokens.scope.split(" ") : null,
            updated_at: nowIso,
          })
          .eq("user_id", token.user_id);

        if (updateError) {
          throw updateError;
        }
        refreshed += 1;
      } catch (error) {
        failures += 1;
        console.error("Akahu token refresh failed", error);
        await client
          .from("bank_connections")
          .update({ status: "action_required", updated_at: nowIso })
          .eq("user_id", token.user_id);
        await logAuditEvent(client, {
          userId: token.user_id,
          action: "akahu.sync.refresh_failed",
          metadata: { error: error instanceof Error ? error.message : "refresh_failed" },
        });
        continue;
      }
    }

    try {
      const accounts = await akahuRequest<{ items: AkahuAccount[] }>({
        endpoint: "/accounts",
        accessToken,
      });
      const providers = deriveProvidersFromAccounts(accounts.items ?? []);
      const rows = providers.size
        ? Array.from(providers.entries()).map(([provider, value]) => ({
            user_id: token.user_id,
            provider,
            status: value.status || "connected",
            last_synced_at: nowIso,
            updated_at: nowIso,
          }))
        : [
            {
              user_id: token.user_id,
              provider: "Akahu",
              status: "connected",
              last_synced_at: nowIso,
              updated_at: nowIso,
            },
          ];

      const { error: upsertError } = await client
        .from("bank_connections")
        .upsert(rows, { onConflict: "user_id,provider" })
        .select("id");

      if (upsertError) {
        throw upsertError;
      }

      successes += 1;
      await logAuditEvent(client, {
        userId: token.user_id,
        action: "akahu.sync",
        metadata: { providers: Array.from(providers.keys()) },
      });
    } catch (error) {
      failures += 1;
      console.error("Akahu sync failed", error);
      await client
        .from("bank_connections")
        .update({ status: "issues", updated_at: nowIso })
        .eq("user_id", token.user_id);
      await logAuditEvent(client, {
        userId: token.user_id,
        action: "akahu.sync_failed",
        metadata: { error: error instanceof Error ? error.message : "sync_failed" },
      });
    }
  }

  return {
    tokens: tokens?.length ?? 0,
    refreshed,
    successes,
    failures,
    timestamp: nowIso,
  };
}
