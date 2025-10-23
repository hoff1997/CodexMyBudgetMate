import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { akahuRequest, refreshAkahuToken } from "@/lib/akahu/client";
import { logAuditEvent } from "@/lib/audit/log";
import { z } from "zod";
import { deriveProvidersFromAccounts, type AkahuAccount } from "@/lib/akahu/providers";

const schema = z.object({
  action: z.enum(["refresh", "disconnect"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const userId = session.user.id;

  if (payload.data.action === "disconnect") {
    await supabase.from("akahu_tokens").delete().eq("user_id", userId);
    await supabase
      .from("bank_connections")
      .update({ status: "disconnected", last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);
    await logAuditEvent(supabase, {
      userId,
      action: "akahu.disconnect",
    });
    return NextResponse.json({ ok: true, status: "disconnected" });
  }

  const { data: tokenRecord, error: tokenError } = await supabase
    .from("akahu_tokens")
    .select("access_token, refresh_token, access_token_expires_at, refresh_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  if (!tokenRecord) {
    return NextResponse.json({ error: "No Akahu connection" }, { status: 404 });
  }

  let accessToken = tokenRecord.access_token;
  const now = Date.now();
  const needsRefresh =
    !tokenRecord.access_token_expires_at ||
    new Date(tokenRecord.access_token_expires_at).getTime() - 60_000 < now;

  if (needsRefresh) {
    try {
      const refreshed = await refreshAkahuToken(tokenRecord.refresh_token);
      accessToken = refreshed.access_token;
      const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null;
      const refreshExpiresIn = refreshed.refresh_expires_in ?? (refreshed as { refresh_token_expires_in?: number }).refresh_token_expires_in;
      const refreshExpiresAt = refreshExpiresIn
        ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
        : null;

      const { error: updateError } = await supabase
        .from("akahu_tokens")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? tokenRecord.refresh_token,
          access_token_expires_at: expiresAt,
          refresh_token_expires_at: refreshExpiresAt,
          scopes: refreshed.scope ? refreshed.scope.split(" ") : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error("Akahu refresh failed", error);
      await supabase
        .from("bank_connections")
        .update({ status: "action_required", last_synced_at: new Date().toISOString() })
        .eq("user_id", userId);
      await logAuditEvent(supabase, {
        userId,
        action: "akahu.refresh_failed",
        metadata: { error: error instanceof Error ? error.message : "Refresh failed" },
      });
      return NextResponse.json({ error: "Token refresh failed" }, { status: 502 });
    }
  }

  try {
    const accounts = await akahuRequest<{ items: AkahuAccount[] }>({
      endpoint: "/accounts",
      accessToken,
    });

    const providers = deriveProvidersFromAccounts(accounts.items ?? []);
    const rows = Array.from(providers.entries()).map(([provider, value]) => ({
      user_id: userId,
      provider,
      status: value.status || "connected",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error: upsertError } = await supabase
        .from("bank_connections")
        .upsert(rows, { onConflict: "user_id,provider" })
        .select("id");

      if (upsertError) {
        throw upsertError;
      }
    } else {
      await supabase
        .from("bank_connections")
        .upsert(
          [
            {
              user_id: userId,
              provider: "Akahu",
              status: "connected",
              last_synced_at: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id,provider" },
        );
    }

    await logAuditEvent(supabase, {
      userId,
      action: "akahu.refresh",
      metadata: { providers: Array.from(providers.keys()) },
    });

    return NextResponse.json({ ok: true, providers: Array.from(providers.keys()) });
  } catch (error) {
    console.error("Akahu refresh fetch failed", error);
    await supabase
      .from("bank_connections")
      .update({ status: "issues", last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);
    await logAuditEvent(supabase, {
      userId,
      action: "akahu.refresh_failed",
      metadata: { error: error instanceof Error ? error.message : "Fetch failed" },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to refresh connection" },
      { status: 502 },
    );
  }
}
