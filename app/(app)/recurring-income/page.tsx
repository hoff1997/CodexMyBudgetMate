import { createClient } from "@/lib/supabase/server";
import { RecurringIncomeClient } from "@/components/layout/recurring-income/recurring-income-client";
import { PlannerFrequency } from "@/lib/planner/calculations";

export default async function RecurringIncomePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const [incomeResponse, envelopeResponse] = await Promise.all([
    session
      ? supabase
          .from("recurring_income")
          .select("id, name, amount, frequency, next_date, allocations, surplus_envelope")
          .eq("user_id", session.user.id)
          .order("name")
      : { data: null },
    supabase
      .from("envelopes")
      .select("id, name, pay_cycle_amount, annual_amount, frequency")
      .eq("user_id", session?.user.id ?? "")
      .order("name"),
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

  return <RecurringIncomeClient incomeStreams={incomeStreams} envelopeSummaries={envelopeSummaries} />;
}
