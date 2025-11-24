import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const milestoneSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const updateMilestoneSchema = z.object({
  milestoneId: z.string().uuid(),
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  isAchieved: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const deleteMilestoneSchema = z.object({
  milestoneId: z.string().uuid(),
});

/**
 * POST /api/goals/[id]/milestones
 * Create a new milestone for a goal
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: goalId } = await params;

  // Verify goal exists and belongs to user
  const { data: goal, error: goalError } = await supabase
    .from("envelopes")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .eq("is_goal", true)
    .maybeSingle();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = milestoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  const payload = parsed.data;

  // Get current max sort_order
  const { data: existingMilestones } = await supabase
    .from("envelope_goal_milestones")
    .select("sort_order")
    .eq("envelope_id", goalId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxSortOrder = existingMilestones?.[0]?.sort_order ?? -1;

  const { error } = await supabase
    .from("envelope_goal_milestones")
    .insert({
      envelope_id: goalId,
      user_id: user.id,
      milestone_name: payload.name,
      milestone_amount: payload.amount,
      milestone_date: payload.date || null,
      notes: payload.notes?.trim() || null,
      sort_order: maxSortOrder + 1,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/goals/[id]/milestones
 * Update a milestone
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: goalId } = await params;
  const body = await request.json();
  const parsed = updateMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  const payload = parsed.data;

  // Build update object
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) updates.milestone_name = payload.name;
  if (payload.amount !== undefined) updates.milestone_amount = payload.amount;
  if (payload.date !== undefined) updates.milestone_date = payload.date;
  if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;
  if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder;

  // Handle milestone achievement
  if (payload.isAchieved !== undefined) {
    updates.achieved_at = payload.isAchieved ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("envelope_goal_milestones")
    .update(updates)
    .eq("id", payload.milestoneId)
    .eq("envelope_id", goalId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/goals/[id]/milestones
 * Delete a milestone
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: goalId } = await params;
  const body = await request.json();
  const parsed = deleteMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  const { milestoneId } = parsed.data;

  const { error } = await supabase
    .from("envelope_goal_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("envelope_id", goalId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
