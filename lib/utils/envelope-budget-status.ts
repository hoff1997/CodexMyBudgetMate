/**
 * Envelope Budget Status Utilities
 *
 * Functions to determine if envelopes need budget allocation
 * and calculate unbudgeted envelope statistics
 */

export interface EnvelopeBudgetStatus {
  id: string;
  name: string;
  needsBudget: boolean;
  reason?: 'no_budget' | 'has_budget' | 'tracking_only' | 'spending' | 'goal';
  payCycleAmount: number;
}

/**
 * Determines if an envelope needs budget allocation
 *
 * An envelope needs budget if:
 * - It's not tracking-only (e.g., reimbursements)
 * - It's not a spending envelope
 * - It's not a goal envelope
 * - AND it has no pay_cycle_amount allocated
 */
export function envelopeNeedsBudget(envelope: {
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
  payCycleAmount?: number | null; // Support both naming conventions
}): boolean {
  // Tracking-only envelopes don't need budget
  if (envelope.is_tracking_only) {
    return false;
  }

  // Spending envelopes don't need budget (they track spending only)
  if (envelope.is_spending) {
    return false;
  }

  // Goal envelopes don't need pay cycle budget (they're optional)
  if (envelope.is_goal) {
    return false;
  }

  // Check both naming conventions for pay_cycle_amount
  const amount = envelope.pay_cycle_amount ?? envelope.payCycleAmount ?? 0;

  // Regular envelopes need budget if pay_cycle_amount is 0 or null
  return amount === 0;
}

/**
 * Gets the reason why an envelope doesn't need budget (or does)
 */
export function getEnvelopeBudgetReason(envelope: {
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
  payCycleAmount?: number | null;
}): 'no_budget' | 'has_budget' | 'tracking_only' | 'spending' | 'goal' {
  if (envelope.is_tracking_only) {
    return 'tracking_only';
  }

  if (envelope.is_spending) {
    return 'spending';
  }

  if (envelope.is_goal) {
    return 'goal';
  }

  const amount = envelope.pay_cycle_amount ?? envelope.payCycleAmount ?? 0;
  return amount > 0 ? 'has_budget' : 'no_budget';
}

/**
 * Filters envelopes to only those that need budget
 */
export function getUnbudgetedEnvelopes<T extends {
  id: string;
  name: string;
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
  payCycleAmount?: number | null;
}>(envelopes: T[]): T[] {
  return envelopes.filter(env => envelopeNeedsBudget(env));
}

/**
 * Gets budget status for all envelopes
 */
export function getEnvelopesBudgetStatus<T extends {
  id: string;
  name: string;
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
  payCycleAmount?: number | null;
}>(envelopes: T[]): EnvelopeBudgetStatus[] {
  return envelopes.map(env => ({
    id: env.id,
    name: env.name,
    needsBudget: envelopeNeedsBudget(env),
    reason: getEnvelopeBudgetReason(env),
    payCycleAmount: env.pay_cycle_amount ?? env.payCycleAmount ?? 0,
  }));
}

/**
 * Gets count of unbudgeted envelopes
 */
export function getUnbudgetedCount<T extends {
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
  payCycleAmount?: number | null;
}>(envelopes: T[]): number {
  return envelopes.filter(env => envelopeNeedsBudget(env)).length;
}

/**
 * Checks if user has any unbudgeted envelopes
 */
export function hasUnbudgetedEnvelopes<T extends {
  is_tracking_only?: boolean;
  is_spending?: boolean;
  is_goal?: boolean;
  pay_cycle_amount?: number | null;
  payCycleAmount?: number | null;
}>(envelopes: T[]): boolean {
  return envelopes.some(env => envelopeNeedsBudget(env));
}
