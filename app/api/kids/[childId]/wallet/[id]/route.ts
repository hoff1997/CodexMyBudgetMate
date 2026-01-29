/**
 * Kids Wallet Transaction ID API Route
 *
 * DELETE /api/kids/[childId]/wallet/[id] - Delete a kid wallet transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ childId: string; id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { childId, id } = await params;

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

    // Get the transaction first to know the amount
    const { data: transaction, error: fetchError } = await supabase
      .from("kid_wallet_transactions")
      .select("id, amount, child_profile_id")
      .eq("id", id)
      .eq("child_profile_id", childId)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Get current wallet balance
    const { data: walletAccount, error: accountError } = await supabase
      .from("child_bank_accounts")
      .select("id, current_balance")
      .eq("child_profile_id", childId)
      .eq("envelope_type", "wallet")
      .single();

    if (accountError || !walletAccount) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from("kid_wallet_transactions")
      .delete()
      .eq("id", id)
      .eq("child_profile_id", childId);

    if (deleteError) {
      console.error("Error deleting kid wallet transaction:", deleteError);
      return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
    }

    // Update wallet balance (reverse the transaction amount)
    const newBalance = Number(walletAccount.current_balance) - Number(transaction.amount);
    const { error: updateError } = await supabase
      .from("child_bank_accounts")
      .update({ current_balance: newBalance })
      .eq("id", walletAccount.id);

    if (updateError) {
      console.error("Error updating kid wallet balance:", updateError);
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      newBalance,
    });
  } catch (error) {
    console.error("Error in kid wallet transaction DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
