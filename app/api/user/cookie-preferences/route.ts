import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CookiePreferences } from "@/lib/types/cookie-consent";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cookie_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // For non-authenticated users, just acknowledge the request
    // They can still use localStorage for preferences
    return NextResponse.json({ success: true, stored: "local" });
  }

  const body = (await request.json()) as CookiePreferences;

  // Validate the preferences
  if (typeof body.strictly_necessary !== "boolean") {
    return NextResponse.json(
      { error: "Invalid strictly_necessary value" },
      { status: 400 }
    );
  }

  // Upsert the preferences
  const { data, error } = await supabase
    .from("cookie_preferences")
    .upsert(
      {
        user_id: user.id,
        strictly_necessary: true, // Always true
        analytics: body.analytics ?? false,
        marketing: body.marketing ?? false,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: data, stored: "database" });
}
