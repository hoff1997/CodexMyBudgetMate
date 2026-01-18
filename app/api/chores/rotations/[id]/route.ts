import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

interface Params {
  params: { id: string };
}

// GET /api/chores/rotations/[id] - Get a single rotation
export async function GET(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data: rotation, error } = await supabase
    .from("chore_rotations")
    .select(
      `
      *,
      chore_template:chore_templates (*),
      rotation_members:chore_rotation_members (
        id,
        child_profile_id,
        order_position,
        child:child_profiles (
          id,
          name,
          avatar_url
        )
      )
    `
    )
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !rotation) {
    return createNotFoundError("Rotation");
  }

  return NextResponse.json(rotation);
}

// PATCH /api/chores/rotations/[id] - Update a rotation
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("chore_rotations")
    .select("id")
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return createNotFoundError("Rotation");
  }

  const body = await request.json();

  const allowedFields = [
    "name",
    "frequency",
    "day_of_week",
    "currency_type",
    "currency_amount",
    "is_active",
    "current_child_index",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return createValidationError("No valid fields to update");
  }

  const { data: rotation, error } = await supabase
    .from("chore_rotations")
    .update(updateData)
    .eq("id", params.id)
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon
      ),
      rotation_members:chore_rotation_members (
        id,
        child_profile_id,
        order_position,
        child:child_profiles (
          id,
          name
        )
      )
    `
    )
    .single();

  if (error) {
    console.error("Error updating rotation:", error);
    return createErrorResponse(error, 500, "Failed to update rotation");
  }

  return NextResponse.json(rotation);
}

// DELETE /api/chores/rotations/[id] - Delete a rotation
export async function DELETE(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("chore_rotations")
    .select("id")
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return createNotFoundError("Rotation");
  }

  // Delete rotation members first (cascade should handle this, but be explicit)
  await supabase
    .from("chore_rotation_members")
    .delete()
    .eq("rotation_id", params.id);

  const { error } = await supabase
    .from("chore_rotations")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting rotation:", error);
    return createErrorResponse(error, 500, "Failed to delete rotation");
  }

  return NextResponse.json({ success: true });
}
