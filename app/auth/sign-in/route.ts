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

  // Get the cookies store
  const cookieStore = await cookies();

  // Store cookies that need to be set
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

  // Create Supabase client with cookie handlers that capture cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          console.log("🟢 [API /auth/sign-in] Supabase wants to set cookies:", cookies.map(c => c.name).join(", "));
          cookiesToSet.push(...cookies);
          // Also set them directly on the cookie store
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
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

  // Create response with user data
  const response = NextResponse.json({
    ok: true,
    user: data.user,
  });

  // Set all captured cookies on the response
  cookiesToSet.forEach(({ name, value, options }) => {
    // Ensure secure flag is set for production (Vercel uses HTTPS)
    const cookieOptions = {
      ...options,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) || 'lax',
    };

    console.log(`🟢 [API /auth/sign-in] Setting cookie on response: ${name}, maxAge: ${cookieOptions?.maxAge}, path: ${cookieOptions?.path}, sameSite: ${cookieOptions?.sameSite}, secure: ${cookieOptions?.secure}, domain: ${cookieOptions?.domain}`);

    response.cookies.set(name, value, cookieOptions);
  });

  // Clear demo-mode cookie on successful login
  response.cookies.delete("demo-mode");

  console.log(`🟢 [API /auth/sign-in] Returning success response with ${cookiesToSet.length} cookies`);

  return response;
}
