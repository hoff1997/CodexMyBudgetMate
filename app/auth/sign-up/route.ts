import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies);
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
    },
  });

  if (error) {
    // Handle specific error cases
    if (error.message.includes("already registered")) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Check if email confirmation is required
  const needsEmailConfirmation = data.user && !data.session;

  const response = NextResponse.json({
    ok: true,
    user: data.user,
    needsEmailConfirmation,
  });

  // Set cookies on response
  cookiesToSet.forEach(({ name, value, options }) => {
    const cookieOptions = {
      ...options,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) || 'lax',
    };
    response.cookies.set(name, value, cookieOptions);
  });

  return response;
}
