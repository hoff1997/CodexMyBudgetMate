/**
 * Wallet Transaction ID API Route
 *
 * GET /api/wallet/transactions/[id] - Get a specific transaction
 * DELETE /api/wallet/transactions/[id] - Delete a transaction and update balance
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = await params;

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: transaction, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error in wallet transaction GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = await params;

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the transaction first to know the amount
    const { data: transaction, error: fetchError } = await supabase
      .from("wallet_transactions")
      .select("id, amount, wallet_account_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Get current wallet balance
    const { data: walletAccount, error: accountError } = await supabase
      .from("accounts")
      .select("id, current_balance")
      .eq("id", transaction.wallet_account_id)
      .single();

    if (accountError || !walletAccount) {
      return NextResponse.json({ error: "Wallet account not found" }, { status: 404 });
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from("wallet_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting transaction:", deleteError);
      return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
    }

    // Update wallet balance (reverse the transaction amount)
    const newBalance = Number(walletAccount.current_balance) - Number(transaction.amount);
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", walletAccount.id);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      // Transaction was deleted but balance wasn't updated - log this
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      newBalance,
    });
  } catch (error) {
    console.error("Error in wallet transaction DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
