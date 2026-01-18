import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createUnauthorizedError } from "@/lib/utils/api-error";

/**
 * GET /api/akahu/oauth/start
 *
 * Initiates the Akahu OAuth flow by returning the authorization URL.
 * The user will be redirected to Akahu to authorize the connection.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Check if request is coming from onboarding
  const referer = request.headers.get("referer") || "";
  const isFromOnboarding = referer.includes("/onboarding");

  // Check for required environment variables
  // Use AKAHU_APP_TOKEN as client_id (they're the same value)
  // Fall back to AKAHU_CLIENT_ID for backwards compatibility
  const clientId = process.env.AKAHU_APP_TOKEN || process.env.AKAHU_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Akahu is not configured. Please contact support." },
      { status: 500 }
    );
  }

  console.log("[Akahu OAuth Start] Using client_id:", clientId.substring(0, 20) + "...");

  // Construct redirect URI dynamically from the request origin
  // This ensures consistency between authorization and token exchange
  // The redirect URI MUST be registered with Akahu
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/akahu/callback`;
  console.log("[Akahu OAuth Start] Using redirect_uri:", redirectUri);

  // Build the Akahu authorization URL
  // See: https://developers.akahu.nz/docs/authorizing-your-app
  const scopes = [
    "ENDURING_CONSENT",
    "ACCOUNTS",
    "TRANSACTIONS",
  ].join(" ");

  // Generate a state parameter for CSRF protection
  // Include origin to know where to redirect after OAuth
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7),
      origin: isFromOnboarding ? "onboarding" : "settings",
    })
  ).toString("base64url");

  // Store state in database for verification
  // Use service client to bypass RLS - ensures state is always stored
  const serviceClient = createServiceClient();
  const { error: stateError } = await serviceClient.from("akahu_oauth_states").upsert(
    {
      user_id: user.id,
      state,
      origin: isFromOnboarding ? "onboarding" : "settings",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    },
    { onConflict: "user_id" }
  );

  if (stateError) {
    console.error("[Akahu OAuth Start] Failed to store state:", stateError);
    return NextResponse.json(
      { error: "Failed to initialize OAuth flow. Please try again." },
      { status: 500 }
    );
  }

  console.log("[Akahu OAuth Start] State stored for user:", user.id);

  const authUrl = new URL("https://oauth.akahu.io/");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  return NextResponse.json({
    authUrl: authUrl.toString(),
    state,
  });
}
