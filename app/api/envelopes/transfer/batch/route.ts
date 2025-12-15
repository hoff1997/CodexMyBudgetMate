import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Batch Transfer API
 *
 * Executes multiple envelope transfers in a single request.
 * Used by Smart Fill to distribute surplus to multiple envelopes.
 *
 * All transfers are executed sequentially using the existing RPC function.
 * If any transfer fails, the response includes partial results.
 */

const transferSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  amount: z.number().positive(),
});

const batchSchema = z.object({
  transfers: z.array(transferSchema).min(1).max(50), // Limit to 50 transfers per batch
  note: z.string().trim().max(255).optional(),
});

interface TransferResult {
  fromId: string;
  toId: string;
  amount: number;
  success: boolean;
  error?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Parse and coerce amounts to numbers
  const parsedBody = {
    ...body,
    transfers: (body.transfers ?? []).map((t: any) => ({
      ...t,
      amount: typeof t.amount === "string" ? Number(t.amount) : t.amount,
    })),
  };

  const parsed = batchSchema.safeParse(parsedBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { transfers, note } = parsed.data;

  // Validate no duplicate transfers and no self-transfers
  for (const t of transfers) {
    if (t.fromId === t.toId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same envelope" },
        { status: 400 }
      );
    }
  }

  // Get all unique envelope IDs
  const envelopeIds = [
    ...new Set([...transfers.map((t) => t.fromId), ...transfers.map((t) => t.toId)]),
  ];

  // Verify all envelopes exist and belong to user
  const { data: envelopes, error: fetchError } = await supabase
    .from("envelopes")
    .select("id, name, current_amount")
    .eq("user_id", user.id)
    .in("id", envelopeIds);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!envelopes || envelopes.length !== envelopeIds.length) {
    return NextResponse.json(
      { error: "One or more envelopes not found" },
      { status: 404 }
    );
  }

  // Build envelope lookup
  const envelopeMap = new Map(envelopes.map((e) => [e.id, e]));

  // Execute transfers sequentially
  const results: TransferResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // Build note for batch transfer
  const batchNote = note ?? "Smart Fill transfer";

  for (const transfer of transfers) {
    const fromEnvelope = envelopeMap.get(transfer.fromId);

    if (!fromEnvelope) {
      results.push({
        ...transfer,
        success: false,
        error: "Source envelope not found",
      });
      failCount++;
      continue;
    }

    // Check balance (use current map value which gets updated)
    const currentBalance = Number(fromEnvelope.current_amount ?? 0);

    if (currentBalance < transfer.amount) {
      results.push({
        ...transfer,
        success: false,
        error: `Insufficient funds (available: ${currentBalance.toFixed(2)})`,
      });
      failCount++;
      continue;
    }

    // Execute transfer using existing RPC
    const { data: transferResult, error: transferError } = await supabase.rpc(
      "transfer_between_envelopes",
      {
        p_user_id: user.id,
        p_from_envelope_id: transfer.fromId,
        p_to_envelope_id: transfer.toId,
        p_amount: transfer.amount,
        p_note: batchNote,
      }
    );

    if (transferError) {
      results.push({
        ...transfer,
        success: false,
        error: transferError.message ?? "Transfer failed",
      });
      failCount++;
      continue;
    }

    // Update local balance tracking for subsequent transfers
    fromEnvelope.current_amount = currentBalance - transfer.amount;

    const toEnvelope = envelopeMap.get(transfer.toId);
    if (toEnvelope) {
      toEnvelope.current_amount =
        Number(toEnvelope.current_amount ?? 0) + transfer.amount;
    }

    results.push({
      ...transfer,
      success: true,
    });
    successCount++;
  }

  // Fetch final envelope balances
  const { data: updatedEnvelopes } = await supabase
    .from("envelopes")
    .select("id, name, current_amount, target_amount")
    .eq("user_id", user.id)
    .in("id", envelopeIds);

  return NextResponse.json({
    success: failCount === 0,
    summary: {
      total: transfers.length,
      successful: successCount,
      failed: failCount,
    },
    results,
    envelopes: updatedEnvelopes ?? [],
  });
}
