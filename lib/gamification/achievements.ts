/**
 * Achievement/Badge System
 *
 * Culture Statement: Always empower, never shame.
 * - Celebrate progress, no matter how small
 * - Focus on forward movement and growth
 * - Use "next step" language, never guilt or pressure
 * - Acknowledge effort and momentum
 */

export type AchievementCategory =
  | 'getting_started'
  | 'mastery'
  | 'goals'
  | 'debt'
  | 'streaks'
  | 'community';

export interface Achievement {
  key: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  points: number;
  // Discord integration metadata
  discordEmoji?: string;
  discordRole?: string;
}

/**
 * All achievement definitions
 * Language: Positive, empowering, celebrating progress
 */
export const ACHIEVEMENTS: Record<string, Achievement> = {
  // ============================================
  // GETTING STARTED - First steps on the journey
  // ============================================
  onboarding_complete: {
    key: 'onboarding_complete',
    category: 'getting_started',
    title: 'Journey Begins',
    description: 'You\'ve completed setup! You\'re building strong money habits.',
    icon: '🎯',
    points: 10,
    discordEmoji: '🎯',
  },

  first_envelope: {
    key: 'first_envelope',
    category: 'getting_started',
    title: 'First Envelope',
    description: 'Great start! You\'ve created your first envelope.',
    icon: '📬',
    points: 10,
    discordEmoji: '📬',
  },

  first_transaction: {
    key: 'first_transaction',
    category: 'getting_started',
    title: 'Money Tracker',
    description: 'You\'re tracking your spending! This is how you build awareness.',
    icon: '💰',
    points: 10,
    discordEmoji: '💰',
  },

  first_reconciliation: {
    key: 'first_reconciliation',
    category: 'getting_started',
    title: 'Balance Master',
    description: 'You reconciled your first transaction! You\'re keeping everything in sync.',
    icon: '✅',
    points: 15,
    discordEmoji: '✅',
  },

  first_budget_complete: {
    key: 'first_budget_complete',
    category: 'getting_started',
    title: 'Budget Builder',
    description: 'You\'ve allocated 100% of your income! You\'re in control now.',
    icon: '📊',
    points: 20,
    discordEmoji: '📊',
  },

  bank_connected: {
    key: 'bank_connected',
    category: 'getting_started',
    title: 'All Connected',
    description: 'You linked your bank! Automation is your friend.',
    icon: '🔗',
    points: 15,
    discordEmoji: '🔗',
  },

  // ============================================
  // MASTERY - Growing skills and consistency
  // ============================================
  envelopes_5: {
    key: 'envelopes_5',
    category: 'mastery',
    title: 'Budget Organizer',
    description: 'You\'ve created 5 envelopes! You\'re organizing your money well.',
    icon: '🗂️',
    points: 15,
    discordEmoji: '🗂️',
  },

  envelopes_10: {
    key: 'envelopes_10',
    category: 'mastery',
    title: 'Budget Pro',
    description: 'You\'re managing 10+ envelopes! Your system is growing.',
    icon: '🎓',
    points: 25,
    discordEmoji: '🎓',
  },

  transactions_10: {
    key: 'transactions_10',
    category: 'mastery',
    title: 'Transaction Tracker',
    description: 'You\'ve tracked 10 transactions! Building great habits.',
    icon: '📈',
    points: 15,
    discordEmoji: '📈',
  },

  transactions_50: {
    key: 'transactions_50',
    category: 'mastery',
    title: 'Money Monitor',
    description: 'You\'ve tracked 50 transactions! You\'re building real momentum.',
    icon: '🔥',
    points: 30,
    discordEmoji: '🔥',
  },

  transactions_100: {
    key: 'transactions_100',
    category: 'mastery',
    title: 'Financial Expert',
    description: 'You\'ve tracked 100+ transactions! This is a powerful habit.',
    icon: '⭐',
    points: 50,
    discordEmoji: '⭐',
  },

  zero_budget_achieved: {
    key: 'zero_budget_achieved',
    category: 'mastery',
    title: 'Zero Budget Hero',
    description: 'You achieved a zero-based budget! Every dollar has a purpose.',
    icon: '🎯',
    points: 30,
    discordEmoji: '🎯',
  },

  // ============================================
  // GOALS - Progress on savings and aspirations
  // ============================================
  first_goal: {
    key: 'first_goal',
    category: 'goals',
    title: 'Dream Starter',
    description: 'You set your first goal! You\'re planning for your future.',
    icon: '🌟',
    points: 15,
    discordEmoji: '🌟',
  },

  goal_achieved: {
    key: 'goal_achieved',
    category: 'goals',
    title: 'Goal Getter',
    description: 'You achieved a goal! This is how dreams become reality.',
    icon: '🎉',
    points: 50,
    discordEmoji: '🎉',
  },

  milestone_achieved: {
    key: 'milestone_achieved',
    category: 'goals',
    title: 'Milestone Reached',
    description: 'You hit a milestone! You\'re making steady progress.',
    icon: '🏆',
    points: 25,
    discordEmoji: '🏆',
  },

  emergency_fund_started: {
    key: 'emergency_fund_started',
    category: 'goals',
    title: 'Safety Net Builder',
    description: 'You started an emergency fund! You\'re building security.',
    icon: '🛡️',
    points: 20,
    discordEmoji: '🛡️',
  },

  emergency_fund_complete: {
    key: 'emergency_fund_complete',
    category: 'goals',
    title: 'Financially Secure',
    description: 'You completed your emergency fund! You\'re protected now.',
    icon: '🛡️',
    points: 100,
    discordEmoji: '🛡️',
  },

  savings_1000: {
    key: 'savings_1000',
    category: 'goals',
    title: 'First $1,000',
    description: 'You saved $1,000! This is a major milestone.',
    icon: '💎',
    points: 75,
    discordEmoji: '💎',
  },

  // ============================================
  // DEBT - Celebrating debt freedom journey
  // ============================================
  debt_journey_started: {
    key: 'debt_journey_started',
    category: 'debt',
    title: 'Debt-Free Journey',
    description: 'You\'re taking control of your debt! You\'ve got this.',
    icon: '💪',
    points: 20,
    discordEmoji: '💪',
  },

  first_debt_payment: {
    key: 'first_debt_payment',
    category: 'debt',
    title: 'Progress Maker',
    description: 'You made a debt payment! Every payment gets you closer.',
    icon: '📉',
    points: 25,
    discordEmoji: '📉',
  },

  debt_paid_off: {
    key: 'debt_paid_off',
    category: 'debt',
    title: 'Debt Destroyer',
    description: 'You paid off a debt! This is a huge win!',
    icon: '🎊',
    points: 100,
    discordEmoji: '🎊',
  },

  all_debts_paid: {
    key: 'all_debts_paid',
    category: 'debt',
    title: 'Debt Free',
    description: 'You\'re completely debt free! You\'re unstoppable!',
    icon: '🏅',
    points: 200,
    discordEmoji: '🏅',
  },

  high_interest_tackled: {
    key: 'high_interest_tackled',
    category: 'debt',
    title: 'Smart Strategy',
    description: 'You prioritized high-interest debt! You\'re saving money on interest.',
    icon: '🧠',
    points: 50,
    discordEmoji: '🧠',
  },

  // ============================================
  // STREAKS - Consistency and momentum
  // ============================================
  week_streak: {
    key: 'week_streak',
    category: 'streaks',
    title: '7-Day Streak',
    description: 'You\'ve budgeted for a week straight! You\'re building consistency.',
    icon: '🔥',
    points: 20,
    discordEmoji: '🔥',
  },

  month_streak: {
    key: 'month_streak',
    category: 'streaks',
    title: '30-Day Champion',
    description: 'You\'ve maintained your budget for 30 days! This is a lifestyle now.',
    icon: '🌙',
    points: 50,
    discordEmoji: '🌙',
  },

  quarter_streak: {
    key: 'quarter_streak',
    category: 'streaks',
    title: '90-Day Warrior',
    description: 'You\'ve budgeted for 90 days! Your habits are rock solid.',
    icon: '💪',
    points: 100,
    discordEmoji: '💪',
  },

  year_streak: {
    key: 'year_streak',
    category: 'streaks',
    title: 'Year of Success',
    description: 'You\'ve budgeted for a full year! You\'re a budgeting master!',
    icon: '👑',
    points: 250,
    discordEmoji: '👑',
  },

  // ============================================
  // COMMUNITY - Engagement and sharing
  // ============================================
  discord_joined: {
    key: 'discord_joined',
    category: 'community',
    title: 'Community Member',
    description: 'You joined the community! You\'re not alone on this journey.',
    icon: '🤝',
    points: 15,
    discordEmoji: '🤝',
  },

  first_share: {
    key: 'first_share',
    category: 'community',
    title: 'Achievement Sharer',
    description: 'You shared your progress! Your success inspires others.',
    icon: '📣',
    points: 20,
    discordEmoji: '📣',
  },

  helper: {
    key: 'helper',
    category: 'community',
    title: 'Community Helper',
    description: 'You helped someone else! You\'re making a difference.',
    icon: '🌟',
    points: 30,
    discordEmoji: '🌟',
  },
};

