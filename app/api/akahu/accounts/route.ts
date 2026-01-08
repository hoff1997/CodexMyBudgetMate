import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { akahuRequest, refreshAkahuToken } from "@/lib/akahu/client";
import {
  getCachedAccounts,
  setCachedAccounts,
} from "@/lib/cache/akahu-cache";
import { type AkahuAccount } from "@/lib/akahu/providers";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    // Check URL for force refresh parameter
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Try cache first (unless force refresh requested)
    if (!forceRefresh) {
      const cached = await getCachedAccounts(user.id);

      if (cached && !cached.isStale) {
        console.log(`[Akahu] ✅ Cache hit - accounts (age: ${cached.age}s)`);

        return NextResponse.json({
          items: cached.data,
          cached: true,
          cacheAge: cached.age,
          timestamp: cached.timestamp,
        });
      }
    }

    // Cache miss or stale - fetch from Akahu
    console.log(`[Akahu] ❌ Cache miss - fetching accounts from API`);

    const { data: tokenRecord, error: tokenError } = await supabase
      .from("akahu_tokens")
      .select(
        "access_token, refresh_token, access_token_expires_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "No Akahu connection" },
        { status: 404 },
      );
    }

    let accessToken = tokenRecord.access_token;
    const now = Date.now();
    const needsRefresh =
      !tokenRecord.access_token_expires_at ||
      new Date(tokenRecord.access_token_expires_at).getTime() - 60_000 < now;

    // Refresh token if needed
    if (needsRefresh) {
      try {
        const refreshed = await refreshAkahuToken(tokenRecord.refresh_token);
        accessToken = refreshed.access_token;

        const expiresAt = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : null;
        const refreshExpiresIn =
          refreshed.refresh_expires_in ??
          (refreshed as { refresh_token_expires_in?: number })
            .refresh_token_expires_in;
        const refreshExpiresAt = refreshExpiresIn
          ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
          : null;

        await supabase
          .from("akahu_tokens")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? tokenRecord.refresh_token,
            access_token_expires_at: expiresAt,
            refresh_token_expires_at: refreshExpiresAt,
            scopes: refreshed.scope ? refreshed.scope.split(" ") : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Akahu token refresh failed", error);
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 502 },
        );
      }
    }

    const payload = await akahuRequest<{ items: AkahuAccount[] }>({
      endpoint: "/accounts",
      accessToken,
    });

    // Cache the response
    await setCachedAccounts(user.id, payload.items);

    return NextResponse.json({
      ...payload,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Akahu request failed",
      },
      { status: 500 },
    );
  }
}
