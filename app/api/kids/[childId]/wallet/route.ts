/**
 * Kids Wallet API Route
 *
 * GET /api/kids/[childId]/wallet - Get kid's wallet balance and transactions
 * POST /api/kids/[childId]/wallet - Add a wallet transaction for the kid
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  KidWalletTransaction,
  CreateKidWalletTransactionRequest,
  KidWalletTransactionSource,
  KidWalletSummary,
} from "@/lib/types/wallet";

interface RouteParams {
  params: Promise<{ childId: string }>;
}

const VALID_SOURCES: KidWalletTransactionSource[] = [
  "manual",
  "pocket_money",
  "gift",
  "spending",
  "chore_payment",
];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId } = await params;

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify this child belongs to the user
    const { data: child, error: childError } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", childId)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (childError || !child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    // Get wallet account from child_bank_accounts
    const { data: walletAccount, error: accountError } = await supabase
      .from("child_bank_accounts")
      .select("id, child_profile_id, envelope_type, current_balance, created_at")
      .eq("child_profile_id", childId)
      .eq("envelope_type", "wallet")
      .maybeSingle();

    if (accountError) {
      console.error("Error fetching kid wallet:", accountError);
      return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
    }

    // Get recent transactions
    const { data: transactions, error: txError } = await supabase
      .from("kid_wallet_transactions")
      .select("*")
      .eq("child_profile_id", childId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("Error fetching kid wallet transactions:", txError);
    }

    const summary: KidWalletSummary = {
      account: walletAccount,
      balance: Number(walletAccount?.current_balance) || 0,
      recentTransactions: (transactions as KidWalletTransaction[]) || [],
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in kid wallet GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId } = await params;

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify this child belongs to the user
    const { data: child, error: childError } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", childId)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (childError || !child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    // Parse request body
    const body: CreateKidWalletTransactionRequest = await request.json();

    // Validate required fields
    if (typeof body.amount !== "number" || body.amount === 0) {
      return NextResponse.json(
        { error: "Amount is required and cannot be zero" },
        { status: 400 }
      );
    }

    if (!body.source || !VALID_SOURCES.includes(body.source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}` },
        { status: 400 }
      );
    }

    // Get wallet account
    const { data: walletAccount, error: accountError } = await supabase
      .from("child_bank_accounts")
      .select("id, current_balance")
      .eq("child_profile_id", childId)
      .eq("envelope_type", "wallet")
      .maybeSingle();

    if (accountError || !walletAccount) {
      return NextResponse.json({ error: "Wallet not found for this child" }, { status: 404 });
    }

    // Create the transaction
    const { data: transaction, error: txError } = await supabase
      .from("kid_wallet_transactions")
      .insert({
        child_profile_id: childId,
        amount: body.amount, // positive = deposit, negative = withdrawal
        source: body.source,
        description: body.description || null,
      })
      .select("*")
      .single();

    if (txError) {
      console.error("Error creating kid wallet transaction:", txError);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    // Update wallet balance
    const newBalance = Number(walletAccount.current_balance) + body.amount;
    const { error: updateError } = await supabase
      .from("child_bank_accounts")
      .update({ current_balance: newBalance })
      .eq("id", walletAccount.id);

    if (updateError) {
      console.error("Error updating kid wallet balance:", updateError);
    }

    return NextResponse.json({
      success: true,
      transaction: transaction as KidWalletTransaction,
      newBalance,
    });
  } catch (error) {
    console.error("Error in kid wallet POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
