/**
 * Credit Cards API
 *
 * GET - Fetch all credit card accounts with their configurations
 * POST - Create a new credit card account
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch credit card accounts with CC-specific fields
    const { data: creditCards, error } = await supabase
      .from("accounts")
      .select(`
        id,
        name,
        type,
        current_balance,
        cc_usage_type,
        cc_still_using,
        cc_starting_debt_amount,
        cc_starting_debt_date,
        cc_expected_monthly_spending,
        cc_current_outstanding,
        cc_total_interest_paid,
        cc_payment_split_preference,
        apr,
        statement_close_day,
        payment_due_day,
        created_at,
        updated_at
      `)
      .eq("user_id", user.id)
      .eq("type", "debt")
      .not("cc_usage_type", "is", null)
      .order("name");

    if (error) {
      console.error("Error fetching credit cards:", error);
      return NextResponse.json({ error: "Failed to fetch credit cards" }, { status: 500 });
    }

    // Fetch related CC holding envelopes
    const { data: holdingEnvelopes } = await supabase
      .from("envelopes")
      .select("id, name, current_amount, cc_account_id")
      .eq("user_id", user.id)
      .eq("is_cc_holding", true);

    // Fetch current billing cycle data
    const { data: cycleData } = await supabase
      .from("credit_card_cycle_holdings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_current_cycle", true);

    // Fetch payoff projections
    const { data: projections } = await supabase
      .from("credit_card_payoff_projections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Combine the data
    const enrichedCards = creditCards?.map((card) => {
      const holdingEnvelope = holdingEnvelopes?.find(e => e.cc_account_id === card.id);
      const cycle = cycleData?.find(c => c.account_id === card.id);
      const projection = projections?.find(p => p.account_id === card.id);

      return {
        ...card,
        holding_envelope: holdingEnvelope || null,
        current_cycle: cycle || null,
        payoff_projection: projection || null,
      };
    });

    return NextResponse.json({
      creditCards: enrichedCards || [],
    });
  } catch (error) {
    console.error("Credit cards API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      currentBalance,
      usageType,
      stillUsing,
      apr,
      statementCloseDay,
      paymentDueDay,
      startingDebtAmount,
      expectedMonthlySpending,
      minimumPayment,
    } = body;

    // Validate required fields
    if (!name || !usageType) {
      return NextResponse.json({ error: "Name and usage type are required" }, { status: 400 });
    }

    if (!statementCloseDay || !paymentDueDay) {
      return NextResponse.json({ error: "Billing cycle information is required" }, { status: 400 });
    }

    // Create the credit card account
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        type: "debt",
        current_balance: -(currentBalance || 0),
        cc_usage_type: usageType,
        cc_still_using: stillUsing ?? true,
        cc_starting_debt_amount: startingDebtAmount || currentBalance || 0,
        cc_starting_debt_date: new Date().toISOString(),
        cc_expected_monthly_spending: expectedMonthlySpending || null,
        cc_current_outstanding: currentBalance || 0,
        apr: apr || null,
        statement_close_day: statementCloseDay,
        payment_due_day: paymentDueDay,
      })
      .select()
      .single();

    if (accountError) {
      console.error("Error creating credit card account:", accountError);
      return NextResponse.json({ error: "Failed to create credit card" }, { status: 500 });
    }

    // Create CC Holding envelope
    const initialHoldingAmount = usageType === "pay_in_full" ? (currentBalance || 0) : 0;

    const { data: holdingEnvelope, error: envelopeError } = await supabase
      .from("envelopes")
      .insert({
        user_id: user.id,
        name: `${name} Holding`,
        icon: "💳",
        current_amount: initialHoldingAmount,
        opening_balance: initialHoldingAmount,
        is_cc_holding: true,
        cc_account_id: account.id,
        envelope_type: "expense",
        is_spending: false,
        is_goal: false,
        priority: "essential",
      })
      .select()
      .single();

    if (envelopeError) {
      console.error("Error creating CC holding envelope:", envelopeError);
      // Continue anyway - envelope can be created later
    }

    // Create payoff projection if needed
    if ((usageType === "paying_down" || usageType === "minimum_only") && apr && minimumPayment) {
      await supabase.from("credit_card_payoff_projections").insert({
        user_id: user.id,
        account_id: account.id,
        starting_balance: startingDebtAmount || currentBalance || 0,
        current_balance: startingDebtAmount || currentBalance || 0,
        apr,
        minimum_payment: minimumPayment,
        extra_payment: 0,
        is_active: true,
      });
    }

    return NextResponse.json({
      success: true,
      creditCard: account,
      holdingEnvelope,
    });
  } catch (error) {
    console.error("Create credit card error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
