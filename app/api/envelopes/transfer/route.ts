import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().trim().max(255).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse({
    ...body,
    amount: typeof body.amount === "string" ? Number(body.amount) : body.amount,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { fromId, toId, amount, note } = parsed.data;

  if (fromId === toId) {
    return NextResponse.json({ error: "Cannot transfer to the same envelope" }, { status: 400 });
  }

  const { data: envelopes, error } = await supabase
    .from("envelopes")
    .select("id, current_amount")
    .eq("user_id", session.user.id)
    .in("id", [fromId, toId]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!envelopes || envelopes.length !== 2) {
    return NextResponse.json({ error: "Envelopes not found" }, { status: 404 });
  }

  const fromEnvelope = envelopes.find((env) => env.id === fromId);
  const toEnvelope = envelopes.find((env) => env.id === toId);

  if (!fromEnvelope || !toEnvelope) {
    return NextResponse.json({ error: "Envelopes not found" }, { status: 404 });
  }

  const fromBalance = Number(fromEnvelope.current_amount ?? 0);

  if (fromBalance < amount) {
    return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
  }

  const { data: transfer, error: transferError } = await supabase.rpc(
    "transfer_between_envelopes",
    {
      p_user_id: session.user.id,
      p_from_envelope_id: fromId,
      p_to_envelope_id: toId,
      p_amount: amount,
      p_note: note ?? null,
    },
  );

  if (transferError) {
    const message =
      transferError.message ?? transferError.details ?? "Unable to complete transfer";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: updatedEnvelopes } = await supabase
    .from("envelopes")
    .select("id, current_amount")
    .eq("user_id", session.user.id)
    .in("id", [fromId, toId]);

  return NextResponse.json({
    transfer,
    envelopes: updatedEnvelopes ?? [],
  });
}
