import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exchangeAkahuCode, akahuRequest } from "@/lib/akahu/client";
import { deriveProvidersFromAccounts, type AkahuAccount } from "@/lib/akahu/providers";
import { logAuditEvent } from "@/lib/audit/log";

type CallbackProps = {
  searchParams?: {
    code?: string;
    error?: string;
    state?: string;
  };
};

export default async function AkahuCallbackPage({ searchParams }: CallbackProps) {
  const error = searchParams?.error;
  if (error) {
    redirect(`/settings?akahu=error&message=${encodeURIComponent(error)}`);
  }

  const code = searchParams?.code;
  if (!code) {
    redirect(`/settings?akahu=error&message=${encodeURIComponent("Missing authorisation code.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  try {
    const tokens = await exchangeAkahuCode(code!);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;
    const refreshExpiresIn = tokens.refresh_expires_in ?? (tokens as { refresh_token_expires_in?: number }).refresh_token_expires_in;
    const refreshExpiresAt = refreshExpiresIn
      ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
      : null;

    const { error: tokenError } = await supabase
      .from("akahu_tokens")
      .upsert(
        {
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          access_token_expires_at: expiresAt,
          refresh_token_expires_at: refreshExpiresAt,
          scopes: tokens.scope ? tokens.scope.split(" ") : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (tokenError) {
      throw new Error(tokenError.message);
    }

    const accounts = await akahuRequest<{ items: AkahuAccount[] }>({
      endpoint: "/accounts",
      accessToken: tokens.access_token,
    });

    const providers = deriveProvidersFromAccounts(accounts.items ?? []);
    const nowIso = new Date().toISOString();

    const rows =
      providers.size > 0
        ? Array.from(providers.entries()).map(([provider, value]) => ({
            user_id: userId,
            provider,
            status: value.status || "connected",
            last_synced_at: nowIso,
            updated_at: nowIso,
          }))
        : [
            {
              user_id: userId,
              provider: "Akahu",
              status: "connected",
              last_synced_at: nowIso,
              updated_at: nowIso,
            },
          ];

    const { error: connectionError } = await supabase
      .from("bank_connections")
      .upsert(rows, { onConflict: "user_id,provider" })
      .select("id");

    if (connectionError) {
      throw new Error(connectionError.message);
    }

    await logAuditEvent(supabase, {
      userId,
      action: "akahu.connect",
      metadata: { providers: Array.from(providers.keys()) },
    });

    redirect("/settings?akahu=connected");
  } catch (err) {
    console.error("Akahu callback failed", err);
    const message = err instanceof Error ? err.message : "Akahu linking failed";
    redirect(`/settings?akahu=error&message=${encodeURIComponent(message)}`);
  }
}
