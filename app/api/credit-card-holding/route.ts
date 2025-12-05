import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateTotalMinimumPayment, calculatePaymentStrategy, type CreditCardForStrategy } from "@/lib/services/payment-strategy";
import { calculateSimpleInterest, getTotalInterest } from "@/lib/services/credit-card-interest";

/**
 * GET /api/credit-card-holding
 *
 * Get credit card holding account status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🟠 [API /credit-card-holding] GET request received");

    const supabase = await createClient();
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    console.log("🟠 [API /credit-card-holding] Session check - exists:", !!user, "error:", sessionError?.message || "none");

    if (!user) {
      console.log("🔴 [API /credit-card-holding] Returning 401 - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🟢 [API /credit-card-holding] Session valid for user:", user.email);

    // Get holding account
    const { data: holdingAccount, error: holdingError } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_credit_card_holding", true)
      .single();

    if (holdingError || !holdingAccount) {
      return NextResponse.json({
        hasHoldingAccount: false,
        holdingAccount: null,
        creditCardAccounts: [],
        totalCreditCardDebt: 0,
        holdingBalance: 0,
        isFullyCovered: false,
        shortfall: 0,
        allocations: [],
      });
    }

    // Get all credit card accounts
    const { data: creditCardAccounts, error: ccError } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "debt");

    const creditCards = creditCardAccounts || [];

    // Calculate total credit card debt (absolute value)
    const totalCreditCardDebt = creditCards.reduce((sum, account) => {
      return sum + Math.abs(parseFloat(String(account.current_balance)));
    }, 0);

    const holdingBalance = parseFloat(String(holdingAccount.current_balance));
    const isFullyCovered = holdingBalance >= totalCreditCardDebt;
    const shortfall = totalCreditCardDebt - holdingBalance;

    // Prepare credit cards for payment strategy calculations
    const cardsForStrategy: CreditCardForStrategy[] = creditCards.map((acc) => ({
      id: acc.id,
      name: acc.name,
      currentBalance: Math.abs(parseFloat(String(acc.current_balance))),
      apr: acc.apr || 0,
      minimumPayment: acc.minimum_payment_amount || (acc.minimum_payment_percentage
        ? Math.abs(parseFloat(String(acc.current_balance))) * (acc.minimum_payment_percentage / 100)
        : Math.abs(parseFloat(String(acc.current_balance))) * 0.02), // Default 2%
      creditLimit: acc.credit_limit || undefined,
      payoffPriority: acc.payoff_priority || undefined,
    }));

    // Calculate minimum payments and interest
    const totalMinimumPayment = calculateTotalMinimumPayment(cardsForStrategy);
    const totalMonthlyInterest = getTotalInterest(
      creditCards.map(acc => ({
        id: acc.id,
        name: acc.name,
        current_balance: parseFloat(String(acc.current_balance)),
        apr: acc.apr || 0,
        last_interest_charge_date: acc.last_interest_charge_date,
        last_interest_amount: acc.last_interest_amount,
      })),
      30 // 30 days
    );

    // Calculate payment strategy if surplus is available
    const surplusAvailable = Math.max(0, shortfall < 0 ? Math.abs(shortfall) : 0);
    let paymentStrategy = null;

    if (creditCards.length > 0) {
      // Use the first card's strategy or default to pay_off
      const defaultStrategy = creditCards[0]?.payment_strategy || 'pay_off';
      paymentStrategy = calculatePaymentStrategy(
        cardsForStrategy,
        defaultStrategy as any,
        surplusAvailable
      );
    }

    // Get recent allocations
    const { data: allocations, error: allocError } = await supabase
      .from("credit_card_allocations")
      .select(
        `
        *,
        transaction:transactions(id, merchant_name, amount, occurred_at),
        envelope:envelopes(id, name, icon),
        credit_card:accounts!credit_card_account_id(id, name)
      `
      )
      .eq("user_id", user.id)
      .order("allocated_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      hasHoldingAccount: true,
      holdingAccount: {
        id: holdingAccount.id,
        name: holdingAccount.name,
        balance: holdingBalance,
      },
      creditCardAccounts: creditCards.map((acc) => ({
        id: acc.id,
        name: acc.name,
        balance: parseFloat(String(acc.current_balance)),
        debt: Math.abs(parseFloat(String(acc.current_balance))),
        apr: acc.apr,
        creditLimit: acc.credit_limit,
        paymentStrategy: acc.payment_strategy,
        minimumPayment: acc.minimum_payment_amount || (acc.minimum_payment_percentage
          ? Math.abs(parseFloat(String(acc.current_balance))) * (acc.minimum_payment_percentage / 100)
          : null),
        paymentDueDay: acc.payment_due_day,
        amountDueNextStatement: acc.amount_due_next_statement,
        utilization: acc.credit_limit && acc.credit_limit > 0
          ? (Math.abs(parseFloat(String(acc.current_balance))) / acc.credit_limit) * 100
          : null,
      })),
      totalCreditCardDebt,
      holdingBalance,
      isFullyCovered,
      shortfall: shortfall > 0 ? shortfall : 0,
      coveragePercentage:
        totalCreditCardDebt > 0
          ? (holdingBalance / totalCreditCardDebt) * 100
          : 100,
      totalMinimumPayment,
      totalMonthlyInterest,
      paymentStrategy,
      surplusAvailable,
      allocations: allocations || [],
    });
  } catch (error) {
    console.error("Credit card holding status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-card-holding
 *
 * Create or designate an account as the credit card holding account
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, createNew, name } = body;

    // If creating new holding account
    if (createNew) {
      // First, unset any existing holding accounts
      await supabase
        .from("accounts")
        .update({ is_credit_card_holding: false })
        .eq("user_id", user.id)
        .eq("is_credit_card_holding", true);

      // Create new account
      const { data: newAccount, error: createError } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: name || "Credit Card Holding",
          type: "transaction", // Regular transaction account
          current_balance: 0,
          is_credit_card_holding: true,
        })
        .select()
        .single();

      if (createError) {
        console.error("Create error:", createError);
        return NextResponse.json(
          { error: "Failed to create holding account" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        account: newAccount,
        message: "Credit card holding account created",
      });
    }

    // If designating existing account
    if (accountId) {
      // Verify account belongs to user
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .single();

      if (accountError || !account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      // Unset any other holding accounts
      await supabase
        .from("accounts")
        .update({ is_credit_card_holding: false })
        .eq("user_id", user.id)
        .eq("is_credit_card_holding", true)
        .neq("id", accountId);

      // Set this account as holding account
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ is_credit_card_holding: true })
        .eq("id", accountId);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to designate holding account" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        account,
        message: "Account designated as credit card holding account",
      });
    }

    return NextResponse.json(
      { error: "Must provide accountId or createNew" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Credit card holding setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
