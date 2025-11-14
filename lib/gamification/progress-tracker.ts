/**
 * Progress Tracking System
 *
 * Tracks feature usage and automatically unlocks features based on user actions
 * User-paced progression - no time gates, unlock by doing
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type FeatureKey =
  | 'envelopes'
  | 'transactions'
  | 'goals'
  | 'debt_management'
  | 'reconciliation'
  | 'recurring_income'
  | 'analytics'
  | 'net_worth'
  | 'akahu_integration'
  | 'auto_allocation';

export interface FeatureConfig {
  key: FeatureKey;
  name: string;
  description: string;
  unlockCondition?: UnlockCondition;
  defaultUnlocked: boolean;
}

export interface UnlockCondition {
  type: 'envelope_count' | 'transaction_count' | 'goal_count' | 'manual';
  threshold?: number;
  message: string; // Empowering message when unlocked
}

/**
 * Feature configuration
 * Features unlock based on user actions, not time
 */
export const FEATURES: Record<FeatureKey, FeatureConfig> = {
  envelopes: {
    key: 'envelopes',
    name: 'Envelopes',
    description: 'Create and manage budget envelopes',
    defaultUnlocked: true,
  },

  transactions: {
    key: 'transactions',
    name: 'Transactions',
    description: 'Track your spending and income',
    defaultUnlocked: true,
  },

  goals: {
    key: 'goals',
    name: 'Goals',
    description: 'Set and track savings goals',
    unlockCondition: {
      type: 'envelope_count',
      threshold: 3,
      message: "You've unlocked Goals! You're ready to start saving for what matters.",
    },
    defaultUnlocked: false,
  },

  debt_management: {
    key: 'debt_management',
    name: 'Debt Management',
    description: 'Track and pay down debt',
    unlockCondition: {
      type: 'goal_count',
      threshold: 1,
      message: "You've unlocked Debt Management! Ready to tackle debt strategically?",
    },
    defaultUnlocked: false,
  },

  reconciliation: {
    key: 'reconciliation',
    name: 'Reconciliation',
    description: 'Match transactions with bank statements',
    unlockCondition: {
      type: 'transaction_count',
      threshold: 5,
      message: "You've unlocked Reconciliation! Let's keep everything in perfect sync.",
    },
    defaultUnlocked: false,
  },

  recurring_income: {
    key: 'recurring_income',
    name: 'Recurring Income',
    description: 'Set up automatic income allocation',
    unlockCondition: {
      type: 'envelope_count',
      threshold: 5,
      message: "You've unlocked Recurring Income! Automate your paycheck allocation.",
    },
    defaultUnlocked: false,
  },

  analytics: {
    key: 'analytics',
    name: 'Analytics',
    description: 'View spending trends and insights',
    unlockCondition: {
      type: 'transaction_count',
      threshold: 20,
      message: "You've unlocked Analytics! See your spending patterns and trends.",
    },
    defaultUnlocked: false,
  },

  net_worth: {
    key: 'net_worth',
    name: 'Net Worth',
    description: 'Track your total financial picture',
    unlockCondition: {
      type: 'transaction_count',
      threshold: 10,
      message: "You've unlocked Net Worth! Track your complete financial picture.",
    },
    defaultUnlocked: false,
  },

  akahu_integration: {
    key: 'akahu_integration',
    name: 'Bank Sync',
    description: 'Connect your NZ bank accounts',
    defaultUnlocked: true,
  },

  auto_allocation: {
    key: 'auto_allocation',
    name: 'Auto Allocation',
    description: 'Automatically allocate income',
    unlockCondition: {
      type: 'envelope_count',
      threshold: 5,
      message: "You've unlocked Auto Allocation! Let's automate your money flow.",
    },
    defaultUnlocked: false,
  },
};

/**
 * Check if a feature should be unlocked based on user data
 */
export async function checkFeatureUnlock(
  supabase: SupabaseClient,
  userId: string,
  featureKey: FeatureKey
): Promise<{ shouldUnlock: boolean; message?: string }> {
  const feature = FEATURES[featureKey];

  if (feature.defaultUnlocked || !feature.unlockCondition) {
    return { shouldUnlock: true };
  }

  const condition = feature.unlockCondition;

  switch (condition.type) {
    case 'envelope_count': {
      const { count } = await supabase
        .from('envelopes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count >= (condition.threshold || 0)) {
        return { shouldUnlock: true, message: condition.message };
      }
      break;
    }

    case 'transaction_count': {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count >= (condition.threshold || 0)) {
        return { shouldUnlock: true, message: condition.message };
      }
      break;
    }

    case 'goal_count': {
      const { count } = await supabase
        .from('envelopes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_goal', true);

      if (count && count >= (condition.threshold || 0)) {
        return { shouldUnlock: true, message: condition.message };
      }
      break;
    }

    case 'manual':
      // Feature requires manual unlock (e.g., admin action, payment, etc.)
      return { shouldUnlock: false };
  }

  return { shouldUnlock: false };
}

