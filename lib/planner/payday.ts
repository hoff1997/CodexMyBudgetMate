import type { PayCycle, Envelope, EnvelopeHealth } from "./types";
import { calculateAllEnvelopeHealth } from "./scenarios";

export type RegularAllocation = {
  envelopeId: string;
  name: string;
  priority: "essential" | "important" | "discretionary";
  amount: number;
  type: "regular";
};

export type SurplusSuggestion = {
  type: "top-up" | "new-goal" | "buffer";
  envelopeId?: string;
  envelopeName?: string;
  suggestedAmount: number;
  reason: string;
  impact: string;
  urgencyScore?: number;
};

export type PaydayAllocation = {
  payAmount: number;
  payCycle: PayCycle;

  // Regular allocations (what you normally put aside each pay)
  regularAllocations: RegularAllocation[];
  totalRegular: number;

  // Surplus or shortfall
  surplus: number;
  surplusStatus: "available" | "exact" | "shortfall";

  // Health checks for context
  envelopeHealth: EnvelopeHealth[];

  // Smart suggestions for surplus
  suggestions: SurplusSuggestion[];

  // Summary stats
  summary: {
    essentialTotal: number;
    importantTotal: number;
    discretionaryTotal: number;
    behindCount: number;
    totalGap: number;
  };
};

/**
 * Calculate how to allocate a paycheck across all envelopes
 * Shows regular allocations + smart suggestions for surplus
 */
export function calculatePaydayAllocation(
  payAmount: number,
  envelopes: Envelope[],
  payCycle: PayCycle
): PaydayAllocation {
  // Step 1: Calculate health for all envelopes
  const envelopeHealth = calculateAllEnvelopeHealth(envelopes, payCycle);

  // Step 2: Calculate regular allocations (what goes to each envelope normally)
  const regularAllocations: RegularAllocation[] = envelopes
    .filter((env) => env.envelope_type === "expense")
    .map((env) => ({
      envelopeId: env.id,
      name: env.name,
      priority: env.priority,
      amount: env.pay_cycle_amount || 0,
      type: "regular" as const,
    }));

  const totalRegular = regularAllocations.reduce((sum, a) => sum + a.amount, 0);

  // Step 3: Calculate surplus or shortfall
  const surplus = payAmount - totalRegular;
  const surplusStatus: "available" | "exact" | "shortfall" =
    surplus > 0 ? "available" : surplus === 0 ? "exact" : "shortfall";

  // Step 4: Generate smart suggestions for surplus
  const suggestions = generateSurplusSuggestions(envelopeHealth, surplus, envelopes);

  // Step 5: Calculate summary stats
  const essentialAllocations = regularAllocations.filter((a) => a.priority === "essential");
  const importantAllocations = regularAllocations.filter((a) => a.priority === "important");
  const discretionaryAllocations = regularAllocations.filter((a) => a.priority === "discretionary");

  const behindEnvelopes = envelopeHealth.filter((h) => h.gapStatus === "behind");
  const totalGap = behindEnvelopes.reduce((sum, h) => sum + h.gap, 0);

  return {
    payAmount,
    payCycle,
    regularAllocations,
    totalRegular,
    surplus,
    surplusStatus,
    envelopeHealth,
    suggestions,
    summary: {
      essentialTotal: essentialAllocations.reduce((sum, a) => sum + a.amount, 0),
      importantTotal: importantAllocations.reduce((sum, a) => sum + a.amount, 0),
      discretionaryTotal: discretionaryAllocations.reduce((sum, a) => sum + a.amount, 0),
      behindCount: behindEnvelopes.length,
      totalGap,
    },
  };
}

/**
 * Generate smart suggestions for what to do with surplus money
 */
function generateSurplusSuggestions(
  envelopeHealth: EnvelopeHealth[],
  surplus: number,
  envelopes: Envelope[]
): SurplusSuggestion[] {
  const suggestions: SurplusSuggestion[] = [];

  // If no surplus, no suggestions
  if (surplus <= 0) {
    return suggestions;
  }

  // Find envelopes that are behind schedule
  const behindEnvelopes = envelopeHealth
    .filter((h) => h.gap > 0 && h.gapStatus === "behind")
    .sort((a, b) => a.priorityScore - b.priorityScore); // lowest score = most urgent

  // Suggestion 1: Top up most urgent behind envelope
  if (behindEnvelopes.length > 0) {
    const mostUrgent = behindEnvelopes[0];
    const suggestedAmount = Math.min(surplus, mostUrgent.gap);

    suggestions.push({
      type: "top-up",
      envelopeId: mostUrgent.envelopeId,
      envelopeName: mostUrgent.name,
      suggestedAmount,
      reason: mostUrgent.priorityReason,
      impact: `This will reduce the gap to $${Math.max(0, mostUrgent.gap - suggestedAmount).toFixed(2)}`,
      urgencyScore: mostUrgent.priorityScore,
    });
  }

  // Suggestion 2: Split surplus across all behind envelopes proportionally
  if (behindEnvelopes.length > 1) {
    const totalGap = behindEnvelopes.reduce((sum, h) => sum + h.gap, 0);

    if (surplus < totalGap) {
      suggestions.push({
        type: "top-up",
        suggestedAmount: surplus,
        reason: `Split $${surplus.toFixed(2)} across ${behindEnvelopes.length} behind envelopes`,
        impact: `Each envelope gets a proportional boost based on its gap`,
      });
    }
  }

  // Suggestion 3: If all on track or surplus exceeds gaps, suggest new goal or buffer
  const allOnTrack = behindEnvelopes.length === 0;
  const surplusExceedsGaps =
    behindEnvelopes.length > 0 &&
    surplus > behindEnvelopes.reduce((sum, h) => sum + h.gap, 0);

  if (allOnTrack || surplusExceedsGaps) {
    const remainingSurplus = surplusExceedsGaps
      ? surplus - behindEnvelopes.reduce((sum, h) => sum + h.gap, 0)
      : surplus;

    suggestions.push({
      type: "new-goal",
      suggestedAmount: remainingSurplus,
      reason: "All envelopes on track - start a savings goal",
      impact: "Build emergency fund, holiday savings, or future purchase",
    });

    suggestions.push({
      type: "buffer",
      suggestedAmount: remainingSurplus,
      reason: "Keep as buffer in main account",
      impact: "Financial breathing room for unexpected expenses",
    });
  }

  return suggestions;
}

