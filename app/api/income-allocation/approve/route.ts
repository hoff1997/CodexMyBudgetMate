import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Approves an income allocation and creates the envelope transactions
 * This executes the allocation after user review and any adjustments
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      income_source_id,
      transaction_id,
      transaction_amount,
      allocations,
      surplus_amount,
      surplus_envelope_id,
      save_changes_to_plan,
    } = body;

    // Validate total matches transaction amount
    const totalAllocated = allocations.reduce(
      (sum: number, a: any) => sum + Number(a.amount),
      0
    );
    const total = totalAllocated + Number(surplus_amount || 0);

    if (Math.abs(total - transaction_amount) > 0.01) {
      return NextResponse.json(
        {
          error: `Total allocation ($${total.toFixed(2)}) doesn't match transaction amount ($${transaction_amount.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // If user wants to save changes back to the allocation plan
    if (save_changes_to_plan && income_source_id) {
      // Delete existing allocations for this income source
      await supabase
        .from("envelope_income_allocations")
        .delete()
        .eq("income_source_id", income_source_id)
        .eq("user_id", session.user.id);

      // Insert new allocations
      const newAllocations = allocations.map((alloc: any, index: number) => ({
        user_id: session.user.id,
        income_source_id,
        envelope_id: alloc.envelope_id,
        allocation_amount: alloc.amount,
        priority: index + 1,
      }));

      const { error: allocError } = await supabase
        .from("envelope_income_allocations")
        .insert(newAllocations);

      if (allocError) {
        console.error("Error updating allocation plan:", allocError);
        // Don't fail the whole operation, just log warning
      }
    }

    // Create allocation plan record
    const { data: allocationPlan, error: planError } = await supabase
      .from("allocation_plans")
      .insert({
        user_id: session.user.id,
        income_source_id,
        status: "approved",
        pay_amount: transaction_amount,
        envelope_count: allocations.length + (surplus_amount > 0 ? 1 : 0),
      })
      .select()
      .single();

    if (planError) {
      console.error("Error creating allocation plan:", planError);
      return NextResponse.json(
        { error: "Failed to create allocation plan" },
        { status: 500 }
      );
    }

    // Create allocation plan items
    const planItems = [
      ...allocations.map((alloc: any) => ({
        allocation_plan_id: allocationPlan.id,
        envelope_id: alloc.envelope_id,
        amount: alloc.amount,
        is_regular: true,
      })),
    ];

    if (surplus_amount > 0 && surplus_envelope_id) {
      planItems.push({
        allocation_plan_id: allocationPlan.id,
        envelope_id: surplus_envelope_id,
        amount: surplus_amount,
        is_regular: false,
      });
    }

    const { error: itemsError } = await supabase
      .from("allocation_plan_items")
      .insert(planItems);

    if (itemsError) {
      console.error("Error creating plan items:", itemsError);
      return NextResponse.json(
        { error: "Failed to create allocation items" },
        { status: 500 }
      );
    }

    // Create transaction splits for each allocation
    const splits = [
      ...allocations.map((alloc: any) => ({
        user_id: session.user.id,
        transaction_id,
        envelope_id: alloc.envelope_id,
        amount: alloc.amount,
        notes: `Auto-allocated from income`,
      })),
    ];

    if (surplus_amount > 0 && surplus_envelope_id) {
      splits.push({
        user_id: session.user.id,
        transaction_id,
        envelope_id: surplus_envelope_id,
        amount: surplus_amount,
        notes: "Surplus allocation",
      });
    }

    const { error: splitsError } = await supabase
      .from("transaction_splits")
      .insert(splits);

    if (splitsError) {
      console.error("Error creating transaction splits:", splitsError);
      return NextResponse.json(
        { error: "Failed to create transaction splits" },
        { status: 500 }
      );
    }

    // Update envelope balances
    for (const alloc of allocations) {
      const { error: balanceError } = await supabase.rpc(
        "increment_envelope_balance",
        {
          envelope_id_param: alloc.envelope_id,
          amount_param: alloc.amount,
        }
      );

      if (balanceError) {
        console.error("Error updating envelope balance:", balanceError);
        // Continue anyway - balance will be corrected on next sync
      }
    }

    if (surplus_amount > 0 && surplus_envelope_id) {
      await supabase.rpc("increment_envelope_balance", {
        envelope_id_param: surplus_envelope_id,
        amount_param: surplus_amount,
      });
    }

    // Mark transaction as reconciled (if you have this field)
    await supabase
      .from("transactions")
      .update({ is_reconciled: true })
      .eq("id", transaction_id);

    return NextResponse.json({
      success: true,
      allocation_plan_id: allocationPlan.id,
      splits_created: splits.length,
    });
  } catch (error) {
    console.error("Error approving allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
