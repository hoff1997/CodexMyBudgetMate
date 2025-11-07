import { createClient } from "@/lib/supabase/server";
import { calculatePaydayAllocation } from "@/lib/planner/payday";
import type { Envelope, PayCycle } from "@/lib/planner/types";

type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  description: string;
  reconciled: boolean;
  allocation_plan_id?: string | null;
};

/**
 * Determines if a transaction should be auto-allocated
 * Income transactions from bank feed are identified by positive amounts (credits)
 * Expenses are negative amounts (debits)
 */
export function shouldAutoAllocate(transaction: Transaction): boolean {
  return (
    transaction.amount > 0 && // Positive amount = credit = income
    transaction.amount >= 1000 && // Minimum threshold for auto-allocation
    !transaction.reconciled && // Not already reconciled
    !transaction.allocation_plan_id // Not already allocated
  );
}

/**
 * Creates an automatic allocation plan for an income transaction
 * This function:
 * 1. Calculates allocation using payday logic
 * 2. Creates allocation plan record
 * 3. Creates plan items for detail storage
 * 4. Creates child transactions (unreconciled)
 * 5. Links parent transaction to plan
 */
export async function createAutoAllocation(
  transaction: Transaction,
  userId: string
): Promise<{ planId: string; success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Get user's profile and envelopes
    const [profileResult, envelopesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("pay_cycle")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("envelopes")
        .select(
          "id, name, icon, envelope_type, priority, target_amount, annual_amount, pay_cycle_amount, current_amount, frequency, next_payment_due, category_id"
        )
        .eq("user_id", userId)
        .eq("envelope_type", "expense"),
    ]);

    if (profileResult.error) {
      console.error("Error fetching profile:", profileResult.error);
      return { planId: "", success: false, error: "Failed to fetch user profile" };
    }

    if (envelopesResult.error) {
      console.error("Error fetching envelopes:", envelopesResult.error);
      return { planId: "", success: false, error: "Failed to fetch envelopes" };
    }

    const profile = profileResult.data;
    const envelopes = envelopesResult.data || [];

    if (envelopes.length === 0) {
      console.log("No envelopes to allocate to");
      return { planId: "", success: false, error: "No envelopes found" };
    }

    const payCycle: PayCycle = (profile?.pay_cycle as PayCycle) || "fortnightly";

    // 2. Calculate allocation using existing payday logic
    const allocation = calculatePaydayAllocation(
      transaction.amount,
      envelopes as Envelope[],
      payCycle
    );

    // 3. Create allocation plan record
    const { data: plan, error: planError } = await supabase
      .from("allocation_plans")
      .insert({
        user_id: userId,
        source_transaction_id: transaction.id,
        amount: transaction.amount,
        status: "pending",
        regular_total: allocation.totalRegular,
        surplus_total: allocation.surplus,
        envelope_count: allocation.allocations.length,
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error("Error creating allocation plan:", planError);
      return { planId: "", success: false, error: "Failed to create allocation plan" };
    }

    // 4. Create plan items (for detail storage)
    const planItems = allocation.allocations.map((alloc) => ({
      plan_id: plan.id,
      envelope_id: alloc.envelopeId,
      amount: alloc.amount,
      is_regular: alloc.isRegular,
      priority: alloc.priority,
    }));

    const { error: itemsError } = await supabase
      .from("allocation_plan_items")
      .insert(planItems);

    if (itemsError) {
      console.error("Error creating plan items:", itemsError);
      // Continue anyway - items are for detail view only
    }

    // 5. Create child transactions (unreconciled, pending approval)
    const childTransactions = allocation.allocations.map((alloc) => ({
      user_id: userId,
      envelope_id: alloc.envelopeId,
      amount: alloc.amount,
      date: transaction.date,
      description: `Auto-allocation: ${transaction.description}`,
      transaction_type: "allocation",
      reconciled: false, // KEY: Not reconciled yet - awaiting user approval
      parent_transaction_id: transaction.id,
      allocation_plan_id: plan.id,
    }));

    const { error: transactionsError } = await supabase
      .from("transactions")
      .insert(childTransactions);

    if (transactionsError) {
      console.error("Error creating child transactions:", transactionsError);
      return { planId: plan.id, success: false, error: "Failed to create allocation transactions" };
    }

    // 6. Update parent transaction to mark as auto-allocated
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        allocation_plan_id: plan.id,
        is_auto_allocated: true,
      })
      .eq("id", transaction.id);

    if (updateError) {
      console.error("Error updating parent transaction:", updateError);
      // Continue anyway - allocation is created
    }

    console.log(
      `✅ Auto-allocation created: ${allocation.allocations.length} envelopes, plan ${plan.id}`
    );

    return { planId: plan.id, success: true };
  } catch (error) {
    console.error("Unexpected error in createAutoAllocation:", error);
    return {
      planId: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch process multiple transactions for auto-allocation
 * Useful when importing multiple income transactions at once
 */
export async function batchAutoAllocate(
  transactions: Transaction[],
  userId: string
): Promise<{ successful: number; failed: number; results: Array<{ transactionId: string; planId?: string; error?: string }> }> {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const transaction of transactions) {
    if (shouldAutoAllocate(transaction)) {
      const result = await createAutoAllocation(transaction, userId);

      if (result.success) {
        successful++;
        results.push({ transactionId: transaction.id, planId: result.planId });
      } else {
        failed++;
        results.push({ transactionId: transaction.id, error: result.error });
      }
    }
  }

  return { successful, failed, results };
}
