import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/allocations/plans/:id/reconcile
 * Reconciles an allocation plan by marking all associated transactions as reconciled
 * This is the approval step where user confirms the auto-allocation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.id;

    // 1. Get allocation plan and verify ownership
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .select("*")
      .eq("id", planId)
      .eq("user_id", session.user.id)
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

    if (plan.status === "applied") {
      return NextResponse.json(
        { error: "Allocation already applied" },
        { status: 400 }
      );
    }

    if (plan.status === "rejected") {
      return NextResponse.json(
        { error: "Allocation was rejected" },
        { status: 400 }
      );
    }

    // 2. Get all child transactions for this plan (unreconciled only)
    const { data: childTransactions, error: childError } = await supabase
      .from("transactions")
      .select("id, envelope_id, amount")
      .eq("allocation_plan_id", planId)
      .eq("reconciled", false);

    if (childError) {
      console.error("Error fetching child transactions:", childError);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 400 }
      );
    }

    if (!childTransactions || childTransactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions to reconcile" },
        { status: 400 }
      );
    }

    // 3. Mark all child transactions as reconciled
    const childIds = childTransactions.map((t) => t.id);

    const { error: reconcileError } = await supabase
      .from("transactions")
      .update({ reconciled: true })
      .in("id", childIds);

    if (reconcileError) {
      console.error("Error reconciling child transactions:", reconcileError);
      return NextResponse.json(
        { error: "Failed to reconcile transactions" },
        { status: 400 }
      );
    }

    // 4. Mark parent transaction as reconciled
    if (plan.source_transaction_id) {
      const { error: parentError } = await supabase
        .from("transactions")
        .update({ reconciled: true })
        .eq("id", plan.source_transaction_id);

      if (parentError) {
        console.error("Error reconciling parent transaction:", parentError);
        // Continue anyway - child transactions are reconciled
      }
    }

    // 5. Update allocation plan status
    const { error: planUpdateError } = await supabase
      .from("allocation_plans")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (planUpdateError) {
      console.error("Error updating plan status:", planUpdateError);
      // Continue anyway - transactions are reconciled
    }

    // 6. Envelope balances are automatically updated via transaction triggers
    // in your existing system (when transactions are marked reconciled)

    console.log(
      `✅ Reconciled allocation plan ${planId}: ${childIds.length} transactions`
    );

    return NextResponse.json({
      success: true,
      transactionsReconciled: childIds.length + 1, // children + parent
      totalAllocated: plan.amount,
      envelopesAffected: childTransactions.length,
    });
  } catch (error) {
    console.error("Error reconciling allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
