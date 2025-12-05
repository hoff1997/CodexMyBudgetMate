/**
 * Analytics Event Tracking Module
 *
 * This module provides a centralized interface for tracking user events.
 * Currently logs to console for development, but can be easily extended to:
 * - Google Analytics
 * - PostHog
 * - Mixpanel
 * - Custom analytics endpoints
 */

export type BudgetEventName =
  | 'surplus_allocated'
  | 'pay_cycle_changed'
  | 'budget_balanced'
  | 'budget_overspent'
  | 'envelope_created'
  | 'envelope_updated'
  | 'envelope_deleted'
  | 'allocation_updated'
  | 'validation_warning_shown'
  | 'validation_dialog_dismissed'
  | 'credit_card_configured'
  | 'payment_strategy_changed'
  | 'interest_applied'
  | 'debt_payment_made'
  | 'debt_payoff_completed';

export interface BudgetEvent {
  name: BudgetEventName;
  properties?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Track a budget-related event
 */
export function trackBudgetEvent(
  eventName: BudgetEventName,
  properties?: Record<string, any>
): void {
  const event: BudgetEvent = {
    name: eventName,
    properties,
    timestamp: new Date(),
  };

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event.name, event.properties);
  }

  // TODO: Add actual analytics provider integrations here
  // Example integrations:
  //
  // Google Analytics:
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('event', eventName, properties);
  // }
  //
  // PostHog:
  // if (typeof window !== 'undefined' && window.posthog) {
  //   window.posthog.capture(eventName, properties);
  // }
  //
  // Custom endpoint:
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(event),
  // });
}

/**
 * Track surplus allocation event
 */
export function trackSurplusAllocation(data: {
  amount: number;
  incomeSourceCount: number;
  context: 'budget_manager' | 'onboarding';
}): void {
  trackBudgetEvent('surplus_allocated', data);
}

/**
 * Track pay cycle change event
 */
export function trackPayCycleChange(data: {
  from: string;
  to: string;
  envelopeCount: number;
  totalAllocated: number;
}): void {
  trackBudgetEvent('pay_cycle_changed', data);
}

/**
 * Track budget status event
 */
export function trackBudgetStatus(data: {
  status: 'balanced' | 'surplus' | 'overspent';
  difference: number;
  totalIncome: number;
  totalAllocated: number;
}): void {
  if (data.status === 'balanced') {
    trackBudgetEvent('budget_balanced', data);
  } else if (data.status === 'overspent') {
    trackBudgetEvent('budget_overspent', data);
  }
}

/**
 * Track envelope operations
 */
export function trackEnvelopeOperation(
  operation: 'created' | 'updated' | 'deleted',
  data: {
    envelopeId?: string;
    envelopeType?: string;
    isSystemEnvelope?: boolean;
  }
): void {
  const eventMap = {
    created: 'envelope_created' as const,
    updated: 'envelope_updated' as const,
    deleted: 'envelope_deleted' as const,
  };

  trackBudgetEvent(eventMap[operation], data);
}

/**
 * Track allocation updates
 */
export function trackAllocationUpdate(data: {
  envelopeId: string;
  incomeSourceId: string;
  amount: number;
  previousAmount?: number;
}): void {
  trackBudgetEvent('allocation_updated', {
    ...data,
    change: data.previousAmount !== undefined ? data.amount - data.previousAmount : undefined,
  });
}

/**
 * Track validation warnings
 */
export function trackValidationWarning(data: {
  type: 'overspent' | 'surplus' | 'navigation';
  action: 'shown' | 'dismissed' | 'confirmed';
  amount?: number;
}): void {
  if (data.action === 'shown') {
    trackBudgetEvent('validation_warning_shown', data);
  } else if (data.action === 'dismissed') {
    trackBudgetEvent('validation_dialog_dismissed', data);
  }
}

/**
 * Track credit card configuration
 */
export function trackCreditCardConfiguration(data: {
  accountId: string;
  apr: number;
  paymentStrategy: string;
  hasMinimumPayment: boolean;
  hasCreditLimit: boolean;
}): void {
  trackBudgetEvent('credit_card_configured', data);
}

/**
 * Track payment strategy changes
 */
export function trackPaymentStrategyChange(data: {
  accountId: string;
  from: string;
  to: string;
  projectedPayoffMonths?: number | null;
}): void {
  trackBudgetEvent('payment_strategy_changed', data);
}

/**
 * Track interest application
 */
export function trackInterestApplied(data: {
  accountId: string;
  interestAmount: number;
  apr: number;
  newBalance: number;
}): void {
  trackBudgetEvent('interest_applied', data);
}

/**
 * Track debt payment
 */
export function trackDebtPayment(data: {
  accountId: string;
  paymentAmount: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}): void {
  trackBudgetEvent('debt_payment_made', data);
}

/**
 * Track debt payoff completion
 */
export function trackDebtPayoffCompleted(data: {
  accountId: string;
  totalPaid: number;
  totalInterestPaid: number;
  monthsTaken: number;
  strategy: string;
}): void {
  trackBudgetEvent('debt_payoff_completed', data);
}
