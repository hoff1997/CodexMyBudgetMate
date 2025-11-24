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

  // Clear demo-mode cookie on successful login
  const response = NextResponse.json({
    ok: true,
    user: data.user,
    session: data.session
  });
  response.cookies.delete("demo-mode");

  console.log("🟢 [API /auth/sign-in] Returning success response");

  return response;
}
