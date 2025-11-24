import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/allocations/plans/:id
 * Fetches detailed allocation plan information including all envelope allocations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.id;

    // Get plan with items and envelope details
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .select(`
        id,
        amount,
        status,
        created_at,
        applied_at,
        regular_total,
        surplus_total,
        envelope_count,
        source_transaction_id
      `)
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError) {
      console.error("Error fetching allocation plan:", planError);
      return NextResponse.json(
        { error: "Failed to fetch allocation plan" },
        { status: 400 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Allocation plan not found" },
        { status: 404 }
      );
    }

    // Get plan items with envelope details
    const { data: items, error: itemsError } = await supabase
      .from("allocation_plan_items")
      .select(`
        id,
        envelope_id,
        amount,
        is_regular,
        priority,
        notes,
        envelopes (
          id,
          name,
          icon
        )
      `)
      .eq("plan_id", planId);

    if (itemsError) {
      console.error("Error fetching plan items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch plan items" },
        { status: 400 }
      );
    }

    // Format allocations for response
    const allocations = (items || []).map((item: any) => ({
      envelopeId: item.envelope_id,
      envelopeName: item.envelopes?.name || "Unknown Envelope",
      envelopeIcon: item.envelopes?.icon || "💰",
      amount: item.amount,
      isRegular: item.is_regular,
      priority: item.priority,
      notes: item.notes,
    }));

    return NextResponse.json({
      id: plan.id,
      amount: plan.amount,
      status: plan.status,
      createdAt: plan.created_at,
      appliedAt: plan.applied_at,
      regularTotal: plan.regular_total,
      surplusTotal: plan.surplus_total,
      envelopeCount: plan.envelope_count,
      sourceTransactionId: plan.source_transaction_id,
      allocations,
    });
  } catch (error) {
    console.error("Error fetching allocation plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/allocations/plans/:id/update
 * Updates allocation plan items and optionally updates recurring income plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.id;
    const body = await request.json();
    const { allocations, saveMode } = body;

    if (!allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { error: "Invalid allocations data" },
        { status: 400 }
      );
    }

    // Validate allocations
    const totalAllocated = allocations.reduce(
      (sum: number, a: any) => sum + (a.amount || 0),
      0
    );

    // Get plan to verify ownership and get transaction amount
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .select("id, amount, status, source_transaction_id, user_id")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Allocation plan not found" },
        { status: 404 }
      );
    }

    if (plan.status === "applied") {
      return NextResponse.json(
        { error: "Cannot update an already applied allocation" },
        { status: 400 }
      );
    }

    // Validate balance (allow 1 cent tolerance)
    if (Math.abs(totalAllocated - plan.amount) >= 0.01) {
      return NextResponse.json(
        {
          error: "Allocations must match transaction amount",
          totalAllocated,
          transactionAmount: plan.amount,
          difference: totalAllocated - plan.amount,
        },
        { status: 400 }
      );
    }

    // Delete existing allocation items
    const { error: deleteError } = await supabase
      .from("allocation_plan_items")
      .delete()
      .eq("plan_id", planId);

    if (deleteError) {
      console.error("Error deleting old allocation items:", deleteError);
      return NextResponse.json(
        { error: "Failed to update allocations" },
        { status: 400 }
      );
    }

    // Insert new allocation items
    const newItems = allocations.map((alloc: any) => ({
      plan_id: planId,
      envelope_id: alloc.envelopeId,
      amount: alloc.amount,
      is_regular: true, // Default to regular for now
      priority: "essential", // Default priority
    }));

    const { error: insertError } = await supabase
      .from("allocation_plan_items")
      .insert(newItems);

    if (insertError) {
      console.error("Error inserting new allocation items:", insertError);
      return NextResponse.json(
        { error: "Failed to update allocations" },
        { status: 400 }
      );
    }

    // Update child transactions with new splits
    const { data: childTransactions, error: childError } = await supabase
      .from("transactions")
      .select("id")
      .eq("allocation_plan_id", planId)
      .eq("reconciled", false);

    if (!childError && childTransactions) {
      for (const child of childTransactions) {
        // Delete old splits
        await supabase
          .from("transaction_splits")
          .delete()
          .eq("transaction_id", child.id);

        // Insert new splits
        const splits = allocations.map((alloc: any) => ({
          transaction_id: child.id,
          envelope_id: alloc.envelopeId,
          amount: alloc.amount,
        }));

        await supabase.from("transaction_splits").insert(splits);
      }
    }

    // If saveMode is "update-plan", update recurring income
    if (saveMode === "update-plan") {
      // Get the source transaction to find the recurring income record
      const { data: sourceTransaction } = await supabase
        .from("transactions")
        .select("description, amount")
        .eq("id", plan.source_transaction_id)
        .maybeSingle();

      if (sourceTransaction) {
        // Find matching recurring income by description or amount
        const { data: recurringIncomes } = await supabase
          .from("recurring_income")
          .select("id, allocation")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (recurringIncomes && recurringIncomes.length > 0) {
          // Update the first matching recurring income
          // (In a more sophisticated system, we'd match by source/description)
          const recurringIncome = recurringIncomes[0];

          const updatedAllocation = allocations.map((alloc: any) => ({
            envelopeId: alloc.envelopeId,
            amount: alloc.amount,
          }));

          await supabase
            .from("recurring_income")
            .update({
              allocation: updatedAllocation,
              updated_at: new Date().toISOString(),
            })
            .eq("id", recurringIncome.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Allocation updated successfully",
      planId,
      totalAllocated,
    });
  } catch (error) {
    console.error("Error updating allocation plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/allocations/plans/:id
 * Rejects/cancels an allocation plan and removes associated child transactions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.id;

    // Get plan to verify ownership
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .select("id, status, source_transaction_id")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Allocation plan not found" },
        { status: 404 }
      );
    }

    if (plan.status === "applied") {
      return NextResponse.json(
        { error: "Cannot reject an already applied allocation" },
        { status: 400 }
      );
    }

    // Delete child transactions (cascade will handle plan items)
    const { error: deleteTransactionsError } = await supabase
      .from("transactions")
      .delete()
      .eq("allocation_plan_id", planId)
      .eq("reconciled", false); // Only delete unreconciled ones

    if (deleteTransactionsError) {
      console.error("Error deleting child transactions:", deleteTransactionsError);
      // Continue anyway to mark plan as rejected
    }

    // Update parent transaction to remove allocation link
    if (plan.source_transaction_id) {
      const { error: updateParentError } = await supabase
        .from("transactions")
        .update({
          allocation_plan_id: null,
          is_auto_allocated: false,
        })
        .eq("id", plan.source_transaction_id);

      if (updateParentError) {
        console.error("Error updating parent transaction:", updateParentError);
      }
    }

    // Mark plan as rejected
    const { error: updatePlanError } = await supabase
      .from("allocation_plans")
      .update({ status: "rejected" })
      .eq("id", planId);

    if (updatePlanError) {
      console.error("Error rejecting plan:", updatePlanError);
    }

    return NextResponse.json({
      success: true,
      message: "Allocation plan rejected",
    });
  } catch (error) {
    console.error("Error rejecting allocation plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
