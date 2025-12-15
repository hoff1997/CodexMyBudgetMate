/**
 * Smart Fill Calculator
 *
 * Calculates optimal distribution of surplus funds to underfunded envelopes.
 * Prioritizes by envelope priority (Essential > Important > Flexible).
 */

import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";

export type Priority = "essential" | "important" | "flexible";

export interface SmartFillSource {
  envelopeId: string;
  name: string;
  icon?: string;
  surplus: number;
  currentAmount: number;
  targetAmount: number;
  selected: boolean;
  subtype?: string | null;
}

export interface SmartFillDestination {
  envelopeId: string;
  name: string;
  icon?: string;
  shortfall: number;
  currentAmount: number;
  targetAmount: number;
  priority: 1 | 2 | 3; // 1=Essential, 2=Important, 3=Flexible
  priorityLabel: Priority;
  fillAmount: number;
  remaining: number;
  percentage: number;
  isFullyCovered: boolean;
}

export interface SmartFillTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface SmartFillCalculation {
  sources: SmartFillSource[];
  destinations: SmartFillDestination[];
  totalAvailable: number;
  totalNeeded: number;
  totalFilling: number;
  transfers: SmartFillTransfer[];
  summary: {
    fullyCovered: number;
    partiallyCovered: number;
    notCovered: number;
  };
}

/**
 * Map priority string to number for sorting (1=Essential=highest priority)
 */
function mapPriorityToNumber(priority?: string | null): 1 | 2 | 3 {
  const p = (priority ?? "").toLowerCase();
  if (p === "essential" || p === "1") return 1;
  if (p === "important" || p === "2") return 2;
  return 3; // flexible or unset
}

/**
 * Map priority number to label
 */
function mapNumberToPriority(num: 1 | 2 | 3): Priority {
  if (num === 1) return "essential";
  if (num === 2) return "important";
  return "flexible";
}

/**
 * Calculate smart fill distribution
 *
 * @param envelopes All user envelopes
 * @param selectedSourceIds IDs of sources selected by user (or all surplus by default)
 * @param customFillAmounts Optional map of envelope ID to custom fill amount
 */