/**
 * Get next action recommendations based on user progress
 * Language: Empowering, positive, next-step focused
 */
export function getNextSteps(data: {
  envelopeCount: number;
  transactionCount: number;
  goalCount: number;
  hasRecurringIncome: boolean;
  hasBankConnected: boolean;
  lastActivity?: string;
}): Array<{ action: string; description: string; priority: 'high' | 'medium' | 'low' }> {
  const steps: Array<{ action: string; description: string; priority: 'high' | 'medium' | 'low' }> = [];

  // Getting started - high priority
  if (data.envelopeCount === 0) {
    steps.push({
      action: 'Create your first envelope',
      description: 'Start organizing your money into categories',
      priority: 'high',
    });
  }

  if (data.envelopeCount > 0 && data.envelopeCount < 3) {
    steps.push({
      action: 'Add more envelopes',
      description: 'Cover your main spending categories',
      priority: 'high',
    });
  }

  if (data.transactionCount === 0) {
    steps.push({
      action: 'Track your first transaction',
      description: 'Start building awareness of your spending',
      priority: 'high',
    });
  }

  // Building momentum - medium priority
  if (data.envelopeCount >= 3 && data.goalCount === 0) {
    steps.push({
      action: 'Set your first goal',
      description: 'What are you saving for? Let\'s make it happen!',
      priority: 'medium',
    });
  }

  if (data.transactionCount >= 5 && !data.hasRecurringIncome) {
    steps.push({
      action: 'Set up recurring income',
      description: 'Automate your paycheck allocation',
      priority: 'medium',
    });
  }

  if (!data.hasBankConnected) {
    steps.push({
      action: 'Connect your bank',
      description: 'Sync transactions automatically with Akahu',
      priority: 'medium',
    });
  }

  // Advancing - low priority
  if (data.transactionCount >= 10 && data.goalCount > 0) {
    steps.push({
      action: 'Check your progress',
      description: 'Review your goals and celebrate wins',
      priority: 'low',
    });
  }

  if (data.envelopeCount >= 5 && data.transactionCount >= 20) {
    steps.push({
      action: 'Explore analytics',
      description: 'See your spending patterns and trends',
      priority: 'low',
    });
  }

  return steps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Determine what achievement to check for based on user action
 */
export function getAchievementsToCheck(actionType: string, metadata?: any): string[] {
  const achievements: string[] = [];

  switch (actionType) {
    case 'onboarding_complete':
      achievements.push('onboarding_complete');
      break;

    case 'envelope_created':
      achievements.push('first_envelope');
      if (metadata?.envelopeCount === 5) achievements.push('envelopes_5');
      if (metadata?.envelopeCount === 10) achievements.push('envelopes_10');
      break;

    case 'transaction_created':
      achievements.push('first_transaction');
      if (metadata?.transactionCount === 10) achievements.push('transactions_10');
      if (metadata?.transactionCount === 50) achievements.push('transactions_50');
      if (metadata?.transactionCount === 100) achievements.push('transactions_100');
      break;

    case 'transaction_reconciled':
      achievements.push('first_reconciliation');
      break;

    case 'budget_completed':
      achievements.push('first_budget_complete', 'zero_budget_achieved');
      break;

    case 'bank_connected':
      achievements.push('bank_connected');
      break;

    case 'goal_created':
      achievements.push('first_goal');
      if (metadata?.goalType === 'emergency_fund') {
        achievements.push('emergency_fund_started');
      }
      break;

    case 'goal_achieved':
      achievements.push('goal_achieved');
      if (metadata?.goalType === 'emergency_fund') {
        achievements.push('emergency_fund_complete');
      }
      if (metadata?.amount >= 1000) {
        achievements.push('savings_1000');
      }
      break;

    case 'milestone_achieved':
      achievements.push('milestone_achieved');
      break;

    case 'debt_created':
      achievements.push('debt_journey_started');
      break;

    case 'debt_payment':
      achievements.push('first_debt_payment');
      if (metadata?.isHighInterest) {
        achievements.push('high_interest_tackled');
      }
      break;

    case 'debt_paid_off':
      achievements.push('debt_paid_off');
      if (metadata?.allDebtsPaid) {
        achievements.push('all_debts_paid');
      }
      break;

    case 'discord_joined':
      achievements.push('discord_joined');
      break;

    case 'achievement_shared':
      achievements.push('first_share');
      break;
  }

  return achievements;
}
