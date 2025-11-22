/**
 * Utility functions to convert between old EnvelopeData format and new UnifiedEnvelopeData format
 */

import type { UnifiedEnvelopeData, EnvelopeSubtype } from '@/lib/types/unified-envelope';

// Old format from onboarding (to be deprecated)
export interface LegacyEnvelopeData {
  id: string;
  name: string;
  icon: string;
  type: "bill" | "spending" | "savings";
  billAmount?: number;
  frequency?: "monthly" | "quarterly" | "annual" | "custom";
  dueDate?: number;
  priority?: "essential" | "important" | "discretionary";
  monthlyBudget?: number;
  savingsAmount?: number;
  goalType?: "savings" | "emergency_fund" | "purchase" | "other";
  targetDate?: Date;
  payCycleAmount?: number;
}

/**
 * Convert legacy EnvelopeData to UnifiedEnvelopeData
 */
export function convertLegacyToUnified(legacy: LegacyEnvelopeData): UnifiedEnvelopeData {
  const subtype: EnvelopeSubtype = legacy.type as EnvelopeSubtype;

  // Determine target amount based on type
  let targetAmount = 0;
  if (legacy.type === 'bill') {
    targetAmount = legacy.billAmount || 0;
  } else if (legacy.type === 'spending') {
    targetAmount = legacy.monthlyBudget || 0;
  } else if (legacy.type === 'savings') {
    targetAmount = legacy.savingsAmount || 0;
  }

  // Map frequency
  let frequency: any = legacy.frequency || 'monthly';
  if (frequency === 'annual') {
    frequency = 'annually';
  }

  return {
    id: legacy.id,
    name: legacy.name,
    icon: legacy.icon,
    subtype,
    targetAmount,
    frequency: legacy.type === 'bill' ? frequency : undefined,
    dueDate: legacy.type === 'bill' ? legacy.dueDate : legacy.targetDate,
    priority: legacy.priority,
    incomeAllocations: {}, // Will be populated separately
    payCycleAmount: legacy.payCycleAmount || targetAmount,
  };
}

/**
 * Convert UnifiedEnvelopeData to legacy EnvelopeData
 */
export function convertUnifiedToLegacy(unified: UnifiedEnvelopeData): LegacyEnvelopeData {
  const type = unified.subtype === 'goal' ? 'savings' : unified.subtype;

  const legacy: LegacyEnvelopeData = {
    id: unified.id,
    name: unified.name,
    icon: unified.icon,
    type: type as "bill" | "spending" | "savings",
    payCycleAmount: unified.payCycleAmount,
  };

  // Type-specific fields
  if (unified.subtype === 'bill') {
    legacy.billAmount = unified.targetAmount;
    legacy.frequency = unified.frequency as any;
    legacy.dueDate = typeof unified.dueDate === 'number' ? unified.dueDate : undefined;
    legacy.priority = unified.priority;
  } else if (unified.subtype === 'spending') {
    legacy.monthlyBudget = unified.targetAmount;
    legacy.priority = unified.priority;
  } else if (unified.subtype === 'savings' || unified.subtype === 'goal') {
    legacy.savingsAmount = unified.targetAmount;
    legacy.targetDate = unified.dueDate instanceof Date ? unified.dueDate : undefined;
    legacy.goalType = 'savings';
  }

  return legacy;
}

/**
 * Calculate pay cycle amount from annual based on frequency
 */
export function calculatePayCycleAmount(
  annualAmount: number,
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
): number {
  const multiplier = payCycle === 'weekly' ? 52 : payCycle === 'fortnightly' ? 26 : 12;
  return annualAmount / multiplier;
}

/**
 * Calculate annual amount from pay cycle based on frequency
 */
export function calculateAnnualAmount(
  payCycleAmount: number,
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
): number {
  const multiplier = payCycle === 'weekly' ? 52 : payCycle === 'fortnightly' ? 26 : 12;
  return payCycleAmount * multiplier;
}
