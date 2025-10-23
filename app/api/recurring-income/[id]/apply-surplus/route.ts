import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/finance";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const paramsSchema = z.object({
  id: z.string().uuid("Invalid income stream id"),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const parseParams = paramsSchema.safeParse(params);
  if (!parseParams.success) {
    return NextResponse.json({ error: parseParams.error.message }, { status: 400 });
  }

  const { id } = parseParams.data;

  const { data: stream, error: streamError } = await supabase
    .from("recurring_income")
    .select("id, name, amount, allocations, surplus_envelope")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (streamError) {
    return NextResponse.json({ error: streamError.message }, { status: 400 });
  }

  if (!stream) {
    return NextResponse.json({ error: "Income stream not found" }, { status: 404 });
  }

  const allocations = Array.isArray(stream.allocations) ? stream.allocations : [];
  const allocated = allocations.reduce(
    (sum: number, entry: any) => sum + Number(entry.amount ?? 0),
    0,
  );
  const streamAmount = Number(stream.amount ?? 0);
  const rawSurplus = Number(streamAmount - allocated);

  if (rawSurplus <= 0.01) {
    return NextResponse.json(
      { error: "No surplus available for this income stream" },
      { status: 400 },
    );
  }

  if (!stream.surplus_envelope) {
    return NextResponse.json(
      { error: "Set a surplus envelope to auto-allocate this income stream" },
      { status: 400 },
    );
  }

  const { data: envelopes, error: envelopesError } = await supabase
    .from("envelopes")
    .select("id, name, current_amount, target_amount")
    .eq("user_id", session.user.id);

  if (envelopesError) {
    return NextResponse.json({ error: envelopesError.message }, { status: 400 });
  }

  const envelopeList = envelopes ?? [];
  const sourceEnvelope =
    envelopeList.find((env) => env.id === stream.surplus_envelope) ??
    envelopeList.find(
      (env) =>
        env.name.trim().toLowerCase() === stream.surplus_envelope.trim().toLowerCase(),
    );

  if (!sourceEnvelope) {
    return NextResponse.json(
      {
        error:
          "Surplus envelope is no longer available. Update the income stream with a valid envelope.",
      },
      { status: 400 },
    );
  }

  const sourceBalance = Number(sourceEnvelope.current_amount ?? 0);
  if (sourceBalance <= 0.01) {
    return NextResponse.json(
      {
        error: `${sourceEnvelope.name} does not have funds available to apply the plan`,
      },
      { status: 400 },
    );
  }

  const available = Math.min(rawSurplus, sourceBalance);
  if (available <= 0.01) {
    return NextResponse.json(
      { error: "No available balance to apply from surplus envelope" },
      { status: 400 },
    );
  }

  const deficits = envelopeList
    .filter((env) => env.id !== sourceEnvelope.id)
    .map((env) => {
      const target = Number(env.target_amount ?? 0);
      const current = Number(env.current_amount ?? 0);
      const gap = Math.max(0, target - current);
      return {
        id: env.id,
        name: env.name,
        gap,
      };
    })
    .filter((item) => item.gap > 0.5)
    .sort((a, b) => b.gap - a.gap);

  if (!deficits.length) {
    return NextResponse.json(
      {
        error: "All envelopes are already fully funded. No deficits to allocate surplus to.",
      },
      { status: 400 },
    );
  }

  const transfers: Array<{
    id: string;
    amount: number;
    fromEnvelopeId: string;
    toEnvelopeId: string;
    note: string;
  }> = [];

  let remaining = available;
  for (const deficit of deficits) {
    if (remaining <= 0.01) break;
    const allocation = Math.min(remaining, deficit.gap);
    if (allocation <= 0.01) continue;

    const note = `Auto allocation from ${stream.name}`;
    const { data: transfer, error: transferError } = await supabase.rpc(
      "transfer_between_envelopes",
      {
        p_user_id: session.user.id,
        p_from_envelope_id: sourceEnvelope.id,
        p_to_envelope_id: deficit.id,
        p_amount: allocation,
        p_note: note,
      },
    );

    if (transferError) {
      return NextResponse.json({ error: transferError.message }, { status: 400 });
    }

    const entry = Array.isArray(transfer) ? transfer[0] : transfer;
    transfers.push({
      id: entry?.id ?? crypto.randomUUID(),
      amount: allocation,
      fromEnvelopeId: sourceEnvelope.id,
      toEnvelopeId: deficit.id,
      note,
    });

    remaining -= allocation;
  }

  const celebration = await maybeLogCelebration({
    supabase,
    userId: session.user.id,
    originalSurplus: rawSurplus,
    applied: available - remaining,
    streamName: stream.name,
  });

  return NextResponse.json({
    applied: available - remaining,
    remaining,
    transfers,
    celebration,
  });
}

async function maybeLogCelebration({
  supabase,
  userId,
  originalSurplus,
  applied,
  streamName,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  originalSurplus: number;
  applied: number;
  streamName: string;
}) {
  if (applied <= 0.01) {
    return null;
  }

  const { data: envelopesAfter } = await supabase
    .from("envelopes")
    .select("target_amount, current_amount")
    .eq("user_id", userId);

  const remainingGap = (envelopesAfter ?? []).reduce((max, env) => {
    const target = Number(env.target_amount ?? 0);
    const current = Number(env.current_amount ?? 0);
    return Math.max(max, Math.max(0, target - current));
  }, 0);

  if (remainingGap > 2) {
    return null;
  }

  const title = "Zero budget balanced";
  const description = `Applied ${formatCurrency(applied)} from ${streamName}, covering outstanding deficits.`;

  const { data: celebration, error } = await supabase
    .from("zero_budget_celebrations")
    .insert({
      user_id: userId,
      title,
      description,
      metadata: {
        originalSurplus: Number(originalSurplus.toFixed(2)),
        applied: Number(applied.toFixed(2)),
        stream: streamName,
      },
    })
    .select("id, title, description, achieved_at")
    .maybeSingle();

  if (error || !celebration) {
    return null;
  }

  return celebration;
}
