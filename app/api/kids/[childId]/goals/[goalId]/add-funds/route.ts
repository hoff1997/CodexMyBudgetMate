import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getKidSession } from "@/lib/utils/kid-session";

interface RouteContext {
  params: Promise<{ childId: string; goalId: string }>;
}

// Helper to get authenticated context (either parent or kid session)
async function getAuthContext(childId: string) {
  // First check for kid session
  const kidSession = await getKidSession();
  if (kidSession && kidSession.childId === childId) {
    return {
      type: "kid" as const,
      childId,
      supabase: createServiceClient(),
      userId: null,
    };
  }

  // Fall back to parent auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return null;
  }

  return {
    type: "parent" as const,
    childId,
    supabase,
    userId: user.id,
  };
}

// POST /api/kids/[childId]/goals/[goalId]/add-funds - Add funds from Save account to a goal
export async function POST(request: Request, context: RouteContext) {
  const { childId, goalId } = await context.params;
  const auth = await getAuthContext(childId);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = auth.supabase;

  // Get the goal
  const { data: goal } = await supabase
    .from("teen_savings_goals")
    .select("*")
    .eq("id", goalId)
    .eq("child_profile_id", childId)
    .eq("is_active", true)
    .maybeSingle();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await request.json();
  const { amount, notes } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Get the Save account for this child (correct table name)
  const { data: saveAccount } = await supabase
    .from("child_bank_accounts")
    .select("*")
    .eq("child_profile_id", childId)
    .eq("envelope_type", "save")
    .maybeSingle();

  if (!saveAccount) {
    return NextResponse.json({ error: "Save account not found" }, { status: 404 });
  }

  // Calculate current goal total to check available balance
  const { data: allGoals } = await supabase
    .from("teen_savings_goals")
    .select("current_amount")
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  const totalInGoals = allGoals?.reduce(
    (sum, g) => sum + Number(g.current_amount || 0),
    0
  ) || 0;

  const availableToAdd = saveAccount.current_balance - totalInGoals;

  if (amount > availableToAdd) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: $${availableToAdd.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Add to goal (goals are virtual - money stays in Save account)
  const newBalance = Number(goal.current_amount || 0) + amount;
  const { error: addError } = await supabase
    .from("teen_savings_goals")
    .update({
      current_amount: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId);

  if (addError) {
    return NextResponse.json({ error: "Failed to add funds to goal" }, { status: 500 });
  }

  // Record the transaction (optional - transfers table has NOT NULL on from_goal_id)
  // For add-funds from Save, we just update the goal amount without logging a transfer

  return NextResponse.json({
    success: true,
    newAmount: newBalance,
    goal: {
      ...goal,
      current_amount: newBalance,
    },
  });
}