/**
 * Apply a surplus suggestion to get updated allocations
 */
export function applySurplusSuggestion(
  allocation: PaydayAllocation,
  suggestionIndex: number
): {
  regularAllocations: RegularAllocation[];
  surplusAllocations: { envelopeId: string; name: string; amount: number }[];
  remainingSurplus: number;
} {
  const suggestion = allocation.suggestions[suggestionIndex];

  if (!suggestion) {
    return {
      regularAllocations: allocation.regularAllocations,
      surplusAllocations: [],
      remainingSurplus: allocation.surplus,
    };
  }

  // If it's a top-up suggestion with specific envelope
  if (suggestion.type === "top-up" && suggestion.envelopeId) {
    return {
      regularAllocations: allocation.regularAllocations,
      surplusAllocations: [
        {
          envelopeId: suggestion.envelopeId,
          name: suggestion.envelopeName!,
          amount: suggestion.suggestedAmount,
        },
      ],
      remainingSurplus: allocation.surplus - suggestion.suggestedAmount,
    };
  }

  // If it's a split suggestion across multiple envelopes
  if (suggestion.type === "top-up" && !suggestion.envelopeId) {
    const behindEnvelopes = allocation.envelopeHealth.filter(
      (h) => h.gap > 0 && h.gapStatus === "behind"
    );
    const totalGap = behindEnvelopes.reduce((sum, h) => sum + h.gap, 0);

    const surplusAllocations = behindEnvelopes.map((health) => {
      const proportion = health.gap / totalGap;
      const amount = allocation.surplus * proportion;

      return {
        envelopeId: health.envelopeId,
        name: health.name,
        amount: Math.round(amount * 100) / 100,
      };
    });

    return {
      regularAllocations: allocation.regularAllocations,
      surplusAllocations,
      remainingSurplus: 0, // all surplus allocated
    };
  }

  // For buffer or new goal, no envelope allocation yet
  return {
    regularAllocations: allocation.regularAllocations,
    surplusAllocations: [],
    remainingSurplus: allocation.surplus,
  };
}

/**
 * Calculate initial distribution for startup wizard
 * "I have $X in my account, how should I distribute it?"
 */
export function calculateInitialDistribution(
  currentBalance: number,
  envelopes: Envelope[],
  payCycle: PayCycle
): {
  envelopeHealth: EnvelopeHealth[];
  totalNeeded: number;
  canFullyFund: boolean;
  allocations: { envelopeId: string; name: string; amount: number; percentOfNeeded: number }[];
  remainingBalance: number;
} {
  // Calculate health to see where each envelope should be
  const envelopeHealth = calculateAllEnvelopeHealth(envelopes, payCycle);

  // Calculate total needed to bring all envelopes to "should have saved" level
  const allocations = envelopeHealth.map((health) => {
    const neededAmount = Math.max(0, health.gap); // only positive gaps (behind)
    return {
      envelopeId: health.envelopeId,
      name: health.name,
      needed: neededAmount,
    };
  });

  const totalNeeded = allocations.reduce((sum, a) => sum + a.needed, 0);
  const canFullyFund = currentBalance >= totalNeeded;

  // If we can fully fund everything, do that
  if (canFullyFund) {
    return {
      envelopeHealth,
      totalNeeded,
      canFullyFund: true,
      allocations: allocations.map((a) => ({
        envelopeId: a.envelopeId,
        name: a.name,
        amount: a.needed,
        percentOfNeeded: 100,
      })),
      remainingBalance: currentBalance - totalNeeded,
    };
  }

  // If we can't fully fund, distribute proportionally
  const distributedAllocations = allocations.map((a) => {
    const proportion = totalNeeded > 0 ? a.needed / totalNeeded : 0;
    const amount = currentBalance * proportion;

    return {
      envelopeId: a.envelopeId,
      name: a.name,
      amount: Math.round(amount * 100) / 100,
      percentOfNeeded: a.needed > 0 ? (amount / a.needed) * 100 : 100,
    };
  });

  return {
    envelopeHealth,
    totalNeeded,
    canFullyFund: false,
    allocations: distributedAllocations,
    remainingBalance: 0, // all money allocated
  };
}
