import type { SupabaseClient } from "@supabase/supabase-js";

const FREQUENCY_DIVISORS: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

function calculatePayCycleAmount(annual: number, frequency: string | null | undefined) {
  if (!annual || !frequency) return null;
  const divisor = FREQUENCY_DIVISORS[frequency.toLowerCase()];
  if (!divisor) return null;
  return Number((annual / divisor).toFixed(2));
}

export async function runEnvelopeRecalculation(client: SupabaseClient) {
  const { data, error } = await client
    .from("envelopes")
    .select("id, annual_amount, frequency, pay_cycle_amount")
    .not("annual_amount", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    return { processed: 0, recalculated: 0 };
  }

  const updates: Array<{ id: string; pay_cycle_amount: number }> = [];

  for (const envelope of data) {
    const annual = Number(envelope.annual_amount ?? 0);
    const calculated = calculatePayCycleAmount(annual, envelope.frequency);
    if (calculated === null) continue;

    const current = Number(envelope.pay_cycle_amount ?? 0);
    if (Number.isNaN(current) || Math.abs(calculated - current) > 0.01) {
      updates.push({ id: envelope.id, pay_cycle_amount: calculated });
    }
  }

  for (const update of updates) {
    const { error: updateError } = await client
      .from("envelopes")
      .update({ pay_cycle_amount: update.pay_cycle_amount, updated_at: new Date().toISOString() })
      .eq("id", update.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return {
    processed: data.length,
    recalculated: updates.length,
  };
}
