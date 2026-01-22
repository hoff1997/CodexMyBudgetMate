import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";
import type { DebtItem } from "@/lib/types/debt";
import { calculateDebtSummary, sortBySnowball } from "@/lib/types/debt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/envelopes/[id]/debt-items/apply-payment
 * Apply a payment to debt items using snowball method (smallest balance first)
 *
 * This endpoint:
 * 1. Takes a payment amount
 * 2. Applies it to the smallest debt first
 * 3. If that debt is paid off, rolls remainder to next smallest
 * 4. Triggers achievements when debts are paid off
 * 5. Returns updated items and any paid-off debts for celebration
 */
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { id: envelopeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const paymentAmount = Number(body.amount);
  const transactionId = body.transactionId; // Optional: for audit trail

  if (!paymentAmount || paymentAmount <= 0) {
    return createValidationError("Payment amount must be greater than 0");
  }

  // Verify envelope belongs to user and is a debt envelope
  const { data: envelope, error: envelopeError } = await supabase
    .from("envelopes")
    .select("id, name, is_debt")
    .eq("id", envelopeId)
    .eq("user_id", user.id)
    .single();

  if (envelopeError || !envelope) {
    return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
  }

  if (!envelope.is_debt) {
    return NextResponse.json({ error: "Envelope is not a debt envelope" }, { status: 400 });
  }

  // Get all debt items ordered by balance (smallest first, excluding paid off)
  const { data: debtItems, error: fetchError } = await supabase
    .from("debt_items")
    .select("*")
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id)
    .is("paid_off_at", null) // Only unpaid debts
    .order("current_balance", { ascending: true });

  if (fetchError) {
    console.error("[apply-payment] Fetch error:", fetchError);
    return createErrorResponse(fetchError, 400, "Failed to fetch debt items");
  }

  if (!debtItems || debtItems.length === 0) {
    return NextResponse.json({
      message: "No unpaid debts to apply payment to",
      items: [],
      paidOffDebts: [],
      summary: null,
    });
  }

  // Apply payment using snowball method
  let remainingPayment = paymentAmount;
  const paidOffDebts: DebtItem[] = [];
  const updatedItems: DebtItem[] = [];

  for (const item of debtItems) {
    if (remainingPayment <= 0) break;

    const currentBalance = Number(item.current_balance);
    const amountToApply = Math.min(remainingPayment, currentBalance);
    const newBalance = Math.max(0, currentBalance - amountToApply);

    // Update the debt item balance
    const { data: updated, error: updateError } = await supabase
      .from("debt_items")
      .update({
        current_balance: newBalance,
        // paid_off_at is set automatically by database trigger when balance <= 0
      })
      .eq("id", item.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[apply-payment] Update error for item:", item.id, updateError);
      continue;
    }

    updatedItems.push(updated as DebtItem);

    // Check if this debt was just paid off
    if (newBalance <= 0) {
      paidOffDebts.push(updated as DebtItem);
    }

    remainingPayment -= amountToApply;
  }

  // Trigger achievements for paid off debts
  if (paidOffDebts.length > 0) {
    await handleDebtPayoffAchievements(supabase, user.id, envelopeId, paidOffDebts);
  }

  // Get all items (including paid off) for summary
  const { data: allItems } = await supabase
    .from("debt_items")
    .select("*")
    .eq("envelope_id", envelopeId)
    .eq("user_id", user.id);

  const sortedItems = sortBySnowball((allItems || []) as DebtItem[]);
  const summary = calculateDebtSummary((allItems || []) as DebtItem[]);

  return NextResponse.json({
    items: sortedItems,
    paidOffDebts,
    summary,
    paymentApplied: paymentAmount - remainingPayment,
    remainingPayment,
  });
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
    // Check if this is the user's FIRST debt paid off ever
    const { count: totalPaidOff } = await supabase
      .from("debt_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("paid_off_at", "is", null);

    // Award "debt-destroyer" achievement for first paid off debt
    if ((totalPaidOff ?? 0) <= paidOffDebts.length) {
      // This means these were the first paid off debts
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
      // User is debt free!
      await supabase
        .from("achievements")
        .upsert(
          {
            user_id: userId,
            achievement_key: "debt-free",
            achieved_at: new Date().toISOString(),
            metadata: {
              total_debts_paid: totalPaidOff,
            },
          },
          { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
        );
    }

    // Log each paid off debt for potential notifications
    for (const debt of paidOffDebts) {
      console.log(`[DEBT PAID OFF] User ${userId} paid off: ${debt.name} (${debt.debt_type})`);
    }

  } catch (error) {
    // Non-critical - log but don't fail
    console.warn("[apply-payment] Achievement check failed (non-critical):", error);
  }
}
