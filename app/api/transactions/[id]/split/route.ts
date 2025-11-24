import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const splitSchema = z
  .object({
    envelopeId: z.string().uuid().optional(),
    envelopeName: z.string().trim().min(1).optional(),
    amount: z.number(),
  })
  .refine((split) => split.envelopeId || split.envelopeName, {
    message: "Each split must include an envelope ID or name",
  });

const payloadSchema = z.object({
  splits: z.array(splitSchema).min(1, "At least one split is required"),
});

export async function POST(
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

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Invalid splits payload" },
      { status: 400 },
    );
  }

  const splits = parsed.data.splits.map((split) => ({
    envelopeId: split.envelopeId ?? null,
    envelopeName: split.envelopeName ?? null,
    amount: Number(split.amount ?? 0),
  }));

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id, amount")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 400 });
  }

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const transactionAmount = Number(transaction.amount ?? 0);

  const total = splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(total - transactionAmount) > 0.01) {
    return NextResponse.json(
      {
        error: `Split totals (${total.toFixed(2)}) must match the transaction amount (${transactionAmount.toFixed(2)})`,
      },
      { status: 400 },
    );
  }

  const { data: envelopeList, error: envelopeError } = await supabase
    .from("envelopes")
    .select("id, name")
    .eq("user_id", user.id);

  if (envelopeError) {
    return NextResponse.json({ error: envelopeError.message }, { status: 400 });
  }

  const envelopeMap = new Map<string, { id: string; name: string }>();
  (envelopeList ?? []).forEach((envelope) => {
    envelopeMap.set(envelope.id, envelope);
    envelopeMap.set(envelope.name.trim().toLowerCase(), envelope);
  });

  const resolvedSplits: Array<{ envelopeId: string; amount: number; envelopeName: string }> = [];

  for (const split of splits) {
    let resolved = split.envelopeId ? envelopeMap.get(split.envelopeId) : undefined;

    if (!resolved && split.envelopeName) {
      resolved = envelopeMap.get(split.envelopeName.trim().toLowerCase());
    }

    if (!resolved) {
      return NextResponse.json(
        { error: `Envelope "${split.envelopeName ?? split.envelopeId}" not found` },
        { status: 404 },
      );
    }

    resolvedSplits.push({
      envelopeId: resolved.id,
      envelopeName: resolved.name,
      amount: split.amount,
    });
  }

  const rpcPayload = resolvedSplits.map((split) => ({
    envelope_id: split.envelopeId,
    amount: split.amount,
  }));

  const { data: savedSplits, error: saveError } = await supabase.rpc("save_transaction_splits", {
    p_user_id: user.id,
    p_transaction_id: params.id,
    p_splits: rpcPayload,
  });

  if (saveError) {
    const message = saveError.message ?? saveError.details ?? "Unable to save split";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const responseSplits = resolvedSplits.map((split, index) => ({
    id: savedSplits?.[index]?.id ?? crypto.randomUUID(),
    transactionId: params.id,
    envelopeId: split.envelopeId,
    envelopeName: split.envelopeName,
    amount: split.amount,
  }));

  return NextResponse.json({
    transaction: {
      id: params.id,
      amount: transactionAmount,
    },
    splits: responseSplits,
  });
}
