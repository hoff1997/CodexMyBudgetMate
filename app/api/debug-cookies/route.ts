import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug-cookies
 *
 * Debug endpoint to check all cookies and auth state
 */
export async function GET() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 50) + (c.value.length > 50 ? "..." : ""),
    })),
    session: session ? {
      user: user.email,
      expiresAt: session.expires_at,
    } : null,
    error: error?.message,
  });
}
