import type { GoalEnvelope, GoalProgress } from '@/lib/types/goals';
import { differenceInDays, differenceInMonths } from 'date-fns';

/**
 * Calculate progress and status for a savings goal
 */
export function calculateGoalProgress(goal: GoalEnvelope): GoalProgress {
  const currentAmount = Number(goal.current_amount ?? 0);
  const targetAmount = Number(goal.target_amount ?? 0);
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const percentComplete = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;

  let daysRemaining: number | null = null;
  let isOnTrack = true;
  let suggestedMonthlyContribution = 0;
  let status: GoalProgress['status'] = 'on_track';

  // Calculate days remaining if target date is set
  if (goal.goal_target_date) {
    const targetDate = new Date(goal.goal_target_date);
    const today = new Date();
    daysRemaining = differenceInDays(targetDate, today);

    if (daysRemaining > 0) {
      // Calculate suggested monthly contribution
      const monthsRemaining = Math.max(1, differenceInMonths(targetDate, today));
      suggestedMonthlyContribution = remainingAmount / monthsRemaining;

      // Determine if on track based on current pay cycle amount
      const currentMonthlyContribution = Number(goal.pay_cycle_amount ?? 0) * 4; // Approximate monthly

      if (percentComplete >= 100) {
        status = 'completed';
        isOnTrack = true;
      } else if (currentMonthlyContribution >= suggestedMonthlyContribution * 1.1) {
        status = 'ahead';
        isOnTrack = true;
      } else if (currentMonthlyContribution < suggestedMonthlyContribution * 0.9) {
        status = 'behind';
        isOnTrack = false;
      } else {
        status = 'on_track';
        isOnTrack = true;
      }
    } else {
      // Target date has passed
      if (percentComplete >= 100) {
        status = 'completed';
        isOnTrack = true;
      } else {
        status = 'behind';
        isOnTrack = false;
      }
    }
  } else {
    // No target date set, just check if completed
    if (percentComplete >= 100) {
      status = 'completed';
    }
  }

  return {
    currentAmount,
    targetAmount,
    percentComplete,
    remainingAmount,
    daysRemaining,
    isOnTrack,
    suggestedMonthlyContribution,
    status,
  };
}

/**
 * Format goal status for display
 */
export function getGoalStatusLabel(status: GoalProgress['status']): string {
  switch (status) {
    case 'ahead':
      return 'Ahead of Schedule';
    case 'on_track':
      return 'On Track';
    case 'behind':
      return 'Behind Schedule';
    case 'completed':
      return 'Completed';
    default:
      return 'In Progress';
  }
}

/**
 * Get color class for goal status
 */
export function getGoalStatusColor(status: GoalProgress['status']): string {
  switch (status) {
    case 'ahead':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'on_track':
      return 'text-sky-600 bg-sky-50 border-sky-200';
    case 'behind':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'completed':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Calculate "what if" completion date based on monthly contribution
 */
export function calculateCompletionDate(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number
): Date | null {
  if (monthlyContribution <= 0 || targetAmount <= currentAmount) {
    return null;
  }

  const remainingAmount = targetAmount - currentAmount;
  const monthsNeeded = Math.ceil(remainingAmount / monthlyContribution);

  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + monthsNeeded);

  return completionDate;
}

/**
 * Check if a milestone has been achieved
 */
export function isMilestoneAchieved(milestoneAmount: number, currentAmount: number): boolean {
  return currentAmount >= milestoneAmount;
}

/**
 * Get next unachieved milestone
 */
export function getNextMilestone(goal: GoalEnvelope): typeof goal.milestones[number] | null {
  if (!goal.milestones || goal.milestones.length === 0) {
    return null;
  }

  const currentAmount = Number(goal.current_amount ?? 0);

  return goal.milestones
    .filter((m) => !m.achieved_at && m.milestone_amount > currentAmount)
    .sort((a, b) => a.milestone_amount - b.milestone_amount)[0] || null;
}

/**
 * Calculate milestone progress percentage
 */
export function calculateMilestoneProgress(
  currentAmount: number,
  milestones: GoalEnvelope['milestones']
): number {
  if (!milestones || milestones.length === 0) {
    return 0;
  }

  const achievedCount = milestones.filter((m) =>
    m.achieved_at || currentAmount >= m.milestone_amount
  ).length;

  return (achievedCount / milestones.length) * 100;
}
