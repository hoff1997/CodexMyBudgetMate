import { createClient } from "@/lib/supabase/server";
import { RecurringIncomeClient } from "@/components/layout/recurring-income/recurring-income-client";
import { PlannerFrequency } from "@/lib/planner/calculations";
import { getPayPlanSummary } from "@/lib/server/pay-plan";

export default async function RecurringIncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [incomeResponse, envelopeResponse, eventsResponse] = await Promise.all([
    session
      ? supabase
          .from("recurring_income")
          .select("id, name, amount, frequency, next_date, allocations, surplus_envelope")
          .eq("user_id", user.id)
          .order("name")
      : { data: null },
    supabase
      .from("envelopes")
      .select("id, name, pay_cycle_amount, annual_amount, frequency")
      .eq("user_id", session?.user.id ?? "")
      .order("name"),
    session
      ? supabase
          .from("recurring_income_events")
          .select("stream_id, transaction_id, transaction_amount, expected_amount, difference, applied_at")
          .eq("user_id", user.id)
          .order("applied_at", { ascending: false })
      : { data: null },
  ]);

  const incomeStreams = (incomeResponse.data ?? []).map((stream) => ({
    id: stream.id,
    name: stream.name,
    amount: Number(stream.amount ?? 0),
    frequency: (stream.frequency as PlannerFrequency) ?? "fortnightly",
    nextDate: stream.next_date,
    allocations: Array.isArray(stream.allocations)
      ? stream.allocations.map((allocation: any) => ({
          envelope: allocation.envelope ?? allocation.envelope_name ?? "Envelope",
          amount: Number(allocation.amount ?? 0),
          envelopeId: allocation.envelope_id ?? allocation.envelopeId ?? null,
        }))
      : [],
    surplusEnvelope: stream.surplus_envelope ?? null,
  }));

  const envelopeSummaries =
    envelopeResponse.data?.map((row) => ({
      id: row.id,
      name: row.name,
      perPay: Number(row.pay_cycle_amount ?? 0),
      annual: Number(row.annual_amount ?? 0),
      frequency: (row.frequency as PlannerFrequency | null) ?? null,
    })) ?? [];

  const payPlan = session ? await getPayPlanSummary(supabase, user.id) : null;

  const latestEvents: Array<{
    streamId: string;
    transactionId: string;
    transactionAmount: number;
    expectedAmount: number | null;
    difference: number | null;
    appliedAt: string;
  }> = [];

  if (eventsResponse.data) {
    const seen = new Set<string>();
    for (const row of eventsResponse.data) {
      if (seen.has(row.stream_id)) continue;
      seen.add(row.stream_id);
      latestEvents.push({
        streamId: row.stream_id,
        transactionId: row.transaction_id,
        transactionAmount: Number(row.transaction_amount ?? 0),
        expectedAmount:
          row.expected_amount !== null ? Number(row.expected_amount ?? 0) : null,
        difference: row.difference !== null ? Number(row.difference ?? 0) : null,
        appliedAt: row.applied_at,
      });
    }
  }

  return (
    <RecurringIncomeClient
      incomeStreams={incomeStreams}
      envelopeSummaries={envelopeSummaries}
      payPlan={payPlan}
      streamEvents={latestEvents}
    />
  );
}
