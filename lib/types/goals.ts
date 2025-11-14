import type { EnvelopeRow, GoalMilestone, GoalType } from '@/lib/auth/types';

export interface GoalEnvelope extends EnvelopeRow {
  is_goal: true;
  goal_type: GoalType;
  milestones?: GoalMilestone[];
  category_name?: string | null;
}

export interface GoalProgress {
  currentAmount: number;
  targetAmount: number;
  percentComplete: number;
  remainingAmount: number;
  daysRemaining: number | null;
  isOnTrack: boolean;
  suggestedMonthlyContribution: number;
  status: 'ahead' | 'on_track' | 'behind' | 'completed';
}

export interface GoalFormData {
  name: string;
  icon: string;
  goalType: GoalType;
  targetAmount: number;
  targetDate: string | null;
  categoryId: string | null;
  frequency: string;
  payCycleAmount: number;
  openingBalance: number;
  notes: string;
  interestRate?: number; // For debt payoff goals
  milestones: MilestoneFormData[];
}

export interface MilestoneFormData {
  name: string;
  amount: number;
  date: string | null;
  notes: string;
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  savings: 'General Savings',
  debt_payoff: 'Debt Payoff',
  purchase: 'Purchase',
  emergency_fund: 'Emergency Fund',
  other: 'Other',
};

export const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  savings: '💰',
  debt_payoff: '💳',
  purchase: '🎁',
  emergency_fund: '🛡️',
  other: '🎯',
};

export const GOAL_ICONS = [
  '🎯', // Target
  '💎', // Luxury
  '🏆', // Achievement
  '🎁', // Purchase
  '🏝️', // Vacation
  '🚀', // Aspirational
  '💍', // Wedding/Ring
  '🏡', // House
  '🎓', // Education
  '🚗', // Car
  '💰', // Money
  '🏖️', // Beach/Travel
  '📱', // Electronics
  '💻', // Computer
  '🎸', // Hobby
  '🏋️', // Fitness
  '🎨', // Creative
  '📚', // Books/Learning
  '🌟', // Dreams
  '⭐', // Star
];
