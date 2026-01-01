/**
 * Smart Suggestion Generator
 *
 * Generates personalized budget suggestions based on "The My Budget Way":
 * 1. Starter Stash ($500-$1000 emergency buffer) - FIRST PRIORITY
 * 2. High-interest debt payoff
 * 3. Safety Net (3-6 months expenses)
 * 4. Long-term goals
 *
 * Each suggestion includes:
 * - What to do
 * - Why it matters
 * - Specific action with amounts
 * - Remy's encouraging message
 */

import type { EnvelopeAnalysis } from "./milestone-detector";
import { analyzeEnvelopes } from "./milestone-detector";

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
  monthly_amount?: number | null;
  days_until_due?: number | null;
}

export type SuggestionType =
  | "starter_stash"
  | "debt_payoff"
  | "bill_funding"
  | "emergency_fund"
  | "savings_goal"
  | "surplus_allocation"
  | "expense_review"
  | "priority_rebalance";

export type SuggestionPriority = "high" | "medium" | "low";

export interface SmartSuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  action: string;
  remyTip: string;
  icon: string;
  amount?: number;
  targetEnvelopeId?: string;
  targetEnvelopeName?: string;
  impactMessage?: string;
}

export interface SuggestionContext {
  envelopes: DatabaseEnvelope[];
  surplusAmount: number;
  monthlyIncome: number;
  unallocatedIncome: number;
}

// ============================================
// SUGGESTION GENERATORS
// ============================================

/**
 * Generate all applicable suggestions for current budget state
 */
export function generateSuggestions(context: SuggestionContext): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const analysis = analyzeEnvelopes(context.envelopes);

  // 1. Starter Stash priority (if not complete)
  const starterStashSuggestion = generateStarterStashSuggestion(analysis, context);
  if (starterStashSuggestion) {
    suggestions.push(starterStashSuggestion);
  }

  // 2. Debt payoff suggestions
  const debtSuggestions = generateDebtSuggestions(analysis, context);
  suggestions.push(...debtSuggestions);

  // 3. Bill funding suggestions
  const billSuggestions = generateBillFundingSuggestions(context.envelopes, context);
  suggestions.push(...billSuggestions);

  // 4. Emergency fund suggestions
  const emergencySuggestion = generateEmergencyFundSuggestion(analysis, context);
  if (emergencySuggestion) {
    suggestions.push(emergencySuggestion);
  }

  // 5. Surplus allocation suggestions
  const surplusSuggestion = generateSurplusAllocationSuggestion(analysis, context);
  if (surplusSuggestion) {
    suggestions.push(surplusSuggestion);
  }

  // 6. Priority rebalance suggestions
  const rebalanceSuggestion = generatePriorityRebalanceSuggestion(context.envelopes, context);
  if (rebalanceSuggestion) {
    suggestions.push(rebalanceSuggestion);
  }

  // Sort by priority order: high, medium, low
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Generate Starter Stash suggestion
 */
function generateStarterStashSuggestion(
  analysis: EnvelopeAnalysis,
  context: SuggestionContext
): SmartSuggestion | null {
  const { starterStashBalance, starterStashTarget } = analysis;

  if (starterStashBalance >= starterStashTarget) {
    return null; // Already complete
  }

  const needed = starterStashTarget - starterStashBalance;
  const canFundFromSurplus = Math.min(needed, context.surplusAmount);

  return {
    id: "starter_stash",
    type: "starter_stash",
    priority: "high",
    title: "Build Your Starter Stash",
    description: `Your first $1,000 emergency buffer is ${Math.round((starterStashBalance / starterStashTarget) * 100)}% funded.`,
    action:
      canFundFromSurplus > 0
        ? `Move $${canFundFromSurplus.toFixed(0)} from surplus to your Starter Stash`
        : `Allocate $${Math.min(50, needed).toFixed(0)}/pay towards your Starter Stash`,
    remyTip:
      "Your Starter Stash is your first line of defence. It's not for holidays - it's for when the car breaks down or the washing machine gives up. Get this sorted first, then we tackle the rest.",
    icon: "🛡️",
    amount: canFundFromSurplus > 0 ? canFundFromSurplus : Math.min(50, needed),
    impactMessage:
      canFundFromSurplus > 0
        ? `This brings your Starter Stash to $${(starterStashBalance + canFundFromSurplus).toFixed(0)}`
        : undefined,
  };
}

/**
 * Generate debt payoff suggestions
 */
