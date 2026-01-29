/**
 * Wallet Transactions API Route
 *
 * GET /api/wallet/transactions - Get wallet transactions with pagination
 * POST /api/wallet/transactions - Add a new wallet transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  WalletTransaction,
  CreateWalletTransactionRequest,
  WalletTransactionSource,
} from "@/lib/types/wallet";

const VALID_SOURCES: WalletTransactionSource[] = [
  "manual",
  "atm_withdrawal",
  "gift",
  "spending",
  "transfer",
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  try {
    // Get wallet account
    const { data: walletAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_wallet", true)
      .maybeSingle();

    if (!walletAccount) {
      return NextResponse.json({ transactions: [], total: 0, hasWallet: false });
    }

    // Get transactions with count
    const { data: transactions, error: txError, count } = await supabase
      .from("wallet_transactions")
      .select("*", { count: "exact" })
      .eq("wallet_account_id", walletAccount.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) {
      console.error("Error fetching transactions:", txError);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    return NextResponse.json({
      transactions: transactions as WalletTransaction[],
      total: count || 0,
      hasWallet: true,
    });
  } catch (error) {
    console.error("Error in wallet transactions GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body: CreateWalletTransactionRequest = await request.json();

    // Validate required fields
    if (typeof body.amount !== "number" || body.amount === 0) {
      return NextResponse.json({ error: "Amount is required and cannot be zero" }, { status: 400 });
    }

    if (!body.source || !VALID_SOURCES.includes(body.source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}` },
        { status: 400 }
      );
    }

    // Get wallet account
    const { data: walletAccount } = await supabase
      .from("accounts")
      .select("id, current_balance")
      .eq("user_id", user.id)
      .eq("is_wallet", true)
      .maybeSingle();

    if (!walletAccount) {
      return NextResponse.json(
        { error: "No wallet found. Please create a wallet first." },
        { status: 400 }
      );
    }

    // Create the transaction
    const { data: transaction, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        wallet_account_id: walletAccount.id,
        amount: body.amount, // positive = deposit, negative = withdrawal
        source: body.source,
        description: body.description || null,
        linked_bank_transaction_id: body.linked_bank_transaction_id || null,
      })
      .select("*")
      .single();

    if (txError) {
      console.error("Error creating wallet transaction:", txError);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    // Update wallet balance
    const newBalance = Number(walletAccount.current_balance) + body.amount;
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", walletAccount.id);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      // Transaction was created but balance wasn't updated - log this for manual fix
    }

    return NextResponse.json({
      success: true,
      transaction: transaction as WalletTransaction,
      newBalance,
    });
  } catch (error) {
    console.error("Error in wallet transactions POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
