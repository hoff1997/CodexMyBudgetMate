import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateTransactionSchema = z.object({
  merchant_name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().optional(),
  occurred_at: z.string().optional(),
  account_id: z.string().uuid().optional().nullable(),
  envelope_id: z.string().uuid().optional().nullable(),
  status: z.enum(["pending", "approved"]).optional(),
  bank_reference: z.string().optional().nullable(),
  bank_memo: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const parsed = updateTransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Invalid transaction data" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Verify transaction belongs to user
  const { data: existingTransaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (transactionError || !existingTransaction) {
    return NextResponse.json(
      { error: "Transaction not found or does not belong to user" },
      { status: 404 },
    );
  }

  // Verify envelope belongs to user if provided
  if (data.envelope_id) {
    const { data: envelope, error: envelopeError } = await supabase
      .from("envelopes")
      .select("id")
      .eq("id", data.envelope_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (envelopeError || !envelope) {
      return NextResponse.json(
        { error: "Envelope not found or does not belong to user" },
        { status: 404 },
      );
    }
  }

  // Verify account belongs to user if provided
  if (data.account_id) {
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", data.account_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found or does not belong to user" },
        { status: 404 },
      );
    }
  }

  // Update transaction
  const { data: transaction, error: updateError } = await supabase
    .from("transactions")
    .update(data)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ transaction });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Verify transaction belongs to user
  const { data: existingTransaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (transactionError || !existingTransaction) {
    return NextResponse.json(
      { error: "Transaction not found or does not belong to user" },
      { status: 404 },
    );
  }

  // Delete transaction
  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Fetch transaction with related data
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      *,
      envelope:envelopes(id, name),
      account:accounts(id, name)
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !transaction) {
    return NextResponse.json(
      { error: "Transaction not found or does not belong to user" },
      { status: 404 },
    );
  }

  return NextResponse.json({ transaction });
}
