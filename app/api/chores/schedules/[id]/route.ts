import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createNotFoundError } from "@/lib/utils/api-error";
import type { UpdateScheduleRequest } from "@/lib/types/chores";

// GET /api/chores/schedules/[id] - Get a single schedule
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
    return createUnauthorizedError();
  }

  const { data: schedule, error } = await supabase
    .from("chore_schedules")
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon,
        category,
        currency_type,
        currency_amount
      ),
      routine:chore_routines (
        id,
        name,
        icon,
        time_of_day,
        items:chore_routine_items (
          id,
          chore_template:chore_templates (
            id,
            name,
            icon
          )
        )
      ),
      child:child_profiles (
        id,
        name,
        avatar_url
      ),
      rotation:chore_rotations (
        id,
        name,
        current_child_index,
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
      )
    `
    )
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (error || !schedule) {
    return createNotFoundError("Schedule");
  }

  return NextResponse.json(schedule);
}

// PATCH /api/chores/schedules/[id] - Update a schedule
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
    return createUnauthorizedError();
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("chore_schedules")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return createNotFoundError("Schedule");
  }

  const body: UpdateScheduleRequest = await request.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.child_profile_id !== undefined)
    updateData.child_profile_id = body.child_profile_id;
  if (body.rotation_id !== undefined) updateData.rotation_id = body.rotation_id;
  if (body.frequency !== undefined) updateData.frequency = body.frequency;
  if (body.days_of_week !== undefined)
    updateData.days_of_week = body.days_of_week;
  if (body.day_of_month !== undefined)
    updateData.day_of_month = body.day_of_month;
  if (body.time_of_day !== undefined) updateData.time_of_day = body.time_of_day;
  if (body.target_time !== undefined) updateData.target_time = body.target_time;
  if (body.end_date !== undefined) updateData.end_date = body.end_date;
  if (body.occurrences_limit !== undefined)
    updateData.occurrences_limit = body.occurrences_limit;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.currency_type !== undefined)
    updateData.currency_type = body.currency_type;
  if (body.currency_amount !== undefined)
    updateData.currency_amount = body.currency_amount;

  const { data: schedule, error } = await supabase
    .from("chore_schedules")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating schedule:", error);
    return createErrorResponse(error, 500, "Failed to update schedule");
  }

  return NextResponse.json(schedule);
}

// DELETE /api/chores/schedules/[id] - Delete a schedule
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
    return createUnauthorizedError();
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("chore_schedules")
    .select("id")
    .eq("id", id)
    .eq("parent_user_id", user.id)
    .single();

  if (!existing) {
    return createNotFoundError("Schedule");
  }

  const { error } = await supabase
    .from("chore_schedules")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting schedule:", error);
    return createErrorResponse(error, 500, "Failed to delete schedule");
  }

  return NextResponse.json({ success: true });
}
