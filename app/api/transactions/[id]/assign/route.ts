import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payloadSchema = z
  .object({
    envelopeId: z.string().uuid().optional(),
    envelopeName: z
      .string()
      .trim()
      .min(1, "Envelope name is required when an ID is not supplied")
      .optional(),
  })
  .refine((payload) => payload.envelopeId || payload.envelopeName, {
    message: "Envelope details are required",
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

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().formErrors[0] ?? "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 400 });
  }

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  let envelopeId = payload.envelopeId ?? null;
  let envelopeName: string | null = null;

  if (envelopeId) {
    const { data: envelope, error: envelopeError } = await supabase
      .from("envelopes")
      .select("id, name")
      .eq("id", envelopeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (envelopeError) {
      return NextResponse.json({ error: envelopeError.message }, { status: 400 });
    }

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    envelopeName = envelope.name;
  } else if (payload.envelopeName) {
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select("id, name")
      .eq("user_id", user.id);

    if (envelopesError) {
      return NextResponse.json({ error: envelopesError.message }, { status: 400 });
    }

    const match = (envelopes ?? []).find(
      (item) => item.name.trim().toLowerCase() === payload.envelopeName!.trim().toLowerCase(),
    );

    if (!match) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    envelopeId = match.id;
    envelopeName = match.name;
  }

  if (!envelopeId) {
    return NextResponse.json({ error: "Unable to resolve envelope" }, { status: 400 });
  }

  const nextStatus =
    transaction.status && transaction.status.toLowerCase() === "unmatched"
      ? "pending"
      : transaction.status ?? "pending";

  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update({ envelope_id: envelopeId, status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, status, envelope_id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    transaction: {
      id: updated?.id ?? params.id,
      status: updated?.status ?? nextStatus,
      envelope: {
        id: envelopeId,
        name: envelopeName,
      },
    },
  });
}
