import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  console.log("🟢 [API /auth/sign-in] POST request received");

  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    console.log("🔴 [API /auth/sign-in] Validation failed");
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  console.log("🟢 [API /auth/sign-in] Attempting sign in for:", result.data.email);

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    console.log("🔴 [API /auth/sign-in] Sign in failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  console.log("🟢 [API /auth/sign-in] Sign in successful, user:", data.user?.email);
  console.log("🟢 [API /auth/sign-in] Session exists:", !!data.session);

  // Create response
  const response = NextResponse.json({
    ok: true,
    user: data.user,
    session: data.session
  });

  // Manually set the session cookies on the response
  if (data.session) {
    const cookiePrefix = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'supabase';
    const maxAge = 100 * 365 * 24 * 60 * 60; // ~100 years

    // Set the auth token cookie
    response.cookies.set({
      name: `sb-${cookiePrefix}-auth-token`,
      value: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
        user: data.session.user,
      }),
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Must be accessible to client-side Supabase client
    });

    console.log(`🟢 [API /auth/sign-in] Set cookie: sb-${cookiePrefix}-auth-token`);
  }

  // Clear demo-mode cookie on successful login
  response.cookies.delete("demo-mode");

  console.log("🟢 [API /auth/sign-in] Returning success response");

  return response;
}
