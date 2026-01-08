import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/settings - Get child settings
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get feature access settings
  const { data: featureAccess } = await supabase
    .from("child_feature_access")
    .select("*")
    .eq("child_profile_id", childId)
    .maybeSingle();

  return NextResponse.json({
    childId,
    childName: child.name,
    featureAccess: featureAccess || {
      can_view_chores: true,
      can_complete_chores: true,
      can_request_screen_time: true,
      can_use_shop: true,
      can_view_money: true,
      can_request_transfers: false,
    },
  });
}

// PATCH /api/kids/[childId]/settings - Update child settings
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();

  // Allowed feature access fields
  const allowedFields = [
    "can_view_chores",
    "can_complete_chores",
    "can_request_screen_time",
    "can_use_shop",
    "can_view_money",
    "can_request_transfers",
  ];

  // Filter to only allowed fields
  const updateData: Record<string, boolean> = {};
  for (const field of allowedFields) {
    if (typeof body[field] === "boolean") {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Check if feature access record exists
  const { data: existingAccess } = await supabase
    .from("child_feature_access")
    .select("id")
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (existingAccess) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("child_feature_access")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("child_profile_id", childId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  } else {
    // Create new record with defaults
    const { error: insertError } = await supabase
      .from("child_feature_access")
      .insert({
        child_profile_id: childId,
        can_view_chores: true,
        can_complete_chores: true,
        can_request_screen_time: true,
        can_use_shop: true,
        can_view_money: true,
        can_request_transfers: false,
        ...updateData,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true, updated: updateData });
}
