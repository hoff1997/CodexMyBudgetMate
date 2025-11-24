import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  // signOut() handles cookie deletion automatically via the client's cookie handlers
  await supabase.auth.signOut();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectUrl = siteUrl ? new URL("/", siteUrl) : new URL("/", request.url);
  const response = NextResponse.redirect(redirectUrl);

  // Note: Supabase's signOut() already deletes cookies via the server client's setAll handler
  // The old cookie names (sb-access-token, sb-refresh-token) are from legacy @supabase/auth-helpers
  // @supabase/ssr uses: sb-{project-ref}-auth-token and sb-{project-ref}-auth-token-code-verifier

  return response;
}
