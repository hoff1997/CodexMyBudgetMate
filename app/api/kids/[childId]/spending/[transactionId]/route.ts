import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string; transactionId: string }>;
}

// GET /api/kids/[childId]/spending/[transactionId] - Get transaction details
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, transactionId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get the transaction
  const { data: transaction, error } = await supabase
    .from("child_spending_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (error || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}

// PATCH /api/kids/[childId]/spending/[transactionId] - Approve or deny transaction
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, transactionId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get the transaction
  const { data: transaction, error: txError } = await supabase
    .from("child_spending_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (txError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (transaction.approval_status !== "pending") {
    return NextResponse.json({ error: "Transaction is not pending approval" }, { status: 400 });
  }

  const body = await request.json();
  const { approved, denial_reason } = body;

  if (approved === undefined) {
    return NextResponse.json({ error: "approved field required" }, { status: 400 });
  }

  if (approved) {
    // Check account balance again
    const { data: account } = await supabase
      .from("child_bank_accounts")
      .select("id, current_balance")
      .eq("id", transaction.from_account_id)
      .maybeSingle();

    if (!account || Number(account.current_balance) < Number(transaction.amount)) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Approve the transaction
    const { error: updateError } = await supabase
      .from("child_spending_transactions")
      .update({
        approval_status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Deduct from account
    await supabase
      .from("child_bank_accounts")
      .update({
        current_balance: Number(account.current_balance) - Number(transaction.amount),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    return NextResponse.json({
      success: true,
      approved: true,
      child_name: child.name,
      amount: transaction.amount,
      description: transaction.description,
    });
  } else {
    // Deny the transaction
    const { error: updateError } = await supabase
      .from("child_spending_transactions")
      .update({
        approval_status: "denied",
        denial_reason: denial_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      approved: false,
      denial_reason: denial_reason,
    });
  }
}

// DELETE /api/kids/[childId]/spending/[transactionId] - Cancel a pending transaction
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, transactionId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get and verify the transaction is pending
  const { data: transaction } = await supabase
    .from("child_spending_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("child_profile_id", childId)
    .eq("approval_status", "pending")
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "Pending transaction not found" }, { status: 404 });
  }

  // Delete the transaction
  const { error: deleteError } = await supabase
    .from("child_spending_transactions")
    .delete()
    .eq("id", transactionId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
