import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// POST /api/kids/[childId]/goals/allocate-interest - Distribute interest to goals
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
  const { interestAmount, bankAccountId, allocationDate } = body;

  if (!interestAmount || interestAmount <= 0) {
    return NextResponse.json(
      { error: "Interest amount must be greater than 0" },
      { status: 400 }
    );
  }

  // Get the savings account (or use provided one)
  let accountId = bankAccountId;
  if (!accountId) {
    const { data: savingsAccount } = await supabase
      .from("child_bank_accounts")
      .select("id")
      .eq("child_profile_id", childId)
      .eq("envelope_type", "save")
      .maybeSingle();

    if (!savingsAccount) {
      return NextResponse.json(
        { error: "Savings account not found" },
        { status: 400 }
      );
    }
    accountId = savingsAccount.id;
  }

  // Get all active goals with allocation
  const { data: goals, error: goalsError } = await supabase
    .from("teen_savings_goals")
    .select("id, name, allocation_percentage, current_amount")
    .eq("child_profile_id", childId)
    .eq("child_bank_account_id", accountId)
    .eq("is_active", true)
    .gt("allocation_percentage", 0)
    .order("sort_order");

  if (goalsError) {
    return NextResponse.json({ error: goalsError.message }, { status: 400 });
  }

  if (!goals || goals.length === 0) {
    return NextResponse.json(
      { error: "No active goals with allocation found" },
      { status: 400 }
    );
  }

  // Calculate allocations
  const allocations: Array<{
    goalId: string;
    goalName: string;
    percentage: number;
    amount: number;
    previousBalance: number;
    newBalance: number;
  }> = [];

  let totalDistributed = 0;

  for (const goal of goals) {
    const proportion = Number(goal.allocation_percentage) / 100;
    const allocatedAmount = Math.round(interestAmount * proportion * 100) / 100;
    totalDistributed += allocatedAmount;

    allocations.push({
      goalId: goal.id,
      goalName: goal.name,
      percentage: Number(goal.allocation_percentage),
      amount: allocatedAmount,
      previousBalance: Number(goal.current_amount),
      newBalance: Number(goal.current_amount) + allocatedAmount,
    });
  }

  // Handle rounding difference - add to largest allocation
  const roundingDiff = Math.round((interestAmount - totalDistributed) * 100) / 100;
  if (roundingDiff !== 0 && allocations.length > 0) {
    const largestIndex = allocations.reduce(
      (maxIdx, curr, idx, arr) => (curr.amount > arr[maxIdx].amount ? idx : maxIdx),
      0
    );
    allocations[largestIndex].amount += roundingDiff;
    allocations[largestIndex].newBalance += roundingDiff;
  }

  // Apply allocations
  const allocationDate_ = allocationDate || new Date().toISOString().split("T")[0];

  for (const allocation of allocations) {
    // Insert ledger entry
    const { error: ledgerError } = await supabase
      .from("teen_goal_interest_ledger")
      .insert({
        goal_id: allocation.goalId,
        child_profile_id: childId,
        interest_amount: allocation.amount,
        allocation_percentage: allocation.percentage,
        bank_balance_at_time: null, // Could be enhanced to track this
        allocated_date: allocationDate_,
      });

    if (ledgerError) {
      console.error("Error inserting ledger entry:", ledgerError);
    }

    // Update goal balance
    const { error: updateError } = await supabase
      .from("teen_savings_goals")
      .update({
        current_amount: allocation.newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", allocation.goalId);

    if (updateError) {
      console.error("Error updating goal balance:", updateError);
    }
  }

  return NextResponse.json({
    success: true,
    interestAmount,
    allocationDate: allocationDate_,
    allocations,
    totalDistributed: allocations.reduce((sum, a) => sum + a.amount, 0),
  });
}

// GET /api/kids/[childId]/goals/allocate-interest - Get interest history
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
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get interest history grouped by date
  const { data: history, error: historyError } = await supabase
    .from("teen_goal_interest_ledger")
    .select(`
      *,
      goal:goal_id (id, name, icon)
    `)
    .eq("child_profile_id", childId)
    .order("allocated_date", { ascending: false })
    .limit(100);

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 400 });
  }

  // Calculate totals
  const totalInterestEarned = history?.reduce(
    (sum, entry) => sum + Number(entry.interest_amount || 0),
    0
  ) || 0;

  // Group by date
  const groupedByDate = history?.reduce((acc, entry) => {
    const date = entry.allocated_date;
    if (!acc[date]) {
      acc[date] = {
        date,
        totalAmount: 0,
        allocations: [],
      };
    }
    acc[date].totalAmount += Number(entry.interest_amount);
    acc[date].allocations.push(entry);
    return acc;
  }, {} as Record<string, { date: string; totalAmount: number; allocations: typeof history }>);

  return NextResponse.json({
    history: history || [],
    groupedByDate: Object.values(groupedByDate || {}),
    totalInterestEarned,
  });
}
