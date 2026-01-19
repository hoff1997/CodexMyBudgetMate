import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { akahuRequest, refreshAkahuToken } from "@/lib/akahu/client";
import {
  getCachedAccounts,
  setCachedAccounts,
} from "@/lib/cache/akahu-cache";
import { type AkahuAccount } from "@/lib/akahu/providers";
import { createErrorResponse, createUnauthorizedError, createNotFoundError } from "@/lib/utils/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
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

    // Note: akahu_tokens table has: user_id, access_token, refresh_token, created_at, updated_at
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("akahu_tokens")
      .select("access_token, refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError) {
      return createErrorResponse(tokenError, 500, "Failed to retrieve Akahu connection");
    }

    if (!tokenRecord) {
      return createNotFoundError("Akahu connection");
    }

    // Use the stored access token directly
    // Akahu access tokens don't expire, so no refresh logic needed
    const accessToken = tokenRecord.access_token;

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
    return createErrorResponse(error as { message: string }, 500, "Akahu request failed");
  }
}
