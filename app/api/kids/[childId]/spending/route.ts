import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/spending - Get spending history and limits
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
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select(`
      id,
      name,
      daily_spending_limit,
      weekly_spending_limit,
      monthly_spending_limit,
      require_approval_above
    `)
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get spending transactions
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");

  let query = supabase
    .from("child_spending_transactions")
    .select("*")
    .eq("child_profile_id", childId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("approval_status", status);
  }

  const { data: transactions, error: txError } = await query;

  // Calculate spending totals
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date();
  monthStart.setDate(1);

  const { data: dailySpent } = await supabase
    .from("child_spending_transactions")
    .select("amount")
    .eq("child_profile_id", childId)
    .eq("approval_status", "approved")
    .gte("created_at", today);

  const { data: weeklySpent } = await supabase
    .from("child_spending_transactions")
    .select("amount")
    .eq("child_profile_id", childId)
    .eq("approval_status", "approved")
    .gte("created_at", weekStart.toISOString());

  const { data: monthlySpent } = await supabase
    .from("child_spending_transactions")
    .select("amount")
    .eq("child_profile_id", childId)
    .eq("approval_status", "approved")
    .gte("created_at", monthStart.toISOString());

  const dailyTotal = dailySpent?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const weeklyTotal = weeklySpent?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const monthlyTotal = monthlySpent?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  // Count pending approvals
  const { count: pendingCount } = await supabase
    .from("child_spending_transactions")
    .select("*", { count: "exact", head: true })
    .eq("child_profile_id", childId)
    .eq("approval_status", "pending");

  return NextResponse.json({
    child: {
      id: child.id,
      name: child.name,
    },
    limits: {
      daily: child.daily_spending_limit,
      weekly: child.weekly_spending_limit,
      monthly: child.monthly_spending_limit,
      require_approval_above: child.require_approval_above,
    },
    spending: {
      daily: dailyTotal,
      weekly: weeklyTotal,
      monthly: monthlyTotal,
    },
    remaining: {
      daily: child.daily_spending_limit
        ? Math.max(0, Number(child.daily_spending_limit) - dailyTotal)
        : null,
      weekly: child.weekly_spending_limit
        ? Math.max(0, Number(child.weekly_spending_limit) - weeklyTotal)
        : null,
      monthly: child.monthly_spending_limit
        ? Math.max(0, Number(child.monthly_spending_limit) - monthlyTotal)
        : null,
    },
    pending_approvals: pendingCount || 0,
    transactions: transactions || [],
  });
}

// POST /api/kids/[childId]/spending - Record a new spending transaction
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
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select(`
      id,
      name,
      daily_spending_limit,
      weekly_spending_limit,
      monthly_spending_limit,
      require_approval_above
    `)
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { amount, description, category, from_envelope_type, force_approval } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Amount is required and must be positive" }, { status: 400 });
  }

  // Get the source account
  const { data: account } = await supabase
    .from("child_bank_accounts")
    .select("id, current_balance")
    .eq("child_profile_id", childId)
    .eq("envelope_type", from_envelope_type || "spend")
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Spending account not found" }, { status: 400 });
  }

  if (Number(account.current_balance) < amount) {
    return NextResponse.json(
      { error: "Insufficient balance" },
      { status: 400 }
    );
  }

  // Check spending limits
  let requiresApproval = force_approval || false;
  let approvalReason = null;

  // Check single purchase limit
  if (child.require_approval_above && amount > Number(child.require_approval_above)) {
    requiresApproval = true;
    approvalReason = `Amount exceeds single purchase limit of $${child.require_approval_above}`;
  }

  // Check daily limit
  if (!requiresApproval && child.daily_spending_limit) {
    const today = new Date().toISOString().split("T")[0];
    const { data: dailySpent } = await supabase
      .from("child_spending_transactions")
      .select("amount")
      .eq("child_profile_id", childId)
      .eq("approval_status", "approved")
      .gte("created_at", today);

    const dailyTotal = dailySpent?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    if (dailyTotal + amount > Number(child.daily_spending_limit)) {
      requiresApproval = true;
      approvalReason = `Would exceed daily limit of $${child.daily_spending_limit}`;
    }
  }

  // Create the transaction
  const { data: transaction, error: txError } = await supabase
    .from("child_spending_transactions")
    .insert({
      child_profile_id: childId,
      parent_user_id: user.id,
      amount,
      description: description || null,
      category: category || "other",
      from_account_id: account.id,
      from_envelope_type: from_envelope_type || "spend",
      requires_approval: requiresApproval,
      approval_status: requiresApproval ? "pending" : "approved",
    })
    .select()
    .single();

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 400 });
  }

  // If approved immediately, deduct from balance
  if (!requiresApproval) {
    await supabase
      .from("child_bank_accounts")
      .update({
        current_balance: Number(account.current_balance) - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
  }

  return NextResponse.json({
    success: true,
    transaction,
    requires_approval: requiresApproval,
    approval_reason: approvalReason,
  });
}
