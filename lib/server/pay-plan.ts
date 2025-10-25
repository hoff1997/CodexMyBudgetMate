import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlannerFrequency } from "@/lib/planner/calculations";
import {
  type PayPlanSummary,
  type PayPlanStream,
  type PayPlanAllocation,
  type PayPlanEnvelope,
  type PayPlanTotals,
} from "@/lib/types/pay-plan";

type RawAllocation = {
  envelope?: string | null;
  envelope_id?: string | null;
  envelopeId?: string | null;
  amount?: number | string | null;
};

type RawIncomeRow = {
  id: string;
  user_id?: string;
  name: string;
  amount: number | string | null;
  frequency: string | null;
  allocations: RawAllocation[] | null;
};

type RawEnvelope = {
  id: string;
  name: string;
};

const FREQUENCIES: PlannerFrequency[] = [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "annually",
  "none",
];

function normaliseFrequency(value: string | null): PlannerFrequency {
  if (!value) return "fortnightly";
  const lower = value.toLowerCase() as PlannerFrequency;
  return FREQUENCIES.includes(lower) ? lower : "fortnightly";
}

function cyclesPerYear(frequency: PlannerFrequency): number {
  switch (frequency) {
    case "weekly":
      return 52;
    case "fortnightly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annually":
      return 1;
    case "none":
    default:
      return 0;
  }
}

function detectPrimaryFrequency(streams: PayPlanStream[]): PlannerFrequency {
  let winningFrequency: PlannerFrequency = "fortnightly";
  let bestAnnual = 0;
  streams.forEach((stream) => {
    if (stream.annualAmount > bestAnnual) {
      bestAnnual = stream.annualAmount;
      winningFrequency = stream.frequency;
    }
  });
  return winningFrequency;
}

export async function getPayPlanSummary(
  client: SupabaseClient,
  userId: string | null | undefined,
): Promise<PayPlanSummary | null> {
  if (!userId) return null;

  const { data: incomes, error: incomesError } = await client
    .from("recurring_income")
    .select("id, name, amount, frequency, allocations")
    .eq("user_id", userId)
    .order("name");

  const { data: envelopes, error: envelopesError } = await client
    .from("envelopes")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");

  if (incomesError || envelopesError) {
    console.error("Failed to load pay plan data", incomesError ?? envelopesError);
    return null;
  }

  if (!incomes || incomes.length === 0) {
    return null;
  }

  const envelopeLookup = new Map((envelopes ?? []).map((row) => [row.id, row.name]));
  const envelopeTotals = new Map<string, PayPlanEnvelope>();

  const streams: PayPlanStream[] = incomes.map((row) => {
    const frequency = normaliseFrequency(row.frequency);
    const amount = Number(row.amount ?? 0);
    const annualAmount = amount * cyclesPerYear(frequency);
    const allocationsRaw = Array.isArray(row.allocations) ? row.allocations : [];

    const allocations: PayPlanAllocation[] = allocationsRaw.map((allocation) => {
      let envelopeId =
        allocation.envelope_id ??
        allocation.envelopeId ??
        null;
      const allocationName =
        typeof allocation.envelope === "string" ? allocation.envelope.trim() : "";
      if (!envelopeId && allocationName) {
        const matchedEntry = Array.from(envelopeLookup.entries()).find(
          ([, name]) => name.toLowerCase() === allocationName.toLowerCase(),
        );
        envelopeId = matchedEntry ? matchedEntry[0] : null;
      }
      const amountValue = Number(allocation.amount ?? 0);
      const annualAllocation = amountValue * cyclesPerYear(frequency);
      const allocationRecord: PayPlanAllocation = {
        envelopeId,
        envelopeName:
          (envelopeId && envelopeLookup.get(envelopeId)) ??
          allocation.envelope ??
          "Envelope",
        amount: amountValue,
        annualAmount: annualAllocation,
        perPayAmount: 0, // populated later
      };
      if (envelopeId) {
        const existing = envelopeTotals.get(envelopeId);
        const updatedAnnual = (existing?.annualAmount ?? 0) + annualAllocation;
        envelopeTotals.set(envelopeId, {
          envelopeId,
          envelopeName: envelopeLookup.get(envelopeId) ?? allocationRecord.envelopeName,
          annualAmount: updatedAnnual,
          perPayAmount: 0, // populated later
        });
      }
      return allocationRecord;
    });

    const allocationsTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const allocationsAnnual = allocations.reduce(
      (sum, allocation) => sum + allocation.annualAmount,
      0,
    );

    return {
      id: row.id,
      name: row.name,
      frequency,
      amount,
      annualAmount,
      allocations,
      allocationsTotal,
      allocationsAnnual,
      surplus: amount - allocationsTotal,
      surplusAnnual: annualAmount - allocationsAnnual,
    };
  });

  const primaryFrequency = detectPrimaryFrequency(streams);
  const primaryCycles = Math.max(cyclesPerYear(primaryFrequency), 1);

  const totals: PayPlanTotals = streams.reduce(
    (acc, stream) => {
      acc.annualIncome += stream.annualAmount;
      acc.annualAllocated += stream.allocationsAnnual;
      return acc;
    },
    {
      annualIncome: 0,
      annualAllocated: 0,
      annualSurplus: 0,
      perPayIncome: 0,
      perPayAllocated: 0,
      perPaySurplus: 0,
    },
  );

  totals.annualSurplus = totals.annualIncome - totals.annualAllocated;
  totals.perPayIncome = totals.annualIncome / primaryCycles;
  totals.perPayAllocated = totals.annualAllocated / primaryCycles;
  totals.perPaySurplus = totals.perPayIncome - totals.perPayAllocated;

  const envelopesList: PayPlanEnvelope[] = Array.from(envelopeTotals.values()).map(
    (entry) => ({
      ...entry,
      perPayAmount: entry.annualAmount / primaryCycles,
    }),
  );

  streams.forEach((stream) => {
    stream.allocations = stream.allocations.map((allocation) => ({
      ...allocation,
      perPayAmount:
        allocation.annualAmount && primaryCycles > 0
          ? allocation.annualAmount / primaryCycles
          : 0,
    }));
  });

  return {
    streams,
    envelopes: envelopesList,
    totals,
    primaryFrequency,
  };
}
