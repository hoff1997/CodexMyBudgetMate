import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getKidSession } from "@/lib/utils/kid-session";

interface RouteContext {
  params: Promise<{ childId: string }>;
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
  };
}

// GET /api/kids/[childId]/goals - List all goals for a child
export async function GET(request: Request, context: RouteContext) {
  const { childId } = await context.params;
  const auth = await getAuthContext(childId);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = auth.supabase;

  // Get all goals for this child
  const { data: goals, error: goalsError } = await supabase
    .from("teen_savings_goals")
    .select(`
      *,
      child_bank_accounts (
        id,
        envelope_type,
        current_balance
      )
    `)
    .eq("child_profile_id", childId)
    .eq("is_active", true)
    .order("sort_order");

  if (goalsError) {
    return NextResponse.json({ error: goalsError.message }, { status: 400 });
  }

  // Calculate totals
  const totalAllocated = goals?.reduce(
    (sum, g) => sum + Number(g.allocation_percentage || 0),
    0
  ) || 0;

  const totalCurrentAmount = goals?.reduce(
    (sum, g) => sum + Number(g.current_amount || 0),
    0
  ) || 0;

  // Get the savings account balance
  const { data: savingsAccount } = await supabase
    .from("child_bank_accounts")
    .select("current_balance")
    .eq("child_profile_id", childId)
    .eq("envelope_type", "save")
    .maybeSingle();

  return NextResponse.json({
    goals: goals || [],
    totalAllocatedPercentage: totalAllocated,
    totalCurrentAmount,
    savingsAccountBalance: Number(savingsAccount?.current_balance || 0),
    unallocatedPercentage: 100 - totalAllocated,
  });
}

// POST /api/kids/[childId]/goals - Create a new goal
export async function POST(request: Request, context: RouteContext) {
  const { childId } = await context.params;
  const auth = await getAuthContext(childId);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = auth.supabase;
  const body = await request.json();
  const {
    name,
    description,
    target_amount,
    allocation_percentage,
    icon,
    color,
    initial_amount,
  } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "Goal name is required" }, { status: 400 });
  }

  if (allocation_percentage === undefined || allocation_percentage < 0 || allocation_percentage > 100) {
    return NextResponse.json(
      { error: "Allocation percentage must be between 0 and 100" },
      { status: 400 }
    );
  }

  // Get the savings account for this child
  const { data: savingsAccount, error: accountError } = await supabase
    .from("child_bank_accounts")
    .select("id")
    .eq("child_profile_id", childId)
    .eq("envelope_type", "save")
    .maybeSingle();

  if (accountError || !savingsAccount) {
    return NextResponse.json(
      { error: "Savings account not found for this child" },
      { status: 400 }
    );
  }

  // Check current total allocation
  const { data: existingGoals } = await supabase
    .from("teen_savings_goals")
    .select("allocation_percentage")
    .eq("child_profile_id", childId)
    .eq("is_active", true);

  const currentTotal = existingGoals?.reduce(
    (sum, g) => sum + Number(g.allocation_percentage || 0),
    0
  ) || 0;

  if (currentTotal + allocation_percentage > 100) {
    return NextResponse.json(
      {
        error: `Total allocation would exceed 100%. Current: ${currentTotal}%, Requested: ${allocation_percentage}%`,
      },
      { status: 400 }
    );
  }

  // Get max sort order
  const { data: maxOrder } = await supabase
    .from("teen_savings_goals")
    .select("sort_order")
    .eq("child_profile_id", childId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxOrder?.sort_order || 0) + 1;

  // Create the goal
  const { data: goal, error: createError } = await supabase
    .from("teen_savings_goals")
    .insert({
      child_profile_id: childId,
      child_bank_account_id: savingsAccount.id,
      name: name.trim(),
      description: description?.trim() || null,
      target_amount: target_amount || null,
      current_amount: initial_amount || 0,
      allocation_percentage,
      icon: icon || "🎯",
      color: color || "sage",
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ goal }, { status: 201 });
}
