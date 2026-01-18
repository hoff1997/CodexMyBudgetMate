import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/notifications/preferences - Get user's notification preferences
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Get preferences or create defaults
  let { data: preferences, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return createErrorResponse(error, 400, "Failed to fetch notification preferences");
  }

  // If no preferences exist, create defaults
  if (!preferences) {
    const { data: newPrefs, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: user.id,
        enable_in_app: true,
        enable_push: false,
        enable_email: false,
        disabled_types: [],
        quiet_hours_enabled: false,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        digest_frequency: "instant",
      })
      .select()
      .single();

    if (insertError) {
      // Return defaults if table doesn't exist yet
      preferences = getDefaultPreferences(user.id);
    } else {
      preferences = newPrefs;
    }
  }

  return NextResponse.json({ preferences });
}

// PATCH /api/notifications/preferences - Update notification preferences
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  // Allowed fields
  const allowedFields = [
    "enable_in_app",
    "enable_push",
    "enable_email",
    "disabled_types",
    "quiet_hours_enabled",
    "quiet_hours_start",
    "quiet_hours_end",
    "digest_frequency",
  ];

  // Filter to only allowed fields
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return createValidationError("No valid fields to update");
  }

  // Validate digest_frequency
  if (updateData.digest_frequency) {
    const validFrequencies = ["instant", "hourly", "daily", "weekly"];
    if (!validFrequencies.includes(updateData.digest_frequency as string)) {
      return createValidationError("Invalid digest frequency");
    }
  }

  updateData.updated_at = new Date().toISOString();

  // Check if preferences exist
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update
    const { data: updated, error: updateError } = await supabase
      .from("notification_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return createErrorResponse(updateError, 400, "Failed to update notification preferences");
    }

    return NextResponse.json({ preferences: updated });
  } else {
    // Create new
    const { data: created, error: createError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: user.id,
        enable_in_app: true,
        enable_push: false,
        enable_email: false,
        disabled_types: [],
        quiet_hours_enabled: false,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        digest_frequency: "instant",
        ...updateData,
      })
      .select()
      .single();

    if (createError) {
      return createErrorResponse(createError, 400, "Failed to create notification preferences");
    }

    return NextResponse.json({ preferences: created });
  }
}

function getDefaultPreferences(userId: string) {
  return {
    id: null,
    user_id: userId,
    enable_in_app: true,
    enable_push: false,
    enable_email: false,
    disabled_types: [],
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    digest_frequency: "instant",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