export function calculateSmartFill(
  envelopes: SummaryEnvelope[],
  selectedSourceIds?: string[],
  customFillAmounts?: Map<string, number>
): SmartFillCalculation {
  // 1. Find surplus envelopes (balance > target)
  const sources: SmartFillSource[] = envelopes
    .filter((e) => {
      const current = Number(e.current_amount ?? 0);
      const target = Number(e.target_amount ?? 0);
      return target > 0 && current > target;
    })
    .map((e) => {
      const current = Number(e.current_amount ?? 0);
      const target = Number(e.target_amount ?? 0);
      const surplus = current - target;

      // By default, exclude savings and goals from auto-select
      const isProtected =
        e.is_goal ||
        (e as any).subtype === "savings" ||
        (e as any).subtype === "goal" ||
        e.name?.toLowerCase().includes("emergency");

      return {
        envelopeId: e.id,
        name: e.name,
        icon: e.icon ?? undefined,
        surplus,
        currentAmount: current,
        targetAmount: target,
        // Pre-select non-protected surpluses
        selected: selectedSourceIds
          ? selectedSourceIds.includes(e.id)
          : !isProtected,
        subtype: (e as any).subtype ?? null,
      };
    })
    // Sort by surplus amount (smallest first for fairer distribution)
    .sort((a, b) => a.surplus - b.surplus);

  // 2. Find shortfall envelopes (balance < target), sorted by priority
  const destinations: SmartFillDestination[] = envelopes
    .filter((e) => {
      const current = Number(e.current_amount ?? 0);
      const target = Number(e.target_amount ?? 0);
      // Exclude tracking-only and spending envelopes from destinations
      if (e.is_tracking_only || e.is_spending) return false;
      return target > 0 && current < target;
    })
    .map((e) => {
      const current = Number(e.current_amount ?? 0);
      const target = Number(e.target_amount ?? 0);
      const shortfall = target - current;
      const priority = mapPriorityToNumber((e as any).priority);

      return {
        envelopeId: e.id,
        name: e.name,
        icon: e.icon ?? undefined,
        shortfall,
        currentAmount: current,
        targetAmount: target,
        priority,
        priorityLabel: mapNumberToPriority(priority),
        fillAmount: 0,
        remaining: shortfall,
        percentage: target > 0 ? (current / target) * 100 : 0,
        isFullyCovered: false,
      };
    })
    // Sort by priority (1=Essential first), then by shortfall (smallest first)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.shortfall - b.shortfall; // Smaller shortfalls first within priority
    });

  // 3. Calculate total available from selected sources
  const totalAvailable = sources
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + s.surplus, 0);

  const totalNeeded = destinations.reduce((sum, d) => sum + d.shortfall, 0);

  // 4. Distribute funds by priority order
  let remainingFunds = totalAvailable;

  for (const dest of destinations) {
    if (remainingFunds <= 0) break;

    // Check for custom fill amount
    const customAmount = customFillAmounts?.get(dest.envelopeId);

    if (customAmount !== undefined) {
      // Use custom amount, but don't exceed what's needed or available
      const fillAmount = Math.min(customAmount, dest.shortfall, remainingFunds);
      dest.fillAmount = fillAmount;
      dest.remaining = dest.shortfall - fillAmount;
      dest.isFullyCovered = dest.remaining <= 0.01;
      remainingFunds -= fillAmount;
    } else {
      // Auto-distribute: fill as much as possible
      const fillAmount = Math.min(remainingFunds, dest.shortfall);
      dest.fillAmount = fillAmount;
      dest.remaining = dest.shortfall - fillAmount;
      dest.isFullyCovered = dest.remaining <= 0.01;
      remainingFunds -= fillAmount;
    }
  }

  // 5. Calculate total being filled
  const totalFilling = destinations.reduce((sum, d) => sum + d.fillAmount, 0);

  // 6. Generate transfer list
  const transfers = generateTransferList(sources, destinations);

  // 7. Calculate summary
  const summary = {
    fullyCovered: destinations.filter((d) => d.isFullyCovered).length,
    partiallyCovered: destinations.filter(
      (d) => d.fillAmount > 0 && !d.isFullyCovered
    ).length,
    notCovered: destinations.filter((d) => d.fillAmount === 0).length,
  };

  return {
    sources,
    destinations,
    totalAvailable,
    totalNeeded,
    totalFilling,
    transfers,
    summary,
  };
}

/**
 * Generate list of individual transfers from sources to destinations
 */
function generateTransferList(
  sources: SmartFillSource[],
  destinations: SmartFillDestination[]
): SmartFillTransfer[] {
  const transfers: SmartFillTransfer[] = [];
  const selectedSources = sources.filter((s) => s.selected);

  // Track remaining to move from each source
  const sourceRemaining = new Map<string, number>();
  selectedSources.forEach((s) => sourceRemaining.set(s.envelopeId, s.surplus));

  // For each destination that needs filling
  for (const dest of destinations) {
    if (dest.fillAmount <= 0) continue;

    let amountNeeded = dest.fillAmount;

    // Take from sources in order until filled
    for (const source of selectedSources) {
      if (amountNeeded <= 0) break;

      const available = sourceRemaining.get(source.envelopeId) ?? 0;
      if (available <= 0) continue;

      const transferAmount = Math.min(available, amountNeeded);

      transfers.push({
        fromId: source.envelopeId,
        fromName: source.name,
        toId: dest.envelopeId,
        toName: dest.name,
        amount: Math.round(transferAmount * 100) / 100, // Round to 2 decimals
      });

      sourceRemaining.set(
        source.envelopeId,
        available - transferAmount
      );
      amountNeeded -= transferAmount;
    }
  }

  return transfers;
}

/**
 * Update calculation with new source selection
 */
