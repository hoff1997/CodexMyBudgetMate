/**
 * Celebration Readiness Calculator
 *
 * Calculates whether a celebration envelope is on track to have enough
 * funds for upcoming events based on:
 * - Current envelope balance
 * - Next celebration date and amount needed
 * - User's pay cycle (to calculate pays until due)
 */

import { getCyclesPerYear, type PayCycle } from './ideal-allocation-calculator';

export interface CelebrationEvent {
  recipientName: string;
  celebrationDate: string; // ISO date string
  giftAmount: number;
  partyAmount?: number;
}

export interface CelebrationReadiness {
  // Next upcoming event details
  nextEvent: {
    recipientName: string;
    date: Date;
    amountNeeded: number;
    daysUntil: number;
    paysUntil: number;
  } | null;

  // Readiness status
  status: 'on_track' | 'slightly_behind' | 'needs_attention' | 'no_events';

  // Financial details
  currentBalance: number;
  amountNeeded: number; // For next event
  shortfall: number; // Positive if behind, 0 or negative if on track
  perPayCatchUp: number; // Extra per pay needed to catch up (0 if on track)

  // Cumulative readiness (all events in next 12 months)
  annualTotal: number;
  steadyStatePerPay: number; // Ideal per-pay for all events
}

/**
 * Calculate the next occurrence of a celebration date
 * (handles annual recurring dates like birthdays)
 */
function getNextOccurrence(dateStr: string): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const celebrationDate = new Date(dateStr);
  celebrationDate.setFullYear(now.getFullYear());
  celebrationDate.setHours(0, 0, 0, 0);

  // If date has passed this year, use next year
  if (celebrationDate < now) {
    celebrationDate.setFullYear(now.getFullYear() + 1);
  }

  return celebrationDate;
}

/**
 * Calculate days until a date
 */
