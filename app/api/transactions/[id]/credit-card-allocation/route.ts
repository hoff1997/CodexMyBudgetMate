import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/transactions/[id]/credit-card-allocation
 *
 * Manually allocate a credit card transaction to the holding account.
 * This moves money from the assigned envelope to the credit card holding account.
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

    const transactionId = params.id;

    // Get the transaction details
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*, account:accounts(*), envelope:envelopes(*)")
      .eq("id", transactionId)
      .eq("user_id", session.user.id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify this is a credit card transaction
    if (!transaction.account || transaction.account.type !== "debt") {
      return NextResponse.json(
        { error: "Transaction is not from a credit card account" },
        { status: 400 }
      );
    }

    // Verify transaction has an envelope assigned
    if (!transaction.envelope_id) {
      return NextResponse.json(
        { error: "Transaction must be assigned to an envelope first" },
        { status: 400 }
      );
    }

    // Find the credit card holding account
    const { data: holdingAccount, error: holdingError } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_credit_card_holding", true)
      .single();

    if (holdingError || !holdingAccount) {
      return NextResponse.json(
        {
          error:
            "Credit card holding account not found. Please create one first.",
        },
        { status: 400 }
      );
    }

    // Check if already allocated
    const { data: existingAllocation } = await supabase
      .from("credit_card_allocations")
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    if (existingAllocation) {
      return NextResponse.json(
        { error: "Transaction already allocated to holding account" },
        { status: 400 }
      );
    }

    const amount = Math.abs(parseFloat(String(transaction.amount)));

    // Create allocation record
    const { error: allocationError } = await supabase
      .from("credit_card_allocations")
      .insert({
        user_id: session.user.id,
        transaction_id: transactionId,
        envelope_id: transaction.envelope_id,
        holding_account_id: holdingAccount.id,
        credit_card_account_id: transaction.account_id,
        amount: amount,
        notes: "Manual allocation via API",
      });

    if (allocationError) {
      console.error("Allocation error:", allocationError);
      return NextResponse.json(
        { error: "Failed to create allocation record" },
        { status: 500 }
      );
    }

    // Update holding account balance (increase by transaction amount)
    const newHoldingBalance =
      parseFloat(String(holdingAccount.current_balance)) + amount;

    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        current_balance: newHoldingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", holdingAccount.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update holding account balance" },
        { status: 500 }
      );
    }

    // Deduct from envelope balance
    if (transaction.envelope) {
      const newEnvelopeBalance =
        parseFloat(String(transaction.envelope.current_amount)) - amount;

      await supabase
        .from("envelopes")
        .update({
          current_amount: newEnvelopeBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.envelope_id);
    }

    return NextResponse.json({
      success: true,
      allocation: {
        transactionId,
        amount,
        envelopeId: transaction.envelope_id,
        holdingAccountId: holdingAccount.id,
        newHoldingBalance,
      },
    });
  } catch (error) {
    console.error("Credit card allocation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions/[id]/credit-card-allocation
 *
 * Check if a transaction has been allocated to the holding account
 */
export async function GET(
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

    const { data: allocation, error } = await supabase
      .from("credit_card_allocations")
      .select("*, envelope:envelopes(*), holding_account:accounts!holding_account_id(*)")
      .eq("transaction_id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Allocation check error:", error);
      return NextResponse.json(
        { error: "Failed to check allocation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      allocated: !!allocation,
      allocation: allocation || null,
    });
  } catch (error) {
    console.error("Credit card allocation check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions/[id]/credit-card-allocation
 *
 * Reverse a credit card allocation (move money back from holding to envelope)
 */
export async function DELETE(
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

    // Get the allocation
    const { data: allocation, error: allocationError } = await supabase
      .from("credit_card_allocations")
      .select("*")
      .eq("transaction_id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (allocationError || !allocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 }
      );
    }

    const amount = parseFloat(String(allocation.amount));

    // Get holding account
    const { data: holdingAccount } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", allocation.holding_account_id)
      .single();

    if (!holdingAccount) {
      return NextResponse.json(
        { error: "Holding account not found" },
        { status: 404 }
      );
    }

    // Update holding account balance (decrease)
    const newHoldingBalance =
      parseFloat(String(holdingAccount.current_balance)) - amount;

    await supabase
      .from("accounts")
      .update({
        current_balance: newHoldingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", holdingAccount.id);

    // Get envelope and update balance (increase)
    const { data: envelope } = await supabase
      .from("envelopes")
      .select("*")
      .eq("id", allocation.envelope_id)
      .single();

    if (envelope) {
      const newEnvelopeBalance =
        parseFloat(String(envelope.current_amount)) + amount;

      await supabase
        .from("envelopes")
        .update({
          current_amount: newEnvelopeBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", allocation.envelope_id);
    }

    // Delete allocation record
    const { error: deleteError } = await supabase
      .from("credit_card_allocations")
      .delete()
      .eq("id", allocation.id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete allocation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reversed: {
        amount,
        newHoldingBalance,
      },
    });
  } catch (error) {
    console.error("Credit card allocation reversal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