/**
 * Get achievement by key
 */
export function getAchievement(key: string): Achievement | undefined {
  return ACHIEVEMENTS[key];
}

/**
 * Get all achievements for a category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
}

/**
 * Get total possible points
 */
export function getTotalPossiblePoints(): number {
  return Object.values(ACHIEVEMENTS).reduce((sum, achievement) => sum + achievement.points, 0);
}

/**
 * Calculate achievement tier based on points
 */
export function getAchievementTier(points: number): {
  tier: string;
  label: string;
  color: string;
  minPoints: number;
  maxPoints: number;
} {
  const tiers = [
    { tier: 'bronze', label: 'Getting Started', color: 'text-amber-700', minPoints: 0, maxPoints: 99 },
    { tier: 'silver', label: 'Building Momentum', color: 'text-gray-400', minPoints: 100, maxPoints: 299 },
    { tier: 'gold', label: 'Making Progress', color: 'text-yellow-500', minPoints: 300, maxPoints: 599 },
    { tier: 'platinum', label: 'Budget Master', color: 'text-blue-400', minPoints: 600, maxPoints: 999 },
    { tier: 'diamond', label: 'Financial Expert', color: 'text-cyan-400', minPoints: 1000, maxPoints: Infinity },
  ];

  return tiers.find(t => points >= t.minPoints && points <= t.maxPoints) || tiers[0];
}

/**
 * Get next achievement message (empowering language)
 */
export function getNextAchievementMessage(earnedKeys: string[]): string {
  const allKeys = Object.keys(ACHIEVEMENTS);
  const unearned = allKeys.filter(key => !earnedKeys.includes(key));

  if (unearned.length === 0) {
    return "You've earned all achievements! You're a budgeting legend!";
  }

  // Prioritize getting started achievements
  const nextGettingStarted = unearned.find(key => ACHIEVEMENTS[key].category === 'getting_started');
  if (nextGettingStarted) {
    return `Ready for your next win? ${ACHIEVEMENTS[nextGettingStarted].title} is waiting!`;
  }

  // Otherwise show any next achievement
  const next = ACHIEVEMENTS[unearned[0]];
  return `Keep going! ${next.title} is within reach.`;
}
