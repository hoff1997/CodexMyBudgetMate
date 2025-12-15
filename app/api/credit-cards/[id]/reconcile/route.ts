/**
 * Credit Card Payment Reconciliation API
 *
 * POST - Record a payment reconciliation with split
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: accountId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      transactionId,
      paymentAmount,
      paymentDate,
      holdingPortion,
      interestPortion,
      extraPrincipal,
      cycleIdentifier,
      notes,
    } = body;

    // Validate required fields
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    // Validate split totals
    const splitTotal = (holdingPortion || 0) + (interestPortion || 0) + (extraPrincipal || 0);
    if (Math.abs(splitTotal - paymentAmount) > 0.01) {
      return NextResponse.json({ error: "Split amounts must equal payment amount" }, { status: 400 });
    }

    // Verify the account exists and belongs to user
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, name, cc_usage_type, cc_total_interest_paid")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    // Create the reconciliation record
    const { data: reconciliation, error: reconcileError } = await supabase
      .from("credit_card_payment_reconciliations")
      .insert({
        user_id: user.id,
        account_id: accountId,
        transaction_id: transactionId || null,
        payment_amount: paymentAmount,
        payment_date: paymentDate || new Date().toISOString(),
        holding_portion: holdingPortion || 0,
        interest_portion: interestPortion || 0,
        extra_principal: extraPrincipal || 0,
        cycle_identifier: cycleIdentifier || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (reconcileError) {
      console.error("Error creating reconciliation:", reconcileError);
      return NextResponse.json({ error: "Failed to record reconciliation" }, { status: 500 });
    }

    // Update account totals
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Add interest paid to running total
    if (interestPortion && interestPortion > 0) {
      updateData.cc_total_interest_paid = (account.cc_total_interest_paid || 0) + interestPortion;
    }

    await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", accountId);

    // Update CC Holding envelope balance (subtract holding portion)
    if (holdingPortion && holdingPortion > 0) {
      const { data: holdingEnvelope } = await supabase
        .from("envelopes")
        .select("id, current_amount")
        .eq("cc_account_id", accountId)
        .eq("is_cc_holding", true)
        .single();

      if (holdingEnvelope) {
        const newAmount = Math.max(0, (holdingEnvelope.current_amount || 0) - holdingPortion);
        await supabase
          .from("envelopes")
          .update({
            current_amount: newAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", holdingEnvelope.id);
      }
    }

    // Update current cycle holdings if applicable
    if (cycleIdentifier && holdingPortion > 0) {
      const { data: cycle } = await supabase
        .from("credit_card_cycle_holdings")
        .select("id, current_holding_amount, payments_applied")
        .eq("account_id", accountId)
        .eq("cycle_identifier", cycleIdentifier)
        .single();

      if (cycle) {
        await supabase
          .from("credit_card_cycle_holdings")
          .update({
            current_holding_amount: Math.max(0, (cycle.current_holding_amount || 0) - holdingPortion),
            payments_applied: (cycle.payments_applied || 0) + paymentAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cycle.id);
      }
    }

    // Update payoff projection if extra principal was paid
    if (extraPrincipal && extraPrincipal > 0) {
      const { data: projection } = await supabase
        .from("credit_card_payoff_projections")
        .select("id, current_balance, total_paid")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .single();

      if (projection) {
        await supabase
          .from("credit_card_payoff_projections")
          .update({
            current_balance: Math.max(0, (projection.current_balance || 0) - extraPrincipal),
            total_paid: (projection.total_paid || 0) + extraPrincipal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projection.id);
      }
    }

    // Mark transaction as CC payment if provided
    if (transactionId) {
      await supabase
        .from("transactions")
        .update({
          is_cc_payment: true,
          cc_payment_reconciliation_id: reconciliation.id,
        })
        .eq("id", transactionId);
    }

    return NextResponse.json({
      success: true,
      reconciliation,
    });
  } catch (error) {
    console.error("Payment reconciliation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
