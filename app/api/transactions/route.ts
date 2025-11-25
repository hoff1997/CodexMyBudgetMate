import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAutoAllocation, shouldAutoAllocate } from "@/lib/allocations/auto-allocate";

const createTransactionSchema = z.object({
  merchant_name: z.string().min(1, "Merchant name is required"),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().refine((val) => val !== 0, {
    message: "Amount cannot be zero",
  }),
  occurred_at: z.string().min(1, "Date is required"),
  account_id: z.string().uuid().optional().nullable(),
  envelope_id: z.string().uuid().optional().nullable(),
  status: z.enum(["pending", "approved"]).optional().default("pending"),
  bank_reference: z.string().optional().nullable(),
  bank_memo: z.string().optional().nullable(),
});

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

export async function POST(request: Request) {
  console.log('🟢 [API /transactions] POST request received');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('🟢 [API /transactions] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    error: authError?.message
  });

  if (!user) {
    console.log('🔴 [API /transactions] Unauthorized - no user');
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const parsed = createTransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Invalid transaction data" },
      { status: 400 },
    );
  }

  const data = parsed.data;

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

  // Create transaction
  const { data: transaction, error: createError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      merchant_name: data.merchant_name,
      description: data.description,
      amount: data.amount,
      occurred_at: data.occurred_at,
      account_id: data.account_id,
      envelope_id: data.envelope_id,
      status: data.status,
      bank_reference: data.bank_reference,
      bank_memo: data.bank_memo,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Trigger auto-allocation if this is an income transaction
  if (shouldAutoAllocate(transaction)) {
    const result = await createAutoAllocation(transaction, user.id);
    if (result.success) {
      console.log(`✅ Auto-allocated transaction ${transaction.id} to plan ${result.planId}`);
    } else {
      console.error(`❌ Failed to auto-allocate transaction ${transaction.id}:`, result.error);
      // Don't fail the transaction creation - just log the error
    }
  }

  return NextResponse.json({ transaction }, { status: 201 });
}

export async function GET(request: Request) {
  console.log('🟢 [API /transactions] GET request received');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('🟢 [API /transactions] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    error: authError?.message
  });

  if (!user) {
    console.log('🔴 [API /transactions] Unauthorized - no user');
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const envelopeId = searchParams.get("envelope_id");
  const accountId = searchParams.get("account_id");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("transactions")
    .select(`
      *,
      envelope:envelopes(id, name),
      account:accounts(id, name),
      allocation_plan_id,
      is_auto_allocated,
      parent_transaction_id
    `)
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (envelopeId) {
    query = query.eq("envelope_id", envelopeId);
  }

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  if (limit) {
    query = query.limit(Number.parseInt(limit, 10));
  }

  const { data: transactions, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }

  return NextResponse.json({ transactions });
}