function calculateDaysUntil(targetDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate approximate number of pay cycles until a date
 */
function calculatePaysUntil(daysUntil: number, payCycle: PayCycle): number {
  let daysPerPay: number;

  switch (payCycle) {
    case 'weekly':
      daysPerPay = 7;
      break;
    case 'fortnightly':
      daysPerPay = 14;
      break;
    case 'twice_monthly':
      daysPerPay = 15.2; // ~365/24
      break;
    case 'monthly':
      daysPerPay = 30.42; // ~365/12
      break;
    default:
      daysPerPay = 14; // Default to fortnightly
  }

  return Math.max(0, Math.floor(daysUntil / daysPerPay));
}

/**
 * Calculate celebration readiness for an envelope
 *
 * @param currentBalance - Current amount in the envelope
 * @param events - Array of celebration events (recipients with dates and amounts)
 * @param payCycle - User's pay cycle frequency
 * @returns Readiness calculation with status and financial details
 */
export function calculateCelebrationReadiness(
  currentBalance: number,
  events: CelebrationEvent[],
  payCycle: PayCycle
): CelebrationReadiness {
  // Filter to events with valid dates and amounts
  const validEvents = events.filter(
    e => e.celebrationDate && (e.giftAmount > 0 || (e.partyAmount || 0) > 0)
  );

  if (validEvents.length === 0) {
    return {
      nextEvent: null,
      status: 'no_events',
      currentBalance,
      amountNeeded: 0,
      shortfall: 0,
      perPayCatchUp: 0,
      annualTotal: 0,
      steadyStatePerPay: 0,
    };
  }

  // Calculate next occurrence for each event and sort by date
  const eventsWithDates = validEvents.map(e => ({
    ...e,
    nextDate: getNextOccurrence(e.celebrationDate),
    totalAmount: e.giftAmount + (e.partyAmount || 0),
  })).sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

  // Get the next upcoming event
  const nextEvent = eventsWithDates[0];
  const daysUntil = calculateDaysUntil(nextEvent.nextDate);
  const paysUntil = calculatePaysUntil(daysUntil, payCycle);

  // Calculate how much we need for the next event
  // This is cumulative - we need enough for all events up to and including this one
  // But for simplicity, we'll focus on just the next event for the primary readiness check
  const amountNeeded = nextEvent.totalAmount;

  // Calculate shortfall (positive = behind, 0 or negative = on track or ahead)
  const shortfall = Math.max(0, amountNeeded - currentBalance);

  // Calculate per-pay catch-up needed
  const perPayCatchUp = paysUntil > 0 ? Math.ceil((shortfall / paysUntil) * 100) / 100 : shortfall;

  // Determine status
  let status: CelebrationReadiness['status'];

  if (shortfall <= 0) {
    // We have enough for the next event
    status = 'on_track';
  } else if (paysUntil === 0) {
    // Event is due now and we're short
    status = 'needs_attention';
  } else {
    // Calculate what percentage of ideal we're at
    const idealBalance = amountNeeded; // We should have the full amount by now if it's soon
    const percentageReady = currentBalance / idealBalance;

    if (percentageReady >= 0.8 || perPayCatchUp <= 10) {
      // Within 20% or catch-up is minimal
      status = 'slightly_behind';
    } else {
      status = 'needs_attention';
    }
  }

  // Calculate annual totals for steady-state allocation
  const annualTotal = eventsWithDates.reduce((sum, e) => sum + e.totalAmount, 0);
  const payCyclesPerYear = getCyclesPerYear(payCycle);
  const steadyStatePerPay = Math.round((annualTotal / payCyclesPerYear) * 100) / 100;

  return {
    nextEvent: {
      recipientName: nextEvent.recipientName,
      date: nextEvent.nextDate,
      amountNeeded: nextEvent.totalAmount,
      daysUntil,
      paysUntil,
    },
    status,
    currentBalance,
    amountNeeded,
    shortfall,
    perPayCatchUp,
    annualTotal,
    steadyStatePerPay,
  };
}

/**
 * Get a human-readable status message for celebration readiness
 */
export function getReadinessMessage(readiness: CelebrationReadiness): string {
  if (readiness.status === 'no_events') {
    return 'No upcoming events';
  }

  if (!readiness.nextEvent) {
    return 'No events scheduled';
  }

  const { recipientName, paysUntil, amountNeeded } = readiness.nextEvent;
  const { shortfall, perPayCatchUp, currentBalance } = readiness;

  if (readiness.status === 'on_track') {
    if (currentBalance >= amountNeeded * 1.1) {
      return `Ready for ${recipientName} with buffer`;
    }
    return `On track for ${recipientName}`;
  }

  if (readiness.status === 'slightly_behind') {
    if (paysUntil === 1) {
      return `Need $${shortfall.toFixed(0)} more for ${recipientName} (1 pay)`;
    }
    return `Need $${shortfall.toFixed(0)} more over ${paysUntil} pays`;
  }

  // needs_attention
  if (paysUntil === 0) {
    return `${recipientName} is due! Short by $${shortfall.toFixed(0)}`;
  }
  return `Behind for ${recipientName} - need $${perPayCatchUp.toFixed(0)}/pay extra`;
}

/**
 * Get status color class for celebration readiness
 */
export function getReadinessColorClass(status: CelebrationReadiness['status']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'on_track':
      return {
        bg: 'bg-sage-very-light',
        text: 'text-sage-dark',
        border: 'border-sage-light',
      };
    case 'slightly_behind':
      return {
        bg: 'bg-blue-light',
        text: 'text-blue',
        border: 'border-blue',
      };
    case 'needs_attention':
      return {
        bg: 'bg-gold-light',
        text: 'text-gold-dark',
        border: 'border-gold',
      };
    case 'no_events':
    default:
      return {
        bg: 'bg-muted/20',
        text: 'text-muted-foreground',
        border: 'border-border',
      };
  }
}

/**
 * Get status icon for celebration readiness
 */
export function getReadinessIcon(status: CelebrationReadiness['status']): string {
  switch (status) {
    case 'on_track':
      return '✓';
    case 'slightly_behind':
      return '→';
    case 'needs_attention':
      return '!';
    case 'no_events':
    default:
      return '−';
  }
}
