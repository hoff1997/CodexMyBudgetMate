import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string; id: string }>;
}

// POST /api/kids/[childId]/wishlist/[id]/convert - Convert wishlist item to savings goal
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get the wishlist item
  const { data: wishlistItem, error: itemError } = await supabase
    .from("teen_wishlists")
    .select("*")
    .eq("id", id)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }

  if (!wishlistItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (wishlistItem.status === "converted") {
    return NextResponse.json(
      { error: "Item has already been converted to a goal" },
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

  // Get max sort order for goals
  const { data: maxOrder } = await supabase
    .from("teen_savings_goals")
    .select("sort_order")
    .eq("child_profile_id", childId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxOrder?.sort_order || 0) + 1;

  // Create the savings goal
  const { data: goal, error: goalError } = await supabase
    .from("teen_savings_goals")
    .insert({
      child_profile_id: childId,
      child_bank_account_id: savingsAccount.id,
      name: wishlistItem.name,
      description: wishlistItem.description,
      target_amount: wishlistItem.estimated_cost || 0,
      current_amount: 0,
      allocation_percentage: 0, // User can set this later
      icon: "🎯",
      color: "sage",
      sort_order: nextSortOrder,
      is_active: true,
    })
    .select()
    .single();

  if (goalError) {
    return NextResponse.json({ error: goalError.message }, { status: 400 });
  }

  // Update wishlist item to mark as converted
  const { data: updatedItem, error: updateError } = await supabase
    .from("teen_wishlists")
    .update({
      status: "converted",
      converted_goal_id: goal.id,
    })
    .eq("id", id)
    .select(`
      *,
      converted_goal:teen_savings_goals (
        id,
        name,
        target_amount,
        current_amount
      )
    `)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    wishlistItem: updatedItem,
    goalId: goal.id,
    message: `"${wishlistItem.name}" is now a savings goal!`,
  });
}
