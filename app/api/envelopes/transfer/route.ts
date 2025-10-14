import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  amount: z.number().positive(),
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

  const { fromId, toId, amount } = parsed.data;

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
  const toBalance = Number(toEnvelope.current_amount ?? 0);

  if (fromBalance < amount) {
    return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
  }

  const { error: updateError } = await supabase.rpc("transfer_between_envelopes", {
    from_envelope_id: fromId,
    to_envelope_id: toId,
    transfer_amount: amount,
  });

  if (updateError) {
    if (updateError.code === "42883") {
      await supabase
        .from("envelopes")
        .update({ current_amount: fromBalance - amount })
        .eq("id", fromId)
        .eq("user_id", session.user.id);
      await supabase
        .from("envelopes")
        .update({ current_amount: toBalance + amount })
        .eq("id", toId)
        .eq("user_id", session.user.id);
    } else {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
