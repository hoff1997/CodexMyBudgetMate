/**
 * Wallet API Route
 *
 * GET /api/wallet - Get wallet summary (account, balance, recent transactions)
 * POST /api/wallet - Create a wallet account if one doesn't exist
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { WalletSummary, WalletTransaction, WalletAccount } from "@/lib/types/wallet";

export async function GET() {
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
    // Get wallet account
    const { data: walletAccount, error: accountError } = await supabase
      .from("accounts")
      .select("id, user_id, name, current_balance, account_type, is_wallet, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_wallet", true)
      .maybeSingle();

    if (accountError) {
      console.error("Error fetching wallet account:", accountError);
      return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
    }

    // If no wallet exists, return empty summary
    if (!walletAccount) {
      const summary: WalletSummary = {
        account: null,
        balance: 0,
        recentTransactions: [],
        hasWallet: false,
      };
      return NextResponse.json(summary);
    }

    // Get recent transactions
    const { data: transactions, error: txError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_account_id", walletAccount.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("Error fetching wallet transactions:", txError);
    }

    const summary: WalletSummary = {
      account: walletAccount as WalletAccount,
      balance: Number(walletAccount.current_balance) || 0,
      recentTransactions: (transactions as WalletTransaction[]) || [],
      hasWallet: true,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in wallet GET:", error);
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
    // Check if wallet already exists
    const { data: existingWallet } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_wallet", true)
      .maybeSingle();

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already exists", wallet_id: existingWallet.id },
        { status: 400 }
      );
    }

    // Parse request body for optional initial balance
    const body = await request.json().catch(() => ({}));
    const initialBalance = Number(body.initial_balance) || 0;

    // Create wallet account
    const { data: newWallet, error: createError } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: "Wallet",
        account_type: "cash",
        current_balance: initialBalance,
        is_wallet: true,
      })
      .select("id, user_id, name, current_balance, account_type, is_wallet, created_at")
      .single();

    if (createError) {
      console.error("Error creating wallet:", createError);
      return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 });
    }

    // If initial balance was provided, create an initial transaction
    if (initialBalance > 0) {
      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        wallet_account_id: newWallet.id,
        amount: initialBalance,
        source: "manual",
        description: "Initial wallet balance",
      });
    }

    return NextResponse.json({
      success: true,
      wallet: newWallet,
    });
  } catch (error) {
    console.error("Error in wallet POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
