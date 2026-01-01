/**
 * Milestone Detector Utility
 *
 * Detects when users complete financial milestones based on "The My Budget Way":
 * 1. Starter Stash ($500-$1000 emergency buffer)
 * 2. High-interest debt payoff
 * 3. Safety Net (3-6 months expenses)
 * 4. Long-term goals
 *
 * Key principles:
 * - Milestones should feel achievable, not overwhelming
 * - Celebrate progress, not perfection
 * - Use Remy's encouraging voice
 */

// ============================================
// TYPES
// ============================================

// Database envelope type (snake_case as returned by Supabase)
interface DatabaseEnvelope {
  id: string;
  name: string;
  subtype?: string;
  priority?: string;
  target_amount?: number | null;
  current_amount?: number | null;
}

export type MilestoneKey =
  | "starter_stash_complete"
  | "first_bill_funded"
  | "emergency_fund_25"
  | "emergency_fund_50"
  | "emergency_fund_75"
  | "emergency_fund_complete"
  | "debt_free"
  | "first_savings_goal"
  | "all_bills_funded"
  | "budget_surplus";

export interface Milestone {
  key: MilestoneKey;
  title: string;
  description: string;
  remyMessage: string;
  icon: string;
  confettiColors?: string[];
  priority: number; // Lower = higher priority (show first)
}