export function updateSourceSelection(
  calculation: SmartFillCalculation,
  envelopeId: string,
  selected: boolean
): SmartFillCalculation {
  const newSelectedIds = calculation.sources
    .map((s) => (s.envelopeId === envelopeId ? { ...s, selected } : s))
    .filter((s) => s.selected)
    .map((s) => s.envelopeId);

  // Get original envelopes from sources and destinations
  // This is a simplified recalculation - in practice you'd pass original envelopes
  const updatedSources = calculation.sources.map((s) =>
    s.envelopeId === envelopeId ? { ...s, selected } : s
  );

  const totalAvailable = updatedSources
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + s.surplus, 0);

  // Redistribute to destinations
  let remainingFunds = totalAvailable;
  const updatedDestinations = calculation.destinations.map((d) => {
    if (remainingFunds <= 0) {
      return { ...d, fillAmount: 0, remaining: d.shortfall, isFullyCovered: false };
    }
    const fillAmount = Math.min(remainingFunds, d.shortfall);
    remainingFunds -= fillAmount;
    return {
      ...d,
      fillAmount,
      remaining: d.shortfall - fillAmount,
      isFullyCovered: d.shortfall - fillAmount <= 0.01,
    };
  });

  const totalFilling = updatedDestinations.reduce(
    (sum, d) => sum + d.fillAmount,
    0
  );

  const transfers = generateTransferList(updatedSources, updatedDestinations);

  return {
    ...calculation,
    sources: updatedSources,
    destinations: updatedDestinations,
    totalAvailable,
    totalFilling,
    transfers,
    summary: {
      fullyCovered: updatedDestinations.filter((d) => d.isFullyCovered).length,
      partiallyCovered: updatedDestinations.filter(
        (d) => d.fillAmount > 0 && !d.isFullyCovered
      ).length,
      notCovered: updatedDestinations.filter((d) => d.fillAmount === 0).length,
    },
  };
}

/**
 * Update a specific destination's fill amount
 */
export function updateDestinationFillAmount(
  calculation: SmartFillCalculation,
  envelopeId: string,
  newAmount: number
): SmartFillCalculation {
  const customFillAmounts = new Map<string, number>();

  // Preserve existing custom amounts
  calculation.destinations.forEach((d) => {
    if (d.envelopeId === envelopeId) {
      customFillAmounts.set(d.envelopeId, Math.max(0, Math.min(newAmount, d.shortfall)));
    } else if (d.fillAmount > 0) {
      customFillAmounts.set(d.envelopeId, d.fillAmount);
    }
  });

  // Need to recalculate with custom amounts
  // This is simplified - in practice you'd pass original envelopes
  const updatedDestinations = calculation.destinations.map((d) => {
    if (d.envelopeId === envelopeId) {
      const fillAmount = Math.max(0, Math.min(newAmount, d.shortfall));
      return {
        ...d,
        fillAmount,
        remaining: d.shortfall - fillAmount,
        isFullyCovered: d.shortfall - fillAmount <= 0.01,
      };
    }
    return d;
  });

  const totalFilling = updatedDestinations.reduce(
    (sum, d) => sum + d.fillAmount,
    0
  );

  // Validate total doesn't exceed available
  if (totalFilling > calculation.totalAvailable) {
    // Scale down proportionally or reject
    // For now, just return unchanged
    return calculation;
  }

  const transfers = generateTransferList(calculation.sources, updatedDestinations);

  return {
    ...calculation,
    destinations: updatedDestinations,
    totalFilling,
    transfers,
    summary: {
      fullyCovered: updatedDestinations.filter((d) => d.isFullyCovered).length,
      partiallyCovered: updatedDestinations.filter(
        (d) => d.fillAmount > 0 && !d.isFullyCovered
      ).length,
      notCovered: updatedDestinations.filter((d) => d.fillAmount === 0).length,
    },
  };
}

/**
 * Format currency for display
 */
export function formatSmartFillCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