function generateDebtSuggestions(
  analysis: EnvelopeAnalysis,
  context: SuggestionContext
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const { debtEnvelopes, totalDebt } = analysis;

  if (debtEnvelopes.length === 0 || totalDebt === 0) {
    return suggestions;
  }

  // Sort debts by balance (smallest first for debt snowball)
  const sortedDebts = [...debtEnvelopes].sort(
    (a, b) => Math.abs(a.current_amount ?? 0) - Math.abs(b.current_amount ?? 0)
  );

  const smallestDebt = sortedDebts[0];
  const smallestDebtAmount = Math.abs(smallestDebt.current_amount ?? 0);

  suggestions.push({
    id: `debt_${smallestDebt.id}`,
    type: "debt_payoff",
    priority: "high",
    title: `Attack ${smallestDebt.name}`,
    description: `You have $${totalDebt.toFixed(0)} in total debt. Focus on the smallest balance first.`,
    action:
      context.surplusAmount >= smallestDebtAmount
        ? `Pay off ${smallestDebt.name} completely ($${smallestDebtAmount.toFixed(0)})`
        : `Put extra towards ${smallestDebt.name} - even $${Math.min(50, smallestDebtAmount).toFixed(0)} helps`,
    remyTip:
      "The debt snowball works because it's motivating. Knock off the smallest debt first, then roll that payment into the next one. Before you know it, you're debt-free.",
    icon: "💳",
    amount: Math.min(context.surplusAmount, smallestDebtAmount),
    targetEnvelopeId: smallestDebt.id,
    targetEnvelopeName: smallestDebt.name,
    impactMessage:
      context.surplusAmount >= smallestDebtAmount
        ? `This will clear ${smallestDebt.name} completely!`
        : `${((Math.min(50, smallestDebtAmount) / smallestDebtAmount) * 100).toFixed(0)}% closer to clearing this debt`,
  });

  return suggestions;
}

/**
 * Generate bill funding suggestions
 */
function generateBillFundingSuggestions(
  envelopes: DatabaseEnvelope[],
  context: SuggestionContext
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  // Find underfunded essential bills
  const underfundedBills = envelopes
    .filter((e) => {
      if (e.subtype !== "bill") return false;
      const current = e.current_amount ?? 0;
      const target = e.target_amount ?? 0;
      return target > 0 && current < target;
    })
    .sort((a, b) => {
      // Sort by priority first (essential > important > discretionary)
      const priorityOrder: Record<string, number> = {
        essential: 0,
        important: 1,
        discretionary: 2,
      };
      const aPriority = priorityOrder[a.priority ?? "discretionary"] ?? 2;
      const bPriority = priorityOrder[b.priority ?? "discretionary"] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by how close to due date (days_until_due if available)
      return (a.days_until_due ?? 999) - (b.days_until_due ?? 999);
    });

  // Top 2 most urgent underfunded bills
  const urgentBills = underfundedBills.slice(0, 2);

  for (const bill of urgentBills) {
    const current = bill.current_amount ?? 0;
    const target = bill.target_amount ?? 0;
    const shortfall = target - current;
    const fundable = Math.min(shortfall, context.surplusAmount);

    suggestions.push({
      id: `bill_${bill.id}`,
      type: "bill_funding",
      priority: bill.priority === "essential" ? "high" : "medium",
      title: `Fund ${bill.name}`,
      description: `$${shortfall.toFixed(0)} short of the ${target.toFixed(0)} target`,
      action:
        fundable > 0
          ? `Add $${fundable.toFixed(0)} to fully fund this bill`
          : `Increase allocation by $${Math.min(20, shortfall).toFixed(0)}/pay`,
      remyTip:
        bill.priority === "essential"
          ? "Essential bills need to be sorted first - rent, power, insurance. These keep the roof over your head."
          : "Getting ahead on bills means no more last-minute stress. You'll know the money is there when due date arrives.",
      icon: "📋",
      amount: fundable > 0 ? fundable : Math.min(20, shortfall),
      targetEnvelopeId: bill.id,
      targetEnvelopeName: bill.name,
    });
  }

  return suggestions;
}

/**
 * Generate emergency fund suggestion
 */
