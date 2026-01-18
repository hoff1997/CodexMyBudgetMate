import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

interface Params {
  params: { id: string };
}

// GET /api/chores/assignments/[id] - Get a single assignment
export async function GET(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Get the assignment with child info to verify ownership
  const { data: assignment, error } = await supabase
    .from("chore_assignments")
    .select(
      `
      *,
      chore_template:chore_templates (*),
      child:child_profiles (
        id,
        name,
        avatar_url,
        parent_user_id
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (error || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Verify parent owns this child
  if (assignment.child?.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(assignment);
}

// PATCH /api/chores/assignments/[id] - Update an assignment
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
    .from("chore_assignments")
    .select(
      `
      id,
      child:child_profiles!inner (
        id,
        parent_user_id
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const childData = existing.child as unknown as { parent_user_id: string };
  if (childData.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();

  const allowedFields = [
    "day_of_week",
    "currency_type",
    "currency_amount",
    "notes",
    "status",
    "marked_done_at",
    "approved_at",
    "approved_by",
    "rejection_reason",
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

  const { data: assignment, error } = await supabase
    .from("chore_assignments")
    .update(updateData)
    .eq("id", params.id)
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        description,
        icon
      ),
      child:child_profiles (
        id,
        name
      )
    `
    )
    .single();

  if (error) {
    console.error("Error updating chore assignment:", error);
    return createErrorResponse(error, 500, "Failed to update chore assignment");
  }

  return NextResponse.json(assignment);
}

// DELETE /api/chores/assignments/[id] - Delete an assignment
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
    .from("chore_assignments")
    .select(
      `
      id,
      child:child_profiles!inner (
        id,
        parent_user_id
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const childData = existing.child as unknown as { parent_user_id: string };
  if (childData.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { error } = await supabase
    .from("chore_assignments")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting chore assignment:", error);
    return createErrorResponse(error, 500, "Failed to delete chore assignment");
  }

  return NextResponse.json({ success: true });
}
