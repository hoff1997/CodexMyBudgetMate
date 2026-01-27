import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserPreferences } from "@/lib/types/user-preferences";

const ALLOWED_FIELDS: (keyof UserPreferences)[] = [
  "currency_display",
  "date_format",
  "number_format",
  "show_cents",
  "dashboard_layout",
  "email_weekly_summary",
  "email_bill_reminders",
  "email_low_balance",
  "email_achievement_unlocked",
  "auto_approve_rules",
  "confirm_transfers",
];

const VALID_VALUES: Record<string, string[]> = {
  currency_display: ["NZD", "AUD", "USD", "GBP", "EUR"],
  date_format: ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"],
  number_format: ["space", "comma"],
  dashboard_layout: ["default", "compact"],
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to get existing preferences
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If no row exists, upsert defaults
  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ preferences: created });
  }

  return NextResponse.json({ preferences: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate: only allow known fields
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(key as keyof UserPreferences)) {
      return NextResponse.json(
        { error: `Unknown preference field: ${key}` },
        { status: 400 }
      );
    }

    // Validate enum values
    if (VALID_VALUES[key] && !VALID_VALUES[key].includes(body[key])) {
      return NextResponse.json(
        { error: `Invalid value for ${key}: ${body[key]}` },
        { status: 400 }
      );
    }

    // Validate boolean fields
    const booleanFields = [
      "show_cents",
      "email_weekly_summary",
      "email_bill_reminders",
      "email_low_balance",
      "email_achievement_unlocked",
      "auto_approve_rules",
      "confirm_transfers",
    ];
    if (booleanFields.includes(key) && typeof body[key] !== "boolean") {
      return NextResponse.json(
        { error: `${key} must be a boolean` },
        { status: 400 }
      );
    }

    updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Upsert: create row if it doesn't exist, update if it does
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: data });
}
