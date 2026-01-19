import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { exchangeAkahuCode } from "@/lib/akahu/client";

/**
 * GET /akahu/callback
 *
 * Handles the OAuth callback from Akahu after user authorization.
 * This route matches Akahu's registered redirect URIs:
 * - Production: https://mybudgetmate.co.nz/akahu/callback
 * - Local Dev: http://localhost:3000/akahu/callback
 *
 * NOTE: Due to potential session cookie issues across domains/redirects,
 * this route uses the state parameter to identify the user and uses
 * the service client as a fallback when the session is not available.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Get the base URL for redirects
  const baseUrl = new URL(request.url).origin;

  console.log("[Akahu Callback] Processing callback", {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    baseUrl,
  });

  // Handle OAuth errors
  if (error) {
    console.error("Akahu OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/settings/bank-connections?error=${encodeURIComponent(errorDescription || error)}`,
        baseUrl
      )
    );
  }

  if (!code || !state) {
    console.error("[Akahu Callback] Missing code or state");
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=missing_params", baseUrl)
    );
  }

  // Try to get user from session first
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[Akahu Callback] User from session:", user?.id || "NO USER");

  // Decode state to get userId (needed for both session and fallback paths)
  let stateUserId: string | null = null;
  let stateOrigin: string = "settings";

  try {
    const decodedState = JSON.parse(Buffer.from(state, "base64url").toString());
    stateUserId = decodedState.userId;
    stateOrigin = decodedState.origin || "settings";
    console.log("[Akahu Callback] State decoded - userId:", stateUserId, "origin:", stateOrigin);
  } catch (e) {
    console.error("[Akahu Callback] Failed to decode state:", e);
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=invalid_state", baseUrl)
    );
  }

  // Use service client for database operations (bypasses RLS)
  const serviceClient = createServiceClient();

  // Verify the state exists in the database
  const { data: storedState } = await serviceClient
    .from("akahu_oauth_states")
    .select("state, expires_at, origin, user_id")
    .eq("user_id", stateUserId)
    .maybeSingle();

  if (!storedState || storedState.state !== state) {
    console.error("[Akahu Callback] State mismatch:", {
      expected: storedState?.state?.substring(0, 20),
      received: state.substring(0, 20),
    });
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=invalid_state", baseUrl)
    );
  }

  // Check if state has expired
  if (new Date(storedState.expires_at) < new Date()) {
    console.error("[Akahu Callback] State expired");
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=state_expired", baseUrl)
    );
  }

  // Clean up state
  await serviceClient.from("akahu_oauth_states").delete().eq("user_id", stateUserId);

  try {
    // Exchange code for tokens
    // The redirect_uri in token exchange MUST match exactly what was used in authorization
    // We construct it from the current request URL to ensure consistency
    const callbackUrl = `${baseUrl}/akahu/callback`;
    console.log("[Akahu Callback] Exchanging code for tokens with redirect_uri:", callbackUrl);
    const tokens = await exchangeAkahuCode(code, callbackUrl);
    console.log("[Akahu Callback] Token exchange successful");

    // Store tokens using service client (bypasses RLS issues)
    // Note: akahu_tokens table has: user_id, access_token, refresh_token, created_at, updated_at
    const { error: upsertError } = await serviceClient.from("akahu_tokens").upsert(
      {
        user_id: stateUserId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("[Akahu Callback] Failed to store tokens:", JSON.stringify(upsertError, null, 2));
      console.error("[Akahu Callback] Upsert details:", {
        user_id: stateUserId,
        has_access_token: !!tokens.access_token,
        access_token_length: tokens.access_token?.length,
      });
      return NextResponse.redirect(
        new URL(`/settings/bank-connections?error=token_storage_failed&details=${encodeURIComponent(upsertError.message || upsertError.code || 'unknown')}`, baseUrl)
      );
    }

    console.log("[Akahu Callback] Tokens stored successfully");

    // Award bank_connected achievement (non-blocking)
    try {
      await serviceClient.from("achievements").upsert(
        {
          user_id: stateUserId,
          achievement_key: "bank_connected",
          achieved_at: new Date().toISOString(),
          metadata: { provider: "akahu" },
        },
        { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
      );
    } catch (achievementError) {
      console.warn("[Akahu Callback] Achievement check failed (non-critical):", achievementError);
    }

    // Determine redirect based on origin
    const origin = storedState.origin || stateOrigin || "settings";
    console.log("[Akahu Callback] Success! Redirecting to:", origin);

    // Build the destination URL
    const destinationPath = origin === "onboarding"
      ? "/onboarding?akahu=connected"
      : "/settings/bank-connections?akahu=connected";

    // Check if we have a valid session
    // If not, redirect to login with the destination as a parameter
    // The user will need to log in again, but their bank connection is saved!
    if (!user) {
      console.log("[Akahu Callback] No session, redirecting to login with return URL");
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("redirect", destinationPath);
      return NextResponse.redirect(loginUrl);
    }

    // Session is valid, redirect directly to destination
    console.log("[Akahu Callback] Session valid, redirecting to:", destinationPath);
    return NextResponse.redirect(new URL(destinationPath, baseUrl));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "token_exchange_failed";
    console.error("[Akahu Callback] Token exchange error:", errorMessage);
    console.error("[Akahu Callback] Full error:", err);

    // For debugging: show a more detailed error page instead of redirecting
    // This helps identify what's going wrong
    return NextResponse.redirect(
      new URL(
        `/settings/bank-connections?error=${encodeURIComponent(errorMessage)}`,
        baseUrl
      )
    );
  }
}
