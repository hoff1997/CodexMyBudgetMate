import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// POST /api/kids/[childId]/goals/transfer - Transfer between goals
export async function POST(request: Request, context: RouteContext) {
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
  const { fromGoalId, toGoalId, amount, notes } = body;

  if (!fromGoalId || !toGoalId) {
    return NextResponse.json(
      { error: "Both source and destination goals are required" },
      { status: 400 }
    );
  }

  if (fromGoalId === toGoalId) {
    return NextResponse.json(
      { error: "Cannot transfer to the same goal" },
      { status: 400 }
    );
  }

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "Transfer amount must be greater than 0" },
      { status: 400 }
    );
  }

  // Verify both goals exist and belong to this child
  const { data: fromGoal } = await supabase
    .from("teen_savings_goals")
    .select("id, name, current_amount")
    .eq("id", fromGoalId)
    .eq("child_profile_id", childId)
    .eq("is_active", true)
    .maybeSingle();

  const { data: toGoal } = await supabase
    .from("teen_savings_goals")
    .select("id, name")
    .eq("id", toGoalId)
    .eq("child_profile_id", childId)
    .eq("is_active", true)
    .maybeSingle();

  if (!fromGoal) {
    return NextResponse.json({ error: "Source goal not found" }, { status: 404 });
  }

  if (!toGoal) {
    return NextResponse.json({ error: "Destination goal not found" }, { status: 404 });
  }

  // Check sufficient balance
  if (Number(fromGoal.current_amount) < amount) {
    return NextResponse.json(
      {
        error: `Insufficient balance. Available: $${fromGoal.current_amount}, Requested: $${amount}`,
      },
      { status: 400 }
    );
  }

  // Create the transfer (trigger will update balances)
  const { data: transfer, error: transferError } = await supabase
    .from("teen_goal_transfers")
    .insert({
      child_profile_id: childId,
      from_goal_id: fromGoalId,
      to_goal_id: toGoalId,
      amount,
      notes: notes?.trim() || null,
      transferred_by_type: "parent",
      transferred_by_id: user.id,
    })
    .select()
    .single();

  if (transferError) {
    return NextResponse.json({ error: transferError.message }, { status: 400 });
  }

  // Get updated goal balances
  const { data: updatedGoals } = await supabase
    .from("teen_savings_goals")
    .select("id, name, current_amount")
    .in("id", [fromGoalId, toGoalId]);

  return NextResponse.json({
    transfer,
    updatedGoals,
    message: `Transferred $${amount} from "${fromGoal.name}" to "${toGoal.name}"`,
  });
}
