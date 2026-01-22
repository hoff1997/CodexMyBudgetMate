import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";
import type { DebtItem } from "@/lib/types/debt";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // First, get the transaction to check if it's assigned to a debt envelope
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id, amount, envelope_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (txError || !transaction) {
    return createErrorResponse(txError || new Error("Transaction not found"), 404, "Transaction not found");
  }

  // Update transaction status
  const { error } = await supabase
    .from("transactions")
    .update({ status: "approved" })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to approve transaction");
  }

  // If transaction is assigned to an envelope, check if it's a debt envelope
  let debtPaymentResult = null;
  if (transaction.envelope_id) {
    const { data: envelope } = await supabase
      .from("envelopes")
      .select("id, name, is_debt")
      .eq("id", transaction.envelope_id)
      .eq("user_id", user.id)
      .single();

    // If it's a debt envelope and the transaction is a payment (negative amount = outgoing)
    // Note: In bank transactions, payments OUT are typically negative
    // But we want to apply the absolute value as a debt reduction
    if (envelope?.is_debt && transaction.amount) {
      const paymentAmount = Math.abs(Number(transaction.amount));

      if (paymentAmount > 0) {
        debtPaymentResult = await applyPaymentToDebtItems(
          supabase,
          user.id,
          envelope.id,
          paymentAmount,
          params.id
        );
      }
    }
  }

  // Check and award achievements (non-blocking)
  try {
    // Get approved transaction count for this user
    const { count: approvedCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved");

    const transactionCount = approvedCount ?? 0;

    // Check first_reconciliation achievement (first approved transaction)
    if (transactionCount === 1) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "first_reconciliation",
            achieved_at: new Date().toISOString(),
            metadata: { count: 1 },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check first_transaction achievement
    if (transactionCount >= 1) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "first_transaction",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check transactions_10 achievement
    if (transactionCount >= 10) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "transactions_10",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check transactions_50 achievement
    if (transactionCount >= 50) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "transactions_50",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check transactions_100 achievement
    if (transactionCount >= 100) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: user.id,
            achievement_key: "transactions_100",
            achieved_at: new Date().toISOString(),
            metadata: { count: transactionCount },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }
  } catch (achievementError) {
    // Non-critical - log but don't fail the transaction approval
    console.warn("Achievement check failed (non-critical):", achievementError);
  }

  return NextResponse.json({
    status: "approved",
    debtPayment: debtPaymentResult,
  });
}

/**
 * Apply a payment to debt items using snowball method (smallest balance first)
 */
async function applyPaymentToDebtItems(
  supabase: any,
  userId: string,
  envelopeId: string,
  paymentAmount: number,
  transactionId: string
): Promise<{
  paymentApplied: number;
  paidOffDebts: DebtItem[];
  remainingPayment: number;
}> {
  // Get all unpaid debt items ordered by balance (smallest first)
  const { data: debtItems, error: fetchError } = await supabase
    .from("debt_items")
    .select("*")
    .eq("envelope_id", envelopeId)
    .eq("user_id", userId)
    .is("paid_off_at", null)
    .order("current_balance", { ascending: true });

  if (fetchError || !debtItems || debtItems.length === 0) {
    return { paymentApplied: 0, paidOffDebts: [], remainingPayment: paymentAmount };
  }

  let remainingPayment = paymentAmount;
  const paidOffDebts: DebtItem[] = [];

  for (const item of debtItems) {
    if (remainingPayment <= 0) break;

    const currentBalance = Number(item.current_balance);
    const amountToApply = Math.min(remainingPayment, currentBalance);
    const newBalance = Math.max(0, currentBalance - amountToApply);

    // Update the debt item balance
    const { data: updated, error: updateError } = await supabase
      .from("debt_items")
      .update({ current_balance: newBalance })
      .eq("id", item.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("[approve] Debt update error for item:", item.id, updateError);
      continue;
    }

    // Check if this debt was just paid off
    if (newBalance <= 0) {
      paidOffDebts.push(updated as DebtItem);
      console.log(`[DEBT PAID OFF] User ${userId} paid off: ${item.name} via transaction ${transactionId}`);
    }

    remainingPayment -= amountToApply;
  }

  // Trigger achievements if any debts were paid off
  if (paidOffDebts.length > 0) {
    await handleDebtPayoffAchievements(supabase, userId, envelopeId, paidOffDebts);
  }

  return {
    paymentApplied: paymentAmount - remainingPayment,
    paidOffDebts,
    remainingPayment,
  };
}

/**
 * Handle achievement unlocking when debts are paid off
 */
async function handleDebtPayoffAchievements(
  supabase: any,
  userId: string,
  envelopeId: string,
  paidOffDebts: DebtItem[]
) {
  try {
    // Check total paid off debts for this user
    const { count: totalPaidOff } = await supabase
      .from("debt_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("paid_off_at", "is", null);

    // Award "debt-destroyer" achievement for first paid off debt
    if ((totalPaidOff ?? 0) <= paidOffDebts.length) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: userId,
            achievement_key: "debt-destroyer",
            achieved_at: new Date().toISOString(),
            metadata: {
              first_debt_name: paidOffDebts[0].name,
              envelope_id: envelopeId,
            },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Check if ALL debts are now paid off (debt-free achievement)
    const { count: remainingDebts } = await supabase
      .from("debt_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("paid_off_at", null)
      .gt("current_balance", 0);

    if ((remainingDebts ?? 0) === 0) {
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: userId,
            achievement_key: "debt-free",
            achieved_at: new Date().toISOString(),
            metadata: { total_debts_paid: totalPaidOff },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }
  } catch (error) {
    console.warn("[approve] Achievement check failed (non-critical):", error);
  }
}
