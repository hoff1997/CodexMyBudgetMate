import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeAkahuCode } from "@/lib/akahu/client";

/**
 * GET /akahu/callback
 *
 * Handles the OAuth callback from Akahu after user authorization.
 * This route matches Akahu's registered redirect URIs:
 * - Production: https://mybudgetmate.co.nz/akahu/callback
 * - Local Dev: http://localhost:3000/akahu/callback
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Get the base URL for redirects
  const baseUrl = new URL(request.url).origin;

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
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=missing_params", baseUrl)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  // Verify state parameter
  const { data: storedState } = await supabase
    .from("akahu_oauth_states")
    .select("state, expires_at, origin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!storedState || storedState.state !== state) {
    console.error("State mismatch:", { expected: storedState?.state, received: state });
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=invalid_state", baseUrl)
    );
  }

  // Check if state has expired
  if (new Date(storedState.expires_at) < new Date()) {
    return NextResponse.redirect(
      new URL("/settings/bank-connections?error=state_expired", baseUrl)
    );
  }

  // Clean up state
  await supabase.from("akahu_oauth_states").delete().eq("user_id", user.id);

  try {
    // Exchange code for tokens
    const tokens = await exchangeAkahuCode(code);

    // Store tokens
    const { error: upsertError } = await supabase.from("akahu_tokens").upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("Failed to store Akahu tokens:", upsertError);
      return NextResponse.redirect(
        new URL("/settings/bank-connections?error=token_storage_failed", baseUrl)
      );
    }

    // Award bank_connected achievement (non-blocking)
    try {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "bank_connected",
            achieved_at: new Date().toISOString(),
            metadata: { provider: "akahu" },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    } catch (achievementError) {
      console.warn("Achievement check failed (non-critical):", achievementError);
    }

    // Determine where to redirect based on stored origin
    const origin = storedState.origin || "settings";

    if (origin === "onboarding") {
      return NextResponse.redirect(
        new URL("/onboarding?akahu=connected", baseUrl)
      );
    }

    return NextResponse.redirect(
      new URL("/settings/bank-connections?akahu=connected", baseUrl)
    );
  } catch (err) {
    console.error("Akahu code exchange error:", err);
    return NextResponse.redirect(
      new URL(
        `/settings/bank-connections?error=${encodeURIComponent(
          err instanceof Error ? err.message : "token_exchange_failed"
        )}`,
        baseUrl
      )
    );
  }
}
