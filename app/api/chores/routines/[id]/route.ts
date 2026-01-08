import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateRoutineRequest } from "@/lib/types/chores";

// GET /api/chores/routines/[id] - Get a single routine with items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: routine, error } = await supabase
    .from("chore_routines")
    .select(
      `
      *,
      items:chore_routine_items (
        id,
        chore_template_id,
        sort_order,
        is_required,
        override_currency_type,
        override_currency_amount,
        chore_template:chore_templates (
          id,
          name,
          icon,
          category,
          default_currency_type,
          default_currency_amount,
          estimated_minutes
        )
      )
    `
    )
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  // Sort items by sort_order
  routine.items = routine.items?.sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );

  return NextResponse.json(routine);
}

// PATCH /api/chores/routines/[id] - Update a routine
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("chore_routines")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  const body: UpdateRoutineRequest = await request.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.time_of_day !== undefined) updateData.time_of_day = body.time_of_day;
  if (body.target_time !== undefined) updateData.target_time = body.target_time;
  if (body.duration_estimate_minutes !== undefined)
    updateData.duration_estimate_minutes = body.duration_estimate_minutes;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

  const { data: routine, error } = await supabase
    .from("chore_routines")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating routine:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(routine);
}

// DELETE /api/chores/routines/[id] - Delete a routine
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("chore_routines")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  // Items are cascade deleted via FK constraint
  const { error } = await supabase
    .from("chore_routines")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting routine:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
