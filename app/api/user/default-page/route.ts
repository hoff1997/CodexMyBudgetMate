import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  defaultPage: z.string().min(1),
});

/**
 * PATCH /api/user/default-page
 * Update user's default landing page preference
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error },
      { status: 400 }
    );
  }

  const { defaultPage } = parsed.data;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ default_page: defaultPage })
      .eq("id", user.id);

    if (error) {
      console.error("Default page update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, defaultPage });
  } catch (error: any) {
    console.error("Default page update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
