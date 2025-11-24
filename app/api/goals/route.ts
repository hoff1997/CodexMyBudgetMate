import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/goals
 * Fetch all goals (envelopes where is_goal = true) with their milestones
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Fetch goals with their associated milestones
  const { data: goals, error: goalsError } = await supabase
    .from("envelopes")
    .select("id, name, category_id, target_amount, pay_cycle_amount, opening_balance, current_amount, frequency, notes, icon, is_goal, goal_type, goal_target_date, goal_completed_at, interest_rate, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("is_goal", true)
    .order("created_at", { ascending: false });

  if (goalsError) {
    return NextResponse.json({ error: goalsError.message }, { status: 400 });
  }

  if (!goals || goals.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch milestones for all goals
  const goalIds = goals.map((g) => g.id);
  const { data: milestones, error: milestonesError } = await supabase
    .from("envelope_goal_milestones")
    .select("*")
    .in("envelope_id", goalIds)
    .order("sort_order", { ascending: true });

  if (milestonesError) {
    return NextResponse.json({ error: milestonesError.message }, { status: 400 });
  }

  // Combine goals with their milestones
  const goalsWithMilestones = goals.map((goal) => ({
    ...goal,
    milestones: milestones?.filter((m) => m.envelope_id === goal.id) || [],
  }));

  return NextResponse.json(goalsWithMilestones);
}