function generateEmergencyFundSuggestion(
  analysis: EnvelopeAnalysis,
  context: SuggestionContext
): SmartSuggestion | null {
  const { emergencyFundBalance, emergencyFundTarget, emergencyFundPercent, starterStashBalance } =
    analysis;

  // Only suggest after Starter Stash is complete
  if (starterStashBalance < 1000) {
    return null;
  }

  // If emergency fund is complete, no suggestion needed
  if (emergencyFundPercent >= 100) {
    return null;
  }

  const needed = emergencyFundTarget - emergencyFundBalance;
  const suggestedAmount = Math.min(context.surplusAmount, needed, 500); // Cap at $500 per suggestion

  if (suggestedAmount < 10) {
    return null; // Not worth suggesting tiny amounts
  }

  return {
    id: "emergency_fund",
    type: "emergency_fund",
    priority: "medium",
    title: "Grow Your Safety Net",
    description: `${emergencyFundPercent.toFixed(0)}% to your 3-6 month emergency fund goal`,
    action: `Add $${suggestedAmount.toFixed(0)} to your Safety Net`,
    remyTip:
      emergencyFundPercent < 50
        ? "Your Safety Net is what keeps you calm during uncertainty. Job loss, medical bills, major repairs - you'll have options instead of panic."
        : "You're past halfway! This fund means you could handle a job loss or major emergency without touching credit cards. Keep building.",
    icon: "🏦",
    amount: suggestedAmount,
    impactMessage: `This brings your Safety Net to ${((emergencyFundBalance + suggestedAmount) / emergencyFundTarget * 100).toFixed(0)}%`,
  };
}

/**
 * Generate surplus allocation suggestion
 */
function generateSurplusAllocationSuggestion(
  analysis: EnvelopeAnalysis,
  context: SuggestionContext
): SmartSuggestion | null {
  if (context.surplusAmount < 10) {
    return null; // No meaningful surplus
  }

  // If starter stash not complete, direct there
  if (analysis.starterStashBalance < analysis.starterStashTarget) {
    return null; // Covered by starter stash suggestion
  }

  // If has debt, direct there
  if (analysis.totalDebt > 0) {
    return null; // Covered by debt suggestions
  }

  // Suggest putting surplus toward emergency fund or goals
  return {
    id: "surplus_allocation",
    type: "surplus_allocation",
    priority: "low",
    title: "Put Your Surplus to Work",
    description: `You have $${context.surplusAmount.toFixed(0)} sitting in your Surplus envelope`,
    action:
      analysis.emergencyFundPercent < 100
        ? `Move $${Math.min(context.surplusAmount, 200).toFixed(0)} to your Safety Net`
        : `Move $${Math.min(context.surplusAmount, 200).toFixed(0)} to a savings goal`,
    remyTip:
      "Surplus is great - it means you're covering your expenses with room to spare. But money sitting idle could be working harder for your future.",
    icon: "💰",
    amount: Math.min(context.surplusAmount, 200),
  };
}

/**
 * Generate priority rebalance suggestion
 */
function generatePriorityRebalanceSuggestion(
  envelopes: DatabaseEnvelope[],
  context: SuggestionContext
): SmartSuggestion | null {
  // Find discretionary envelopes that are overfunded while essential ones are underfunded
  const underfundedEssentials = envelopes.filter((e) => {
    if (e.priority !== "essential" || e.subtype !== "bill") return false;
    const current = e.current_amount ?? 0;
    const target = e.target_amount ?? 0;
    return target > 0 && current < target * 0.8; // Less than 80% funded
  });

  const overfundedDiscretionary = envelopes.filter((e) => {
    if (e.priority !== "discretionary") return false;
    const current = e.current_amount ?? 0;
    const target = e.target_amount ?? 0;
    return target > 0 && current > target * 1.2; // More than 120% funded
  });

  if (underfundedEssentials.length === 0 || overfundedDiscretionary.length === 0) {
    return null;
  }

  const essential = underfundedEssentials[0];
  const discretionary = overfundedDiscretionary[0];
  const excessAmount = (discretionary.current_amount ?? 0) - (discretionary.target_amount ?? 0);
  const neededAmount = (essential.target_amount ?? 0) - (essential.current_amount ?? 0);
  const transferAmount = Math.min(excessAmount, neededAmount);

  return {
    id: "priority_rebalance",
    type: "priority_rebalance",
    priority: "medium",
    title: "Rebalance Priorities",
    description: `${essential.name} is underfunded while ${discretionary.name} has extra`,
    action: `Move $${transferAmount.toFixed(0)} from ${discretionary.name} to ${essential.name}`,
    remyTip:
      "Essentials first, always. Nice-to-haves can wait until the must-haves are sorted. This keeps the important stuff covered.",
    icon: "⚖️",
    amount: transferAmount,
    targetEnvelopeId: essential.id,
    targetEnvelopeName: essential.name,
  };
}

/**
 * Get top 3 suggestions for display
 */
export function getTopSuggestions(
  context: SuggestionContext,
  limit: number = 3
): SmartSuggestion[] {
  const allSuggestions = generateSuggestions(context);
  return allSuggestions.slice(0, limit);
}

/**
 * Get the single most important suggestion
 */
export function getPrimarySuggestion(context: SuggestionContext): SmartSuggestion | null {
  const suggestions = generateSuggestions(context);
  return suggestions.length > 0 ? suggestions[0] : null;
}
