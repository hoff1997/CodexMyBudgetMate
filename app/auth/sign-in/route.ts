import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  console.log("🟢 [API /auth/sign-in] POST request received");

  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    console.log("🔴 [API /auth/sign-in] Validation failed");
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  console.log("🟢 [API /auth/sign-in] Attempting sign in for:", result.data.email);

  // Create response object first
  const response = NextResponse.json({ ok: true });

  // Get the cookies store
  const cookieStore = await cookies();

  // Create Supabase client with cookie handlers that set on BOTH cookieStore and response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          console.log("🟢 [API /auth/sign-in] Supabase wants to set cookies:", cookiesToSet.map(c => c.name).join(", "));

          // Set cookies on BOTH the cookie store AND the response object
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set on cookie store for server-side reads
            cookieStore.set(name, value, options);

            // Set on response object to send to browser
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
            });

            console.log(`🟢 [API /auth/sign-in] Set cookie: ${name}, maxAge: ${options?.maxAge}, path: ${options?.path}`);
          });
        },
      },
    }
  );

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

  // Update response body with user data
  const finalResponse = NextResponse.json({
    ok: true,
    user: data.user,
  });

  // Copy all cookies from the first response to the final response
  response.cookies.getAll().forEach(cookie => {
    finalResponse.cookies.set(cookie);
  });

  // Clear demo-mode cookie on successful login
  finalResponse.cookies.delete("demo-mode");

  console.log(`🟢 [API /auth/sign-in] Returning success response with ${response.cookies.getAll().length} cookies`);

  return finalResponse;
}
