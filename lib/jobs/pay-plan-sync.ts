import type { SupabaseClient } from "@supabase/supabase-js";

type StreamRow = {
  id: string;
  user_id: string;
  name: string | null;
  amount: number | string | null;
  allocations: Array<{
    envelope?: string | null;
    envelopeId?: string | null;
    envelope_id?: string | null;
    amount?: number | string | null;
  }> | null;
};

type TransactionRow = {
  id: string;
  merchant_name: string | null;
  amount: number | string | null;
  occurred_at: string | null;
  status: string | null;
};

type SyncResult = {
  streams: number;
  candidates: number;
  applied: number;
  skipped: number;
  errors: Array<{ streamId: string; transactionId: string; message: string }>;
};

const LOOKBACK_DAYS = Number(process.env.PAY_PLAN_SYNC_LOOKBACK_DAYS ?? "10");
const AMOUNT_TOLERANCE_RATIO = Number(process.env.PAY_PLAN_SYNC_TOLERANCE_RATIO ?? "0.05");
const AMOUNT_TOLERANCE_MIN = Number(process.env.PAY_PLAN_SYNC_TOLERANCE_MIN ?? "5");

export async function runPayPlanSync(client: SupabaseClient): Promise<SyncResult> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - Math.max(LOOKBACK_DAYS, 1));
  const sinceIso = sinceDate.toISOString().slice(0, 10);

  const { data: streams, error } = await client
    .from("recurring_income")
    .select("id, user_id, name, amount, allocations")
    .not("allocations", "eq", "[]");

  if (error) {
    throw new Error(error.message);
  }

  const result: SyncResult = {
    streams: streams?.length ?? 0,
    candidates: 0,
    applied: 0,
    skipped: 0,
    errors: [],
  };

  if (!streams || streams.length === 0) {
    return result;
  }

  const envelopeCache = new Map<
    string,
    Map<string, { id: string; name: string }>
  >();

  for (const stream of streams) {
    const allocations = Array.isArray(stream.allocations)
      ? stream.allocations
      : [];
    if (!allocations.length) {
      result.skipped += 1;
      continue;
    }

    const streamName = (stream.name ?? "").trim();
    if (!streamName) {
      result.skipped += 1;
      continue;
    }

    const normalizedName = streamName.toLowerCase();
    const expectedAmount = Number(stream.amount ?? 0);

    const { data: candidates, error: candidateError } = await client
      .from("transactions")
      .select("id, merchant_name, amount, occurred_at, status")
      .eq("user_id", stream.user_id)
      .gte("occurred_at", sinceIso)
      .gte("amount", 0)
      .ilike("merchant_name", `%${streamName}%`)
      .order("occurred_at", { ascending: false })
      .limit(10);

    if (candidateError) {
      result.errors.push({
        streamId: stream.id,
        transactionId: "",
        message: candidateError.message,
      });
      continue;
    }

    if (!candidates || !candidates.length) {
      result.skipped += 1;
      continue;
    }

    for (const transaction of candidates) {
      result.candidates += 1;

      const merchant = (transaction.merchant_name ?? "").trim().toLowerCase();
      if (!merchant) {
        result.skipped += 1;
        continue;
      }

      if (!merchant.includes(normalizedName)) {
        result.skipped += 1;
        continue;
      }

      const transactionAmount = Number(transaction.amount ?? 0);
      if (transactionAmount <= 0) {
        result.skipped += 1;
        continue;
      }

      if (expectedAmount > 0) {
        const tolerance =
          Math.max(AMOUNT_TOLERANCE_MIN, expectedAmount * AMOUNT_TOLERANCE_RATIO);
        if (Math.abs(transactionAmount - expectedAmount) > tolerance) {
          result.skipped += 1;
          continue;
        }
      }

      const { data: existingSplits, error: splitCheckError } = await client
        .from("transaction_splits")
        .select("id")
        .eq("user_id", stream.user_id)
        .eq("transaction_id", transaction.id)
        .limit(1);

      if (splitCheckError) {
        result.errors.push({
          streamId: stream.id,
          transactionId: transaction.id,
          message: splitCheckError.message,
        });
        continue;
      }

      if (existingSplits && existingSplits.length > 0) {
        result.skipped += 1;
        continue;
      }

      let envelopeMap = envelopeCache.get(stream.user_id);
      if (!envelopeMap) {
        const { data: envelopes, error: envelopesError } = await client
          .from("envelopes")
          .select("id, name")
          .eq("user_id", stream.user_id);

        if (envelopesError) {
          result.errors.push({
            streamId: stream.id,
            transactionId: transaction.id,
            message: envelopesError.message,
          });
          continue;
        }

        envelopeMap = new Map();
        (envelopes ?? []).forEach((envelope) => {
          envelopeMap!.set(envelope.id, envelope);
          envelopeMap!.set(envelope.name.trim().toLowerCase(), envelope);
        });
        envelopeCache.set(stream.user_id, envelopeMap);
      }

      if (!envelopeMap) {
        result.skipped += 1;
        continue;
      }

      const resolvedAllocations = [];
      let allocationTotal = 0;
      let unresolved = false;

      for (const allocation of allocations) {
        const rawAmount = Number(allocation.amount ?? 0);
        if (rawAmount <= 0) continue;

        let envelopeId =
          allocation.envelopeId ??
          allocation.envelope_id ??
          null;

        if (!envelopeId && allocation.envelope) {
        const match = envelopeMap.get(
          allocation.envelope.trim().toLowerCase(),
        );
        envelopeId = match?.id ?? null;
      }

        if (!envelopeId) {
          unresolved = true;
          break;
        }

        const envelope = envelopeMap.get(envelopeId);
        if (!envelope) {
          unresolved = true;
          break;
        }

        allocationTotal += rawAmount;
        resolvedAllocations.push({
          envelopeId,
          envelopeName: envelope.name,
          amount: rawAmount,
        });
      }

      if (unresolved || resolvedAllocations.length === 0 || allocationTotal <= 0) {
        result.skipped += 1;
        continue;
      }

      const scale = transactionAmount / allocationTotal;
      let runningTotal = 0;
      const payload = resolvedAllocations.map((allocation, index) => {
        let amount = allocation.amount * scale;
        amount = Math.round(amount * 100) / 100;
        runningTotal += amount;
        if (index === resolvedAllocations.length - 1) {
          const adjustment = Math.round((transactionAmount - runningTotal) * 100) / 100;
          amount += adjustment;
          runningTotal += adjustment;
        }
        return {
          envelope_id: allocation.envelopeId,
          amount,
        };
      });

      const finalTotal = payload.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(finalTotal - transactionAmount) > 0.02) {
        result.errors.push({
          streamId: stream.id,
          transactionId: transaction.id,
          message: "Split totals did not match transaction amount after scaling",
        });
        continue;
      }

      const { error: splitError } = await client.rpc("save_transaction_splits", {
        p_user_id: stream.user_id,
        p_transaction_id: transaction.id,
        p_splits: payload,
      });

      if (splitError) {
        result.errors.push({
          streamId: stream.id,
          transactionId: transaction.id,
          message: splitError.message ?? "Failed to save transaction splits",
        });
        continue;
      }

      const allocationsForLog = payload.map((item) => ({
        envelope_id: item.envelope_id,
        amount: item.amount,
      }));

      const { error: logError } = await client
        .from("recurring_income_events")
        .upsert(
          {
            user_id: stream.user_id,
            stream_id: stream.id,
            transaction_id: transaction.id,
            transaction_amount: transactionAmount,
            expected_amount: expectedAmount > 0 ? expectedAmount : null,
            difference: expectedAmount > 0 ? transactionAmount - expectedAmount : null,
            allocations: allocationsForLog,
          },
          { onConflict: "stream_id,transaction_id" },
        );

      if (logError) {
        result.errors.push({
          streamId: stream.id,
          transactionId: transaction.id,
          message: logError.message ?? "Failed to log income event",
        });
      }

      result.applied += 1;
    }
  }

  return result;
}
