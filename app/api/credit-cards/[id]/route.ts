/**
 * Individual Credit Card API
 *
 * GET - Fetch a single credit card with full details
 * PATCH - Update credit card configuration
 * DELETE - Remove credit card
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the credit card
    const { data: creditCard, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !creditCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    // Fetch related data
    const [holdingResult, cycleResult, projectionResult, paymentsResult] = await Promise.all([
      supabase
        .from("envelopes")
        .select("id, name, current_amount")
        .eq("cc_account_id", id)
        .eq("is_cc_holding", true)
        .single(),
      supabase
        .from("credit_card_cycle_holdings")
        .select("*")
        .eq("account_id", id)
        .eq("is_current_cycle", true)
        .single(),
      supabase
        .from("credit_card_payoff_projections")
        .select("*")
        .eq("account_id", id)
        .eq("is_active", true)
        .single(),
      supabase
        .from("credit_card_payment_reconciliations")
        .select("*")
        .eq("account_id", id)
        .order("payment_date", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      creditCard,
      holdingEnvelope: holdingResult.data,
      currentCycle: cycleResult.data,
      payoffProjection: projectionResult.data,
      recentPayments: paymentsResult.data || [],
    });
  } catch (error) {
    console.error("Credit card GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.usageType !== undefined) updateData.cc_usage_type = body.usageType;
    if (body.stillUsing !== undefined) updateData.cc_still_using = body.stillUsing;
    if (body.apr !== undefined) updateData.apr = body.apr;
    if (body.statementCloseDay !== undefined) updateData.statement_close_day = body.statementCloseDay;
    if (body.paymentDueDay !== undefined) updateData.payment_due_day = body.paymentDueDay;
    if (body.expectedMonthlySpending !== undefined) updateData.cc_expected_monthly_spending = body.expectedMonthlySpending;
    if (body.currentOutstanding !== undefined) updateData.cc_current_outstanding = body.currentOutstanding;
    if (body.paymentSplitPreference !== undefined) updateData.cc_payment_split_preference = body.paymentSplitPreference;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedCard, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating credit card:", error);
      return NextResponse.json({ error: "Failed to update credit card" }, { status: 500 });
    }

    // If APR or minimum payment changed, update payoff projection
    if (body.apr !== undefined || body.minimumPayment !== undefined) {
      const { data: projection } = await supabase
        .from("credit_card_payoff_projections")
        .select("*")
        .eq("account_id", id)
        .eq("is_active", true)
        .single();

      if (projection) {
        await supabase
          .from("credit_card_payoff_projections")
          .update({
            apr: body.apr ?? projection.apr,
            minimum_payment: body.minimumPayment ?? projection.minimum_payment,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projection.id);
      }
    }

    return NextResponse.json({
      success: true,
      creditCard: updatedCard,
    });
  } catch (error) {
    console.error("Credit card PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete related data first (cascade should handle some, but be explicit)
    // 1. Delete payoff projections
    await supabase
      .from("credit_card_payoff_projections")
      .delete()
      .eq("account_id", id)
      .eq("user_id", user.id);

    // 2. Delete cycle holdings
    await supabase
      .from("credit_card_cycle_holdings")
      .delete()
      .eq("account_id", id)
      .eq("user_id", user.id);

    // 3. Delete payment reconciliations
    await supabase
      .from("credit_card_payment_reconciliations")
      .delete()
      .eq("account_id", id)
      .eq("user_id", user.id);

    // 4. Delete CC holding envelope
    await supabase
      .from("envelopes")
      .delete()
      .eq("cc_account_id", id)
      .eq("is_cc_holding", true)
      .eq("user_id", user.id);

    // 5. Finally delete the account
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting credit card:", error);
      return NextResponse.json({ error: "Failed to delete credit card" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Credit card DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
