import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  preferred_name: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  default_page: z.string().optional(),
  celebration_reminder_weeks: z.number().min(0).max(4).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(profile || {});
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.full_name !== undefined) {
      updates.full_name = parsed.data.full_name;
    }
    if (parsed.data.preferred_name !== undefined) {
      updates.preferred_name = parsed.data.preferred_name || null;
    }
    if (parsed.data.date_of_birth !== undefined) {
      updates.date_of_birth = parsed.data.date_of_birth || null;
    }
    if (parsed.data.default_page !== undefined) {
      updates.default_page = parsed.data.default_page;
    }
    if (parsed.data.celebration_reminder_weeks !== undefined) {
      updates.celebration_reminder_weeks = parsed.data.celebration_reminder_weeks;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error in profile update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
