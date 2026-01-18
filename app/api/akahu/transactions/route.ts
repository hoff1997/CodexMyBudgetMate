import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { akahuRequest } from "@/lib/akahu/client";
import {
  getCachedTransactions,
  setCachedTransactions,
} from "@/lib/cache/akahu-cache";
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
    // Check URL for force refresh parameter and filters
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const accountId = url.searchParams.get("account");
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    // Check if querying recent data (last 7 days) or historical
    const isRecent =
      !start ||
      new Date(start) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Try cache first (unless force refresh requested)
    if (!forceRefresh) {
      const cached = await getCachedTransactions(
        user.id,
        accountId || undefined,
      );

      if (cached && !cached.isStale) {
        console.log(
          `[Akahu] ✅ Cache hit - transactions (age: ${cached.age}s)`,
        );

        return NextResponse.json({
          items: cached.data,
          cached: true,
          cacheAge: cached.age,
          timestamp: cached.timestamp,
        });
      }
    }

    // Cache miss or stale - fetch from Akahu
    console.log(`[Akahu] ❌ Cache miss - fetching transactions from API`);

    const { data: token } = await supabase
      .from("akahu_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!token) {
      return createNotFoundError("Akahu connection");
    }

    // Build query params for Akahu API
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);

    const endpoint = accountId
      ? `/accounts/${accountId}/transactions${params.toString() ? `?${params}` : ""}`
      : `/transactions${params.toString() ? `?${params}` : ""}`;

    const payload = await akahuRequest<{ items: unknown[] }>({
      endpoint,
      accessToken: token.access_token,
    });

    // Cache the response
    await setCachedTransactions(
      user.id,
      payload.items,
      accountId || undefined,
      isRecent,
    );

    return NextResponse.json({
      ...payload,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    return createErrorResponse(error as { message: string }, 500, "Akahu request failed");
  }
}
