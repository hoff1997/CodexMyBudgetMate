import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const goalTypeSchema = z.enum(["savings", "debt_payoff", "purchase", "emergency_fund", "other"]);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  goalType: goalTypeSchema.optional(),
  targetAmount: z.number().nonnegative().optional(),
  goalTargetDate: z.string().optional().nullable(),
  payCycleAmount: z.number().nonnegative().optional(),
  frequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

/**
 * GET /api/goals/[id]
 * Fetch a single goal with its milestones
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch goal
  const { data: goal, error: goalError } = await supabase
    .from("envelopes")
    .select("id, name, category_id, target_amount, pay_cycle_amount, opening_balance, current_amount, frequency, notes, icon, is_goal, goal_type, goal_target_date, goal_completed_at, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .eq("is_goal", true)
    .maybeSingle();

  if (goalError) {
    return NextResponse.json({ error: goalError.message }, { status: 400 });
  }

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Fetch milestones
  const { data: milestones, error: milestonesError } = await supabase
    .from("envelope_goal_milestones")
    .select("*")
    .eq("envelope_id", id)
    .order("sort_order", { ascending: true });

  if (milestonesError) {
    return NextResponse.json({ error: milestonesError.message }, { status: 400 });
  }

  return NextResponse.json({
    ...goal,
    milestones: milestones || [],
  });
}

/**
 * PATCH /api/goals/[id]
 * Update a goal
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  const payload = parsed.data;

  // Build update object
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.goalType !== undefined) updates.goal_type = payload.goalType;
  if (payload.targetAmount !== undefined) updates.target_amount = payload.targetAmount;
  if (payload.goalTargetDate !== undefined) updates.goal_target_date = payload.goalTargetDate;
  if (payload.payCycleAmount !== undefined) updates.pay_cycle_amount = payload.payCycleAmount;
  if (payload.frequency !== undefined) updates.frequency = payload.frequency;
  if (payload.notes !== undefined) updates.notes = payload.notes?.trim() || null;
  if (payload.icon !== undefined) updates.icon = payload.icon;
  if (payload.categoryId !== undefined) updates.category_id = payload.categoryId;

  // Handle goal completion
  if (payload.isCompleted !== undefined) {
    updates.goal_completed_at = payload.isCompleted ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("envelopes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .eq("is_goal", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal (and its milestones via CASCADE)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("envelopes")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)
    .eq("is_goal", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