export interface DetectedMilestone extends Milestone {
  detectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EnvelopeAnalysis {
  starterStashBalance: number;
  starterStashTarget: number;
  emergencyFundBalance: number;
  emergencyFundTarget: number;
  emergencyFundPercent: number;
  totalDebt: number;
  debtEnvelopes: DatabaseEnvelope[];
  fundedBillsCount: number;
  totalBillsCount: number;
  fundedBillsPercent: number;
  savingsGoalsCount: number;
  hasBudgetSurplus: boolean;
  totalSurplus: number;
}

// ============================================
// MILESTONE DEFINITIONS
// ============================================

export const MILESTONES: Record<MilestoneKey, Milestone> = {
  starter_stash_complete: {
    key: "starter_stash_complete",
    title: "Starter Stash Complete! 🎉",
    description: "You've built your $1,000 emergency buffer",
    remyMessage:
      "Legend! You've got your Starter Stash sorted. That's your first line of defence against life's little surprises. No more stress when the car needs a warrant or the fridge gives up!",
    icon: "🛡️",
    confettiColors: ["#7A9E9A", "#B8D4D0", "#D4A853"],
    priority: 1,
  },
  first_bill_funded: {
    key: "first_bill_funded",
    title: "First Bill Funded! 💪",
    description: "Your first bill is fully funded ahead of time",
    remyMessage:
      "Sweet as! Your first bill is fully funded before it's due. That's the My Budget Way - no more scrambling when bills arrive. They're just... handled.",
    icon: "📋",
    confettiColors: ["#7A9E9A", "#B8D4D0"],
    priority: 2,
  },
  all_bills_funded: {
    key: "all_bills_funded",
    title: "All Bills Funded! 🏆",
    description: "Every single bill is funded ahead of time",
    remyMessage:
      "You absolute legend! Every bill is funded before it's due. Bills arriving in your inbox? No worries. They're already sorted. That's true peace of mind, mate.",
    icon: "✅",
    confettiColors: ["#7A9E9A", "#B8D4D0", "#D4A853", "#FFD700"],
    priority: 3,
  },
  debt_free: {
    key: "debt_free",
    title: "Debt Free! 🎊",
    description: "You've paid off all your tracked debt",
    remyMessage:
      "YOU DID IT! No more debt hanging over your head. Every dollar you earn is truly yours now. Time to redirect those debt payments to building your future. Stoked for you!",
    icon: "🆓",
    confettiColors: ["#D4A853", "#FFD700", "#7A9E9A"],
    priority: 4,
  },
  emergency_fund_25: {
    key: "emergency_fund_25",
    title: "25% to Safety Net! 📈",
    description: "Quarter of the way to your emergency fund goal",
    remyMessage:
      "Nice progress! You're 25% of the way to your Safety Net. That's real security building up. Keep at it - every dollar counts.",
    icon: "📊",
    confettiColors: ["#7A9E9A"],
    priority: 5,
  },
  emergency_fund_50: {
    key: "emergency_fund_50",
    title: "50% to Safety Net! 🎯",
    description: "Halfway to your emergency fund goal",
    remyMessage:
      "Halfway there! Your Safety Net is really taking shape. If something unexpected happens, you've got options now. That's a massive shift from living paycheck to paycheck.",
    icon: "⭐",
    confettiColors: ["#7A9E9A", "#D4A853"],
    priority: 6,
  },
  emergency_fund_75: {
    key: "emergency_fund_75",
    title: "75% to Safety Net! 🌟",
    description: "Three quarters to your emergency fund goal",
    remyMessage:
      "So close! 75% of your Safety Net is sorted. Most people never get this far. You're building real financial resilience here.",
    icon: "💫",
    confettiColors: ["#7A9E9A", "#D4A853", "#B8D4D0"],
    priority: 7,
  },
  emergency_fund_complete: {
    key: "emergency_fund_complete",
    title: "Safety Net Complete! 🏅",
    description: "You have 3-6 months of expenses saved",
    remyMessage:
      "MASSIVE achievement! Your Safety Net is complete. Job loss? Unexpected expense? You've got months of runway. That's true financial security. Time to dream bigger - what goals are calling you?",
    icon: "🏅",
    confettiColors: ["#7A9E9A", "#D4A853", "#FFD700", "#B8D4D0"],
    priority: 8,
  },
  first_savings_goal: {
    key: "first_savings_goal",
    title: "First Goal Funded! 🎁",
    description: "You've fully funded a savings goal",
    remyMessage:
      "You did it! Your first savings goal is fully funded. Remember when this felt impossible? Now it's real. What's the next dream you're saving for?",
    icon: "🎁",
    confettiColors: ["#D4A853", "#FFD700"],
    priority: 9,
  },
  budget_surplus: {
    key: "budget_surplus",
    title: "Budget Surplus! 💰",
    description: "You have money left over after all allocations",
    remyMessage:
      "Look at you with money to spare! A budget surplus means you've covered everything AND have extra. That's not luck - that's good planning. Consider boosting your Safety Net or accelerating a goal.",
    icon: "💰",
    confettiColors: ["#7A9E9A", "#D4A853"],
    priority: 10,
  },
};

// ============================================
// ANALYZER FUNCTIONS
// ============================================

/**
 * Analyze envelopes to extract key financial metrics
 */
export function analyzeEnvelopes(envelopes: DatabaseEnvelope[]): EnvelopeAnalysis {
  // Find starter stash / emergency fund envelopes
  const starterStashEnvelope = envelopes.find(
    (e) =>
      e.name.toLowerCase().includes("starter stash") ||
      (e.name.toLowerCase().includes("emergency") && e.target_amount && e.target_amount <= 1000)
  );

  const emergencyFundEnvelope = envelopes.find(
    (e) =>
      e.name.toLowerCase().includes("safety net") ||
      (e.name.toLowerCase().includes("emergency") && e.target_amount && e.target_amount > 1000)
  );

  // Calculate starter stash metrics
  const starterStashBalance = starterStashEnvelope?.current_amount ?? 0;
  const starterStashTarget = starterStashEnvelope?.target_amount ?? 1000;

  // Calculate emergency fund metrics
  const emergencyFundBalance = emergencyFundEnvelope?.current_amount ?? 0;
  const emergencyFundTarget = emergencyFundEnvelope?.target_amount ?? 10000;
  const emergencyFundPercent =
    emergencyFundTarget > 0 ? (emergencyFundBalance / emergencyFundTarget) * 100 : 0;

  // Find debt envelopes (credit cards, loans with negative or tracking)
  const debtEnvelopes = envelopes.filter(
    (e) =>
      e.subtype === "tracking" &&
      (e.name.toLowerCase().includes("credit") ||
        e.name.toLowerCase().includes("loan") ||
        e.name.toLowerCase().includes("debt"))
  );
  const totalDebt = debtEnvelopes.reduce((sum, e) => sum + Math.abs(e.current_amount ?? 0), 0);

  // Calculate bills funding status
  const billEnvelopes = envelopes.filter((e) => e.subtype === "bill");
  const totalBillsCount = billEnvelopes.length;
  const fundedBillsCount = billEnvelopes.filter((e) => {
    const current = e.current_amount ?? 0;
    const target = e.target_amount ?? 0;
    return target > 0 && current >= target;
  }).length;
  const fundedBillsPercent = totalBillsCount > 0 ? (fundedBillsCount / totalBillsCount) * 100 : 0;

  // Count savings goals
  const savingsGoalsCount = envelopes.filter(
    (e) => (e.subtype === "savings" || e.subtype === "goal") && (e.current_amount ?? 0) >= (e.target_amount ?? 1)
  ).length;

  // Check for surplus
  const surplusEnvelope = envelopes.find(
    (e) => e.name.toLowerCase() === "surplus" || e.name.toLowerCase().includes("unallocated")
  );
  const totalSurplus = surplusEnvelope?.current_amount ?? 0;
  const hasBudgetSurplus = totalSurplus > 0;

  return {
    starterStashBalance,
    starterStashTarget,
    emergencyFundBalance,
    emergencyFundTarget,
    emergencyFundPercent,
    totalDebt,
    debtEnvelopes,
    fundedBillsCount,
    totalBillsCount,
    fundedBillsPercent,
    savingsGoalsCount,
    hasBudgetSurplus,
    totalSurplus,
  };
}

/**
 * Detect milestones that have been achieved
 */
export function detectMilestones(
  analysis: EnvelopeAnalysis,
  dismissedMilestones: string[] = []
): DetectedMilestone[] {
  const detected: DetectedMilestone[] = [];
  const now = new Date();

  // Helper to add milestone if not dismissed
  const addIfNotDismissed = (key: MilestoneKey, metadata?: Record<string, unknown>) => {
    if (!dismissedMilestones.includes(key)) {
      detected.push({
        ...MILESTONES[key],
        detectedAt: now,
        metadata,
      });
    }
  };

  // Check Starter Stash ($1000 minimum)
  if (analysis.starterStashBalance >= 1000) {
    addIfNotDismissed("starter_stash_complete", {
      balance: analysis.starterStashBalance,
    });
  }

  // Check first bill funded
  if (analysis.fundedBillsCount >= 1) {
    addIfNotDismissed("first_bill_funded", {
      fundedCount: analysis.fundedBillsCount,
    });
  }

  // Check all bills funded
  if (analysis.totalBillsCount > 0 && analysis.fundedBillsCount === analysis.totalBillsCount) {
    addIfNotDismissed("all_bills_funded", {
      billsCount: analysis.totalBillsCount,
    });
  }

  // Check debt free
  if (analysis.debtEnvelopes.length > 0 && analysis.totalDebt === 0) {
    addIfNotDismissed("debt_free");
  }

  // Check emergency fund progress
  if (analysis.emergencyFundPercent >= 100) {
    addIfNotDismissed("emergency_fund_complete", {
      balance: analysis.emergencyFundBalance,
      target: analysis.emergencyFundTarget,
    });
  } else if (analysis.emergencyFundPercent >= 75) {
    addIfNotDismissed("emergency_fund_75", {
      percent: analysis.emergencyFundPercent,
    });
  } else if (analysis.emergencyFundPercent >= 50) {
    addIfNotDismissed("emergency_fund_50", {
      percent: analysis.emergencyFundPercent,
    });
  } else if (analysis.emergencyFundPercent >= 25) {
    addIfNotDismissed("emergency_fund_25", {
      percent: analysis.emergencyFundPercent,
    });
  }

  // Check first savings goal
  if (analysis.savingsGoalsCount >= 1) {
    addIfNotDismissed("first_savings_goal", {
      goalsCount: analysis.savingsGoalsCount,
    });
  }

  // Check budget surplus
  if (analysis.hasBudgetSurplus && analysis.totalSurplus > 50) {
    addIfNotDismissed("budget_surplus", {
      surplus: analysis.totalSurplus,
    });
  }

  // Sort by priority (lower = show first)
  return detected.sort((a, b) => a.priority - b.priority);
}

/**
 * Get the highest priority milestone to celebrate
 */
export function getTopMilestone(
  envelopes: DatabaseEnvelope[],
  dismissedMilestones: string[] = []
): DetectedMilestone | null {
  const analysis = analyzeEnvelopes(envelopes);
  const milestones = detectMilestones(analysis, dismissedMilestones);
  return milestones.length > 0 ? milestones[0] : null;
}
