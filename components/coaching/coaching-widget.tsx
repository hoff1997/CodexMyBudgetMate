"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Wallet, Info, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
}

interface EnvelopeData {
  id: string;
  name: string;
  icon?: string;
  subtype?: string;
  priority?: string;
  targetAmount?: number;
  currentAmount?: number;
  payCycleAmount?: number;
  incomeAllocations?: { [incomeSourceId: string]: number };
  is_suggested?: boolean;
  is_tracking_only?: boolean;
}

interface CoachingWidgetProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  currentPage: "dashboard" | "allocation";
  onOpenTransferDialog?: () => void;
  totalAllocated?: number;
  totalIncome?: number;
}

/**
 * CoachingWidget - Split coaching widget with clear separation between:
 *
 * 1. Budget Allocation (Planning Layer)
 *    - How you PLAN to distribute your income across envelopes
 *    - Language: "assign", "allocate", "adjust budget plan"
 *    - Action: Takes user to income allocation section
 *
 * 2. Envelope Balances (Reality Layer)
 *    - How much money you ACTUALLY have in each envelope
 *    - Language: "top up", "transfer funds", "move money"
 *    - Action: Opens transfer dialog or navigates to envelope summary
 */
export function CoachingWidget({
  envelopes,
  incomeSources,
  currentPage,
  onOpenTransferDialog,
  totalAllocated = 0,
  totalIncome = 0,
}: CoachingWidgetProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter out suggested and tracking-only envelopes
  const activeEnvelopes = useMemo(() => {
    return envelopes.filter(
      (env) => !env.is_suggested && !env.is_tracking_only
    );
  }, [envelopes]);

  // ====================================
  // BUDGET ALLOCATION DETECTION
  // ====================================
  // Check if total allocated matches total income (with 1% tolerance)
  const budgetStatus = useMemo(() => {
    const difference = totalIncome - totalAllocated;
    const tolerance = totalIncome * 0.01; // 1% tolerance

    if (Math.abs(difference) <= tolerance) {
      return { isBalanced: true, difference: 0 };
    }

    if (difference > 0) {
      // Unallocated income
      return { isBalanced: false, difference, type: "unallocated" as const };
    } else {
      // Over-allocated
      return {
        isBalanced: false,
        difference: Math.abs(difference),
        type: "over_allocated" as const,
      };
    }
  }, [totalAllocated, totalIncome]);

  const hasBudgetMismatch = !budgetStatus.isBalanced;

  // ====================================
  // ENVELOPE BALANCE DETECTION
  // ====================================
  // Find envelopes that are underfunded (actual balance < 80% of target)
  const underfundedEnvelopes = useMemo(() => {
    return activeEnvelopes.filter((envelope) => {
      const current = Number(envelope.currentAmount || 0);
      const target = Number(envelope.targetAmount || 0);

      // Only check envelopes with targets (bills mostly)
      if (!target || target === 0) return false;

      // Underfunded if less than 80% of target
      return current < target * 0.8;
    });
  }, [activeEnvelopes]);

  const hasUnderfundedEnvelopes = underfundedEnvelopes.length > 0;
  const underfundedCount = underfundedEnvelopes.length;

  // Calculate total shortfall
  const totalShortfall = useMemo(() => {
    return underfundedEnvelopes.reduce((sum, env) => {
      const current = Number(env.currentAmount || 0);
      const target = Number(env.targetAmount || 0);
      return sum + Math.max(0, target - current);
    }, 0);
  }, [underfundedEnvelopes]);

  // ====================================
  // ACTION HANDLERS
  // ====================================

  // Adjust Budget Plan - takes user to income allocation interface
  const handleAdjustBudget = () => {
    if (currentPage === "dashboard") {
      router.push("/budgetallocation");
    } else {
      // Already on allocation page - scroll to income section
      const incomeSection = document.getElementById("income-cards-section");
      if (incomeSection) {
        incomeSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Top Up Envelopes - opens transfer dialog or navigates to budget allocation
  const handleTopUpEnvelopes = () => {
    if (currentPage === "dashboard") {
      router.push("/budgetallocation?filter=needs-attention");
    } else if (onOpenTransferDialog) {
      onOpenTransferDialog();
    }
  };

  // ====================================
  // RENDER
  // ====================================

  // If everything is fine, show compact success state
  if (!hasBudgetMismatch && !hasUnderfundedEnvelopes) {
    return (
      <div className="rounded-xl border border-sage-light bg-sage-very-light px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sage-dark">✓</span>
          <span className="text-sm font-medium text-sage-dark">
            You're all sorted! Budget is balanced and envelopes are funded.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-sage-light overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-sage-light/50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-sage-dark transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-sage-dark transition-transform" />
          )}
          <span className="text-sm font-medium text-text-dark">Budget Status</span>
          {hasBudgetMismatch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-light text-blue">
              <Calculator className="h-3 w-3" />
              Plan needs attention
            </span>
          )}
          {hasUnderfundedEnvelopes && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-light text-gold">
              <Wallet className="h-3 w-3" />
              {underfundedCount} underfunded
            </span>
          )}
        </div>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
      <div className="p-4 space-y-4">
        {/* Two-column layout */}
        <div className="grid md:grid-cols-[1fr_1px_1fr] gap-4">
          {/* Budget Allocation Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue" />
              <h3 className="font-semibold text-text-dark text-sm">Budget Allocation</h3>
              <span className="text-xs text-text-medium uppercase tracking-wide">Your Plan</span>
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-light text-blue hover:bg-blue/20 cursor-help transition-colors"
                title="Your PLAN is how you divide your income each pay."
              >
                <HelpCircle className="h-3 w-3" />
              </span>
            </div>

            {hasBudgetMismatch ? (
              <div className="space-y-2">
                <p className="text-sm text-text-dark flex items-start gap-2">
                  <span
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-light text-blue hover:bg-blue/20 cursor-help transition-colors flex-shrink-0 mt-0.5"
                    title={budgetStatus.type === "unallocated"
                      ? "You have income that isn't assigned to any envelope yet."
                      : "Your planned spending exceeds your income. Reduce some allocations to balance."}
                  >
                    <Info className="h-3 w-3" />
                  </span>
                  <span>
                    {budgetStatus.type === "unallocated" ? (
                      <>
                        You have <strong className="text-blue">${budgetStatus.difference.toFixed(2)}</strong> unallocated income.{" "}
                        <strong>Assign</strong> it to complete your budget plan.
                      </>
                    ) : (
                      <>
                        You've allocated <strong className="text-blue">${budgetStatus.difference.toFixed(2)}</strong> more than you earn.{" "}
                        <strong>Adjust</strong> your allocations.
                      </>
                    )}
                  </span>
                </p>
                {currentPage === "dashboard" && (
                  <Button
                    size="sm"
                    onClick={handleAdjustBudget}
                    className="w-full bg-blue hover:bg-blue/90 text-white"
                  >
                    Adjust Budget Plan →
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-sage-very-light border border-sage-light p-3">
                <p className="text-sm text-sage-dark">✓ Budget is balanced</p>
              </div>
            )}
          </div>

          {/* Vertical Divider - hidden on mobile */}
          <div className="hidden md:block bg-silver-light" />

          {/* Envelope Balances Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-gold" />
              <h3 className="font-semibold text-text-dark text-sm">Envelope Balances</h3>
              <span className="text-xs text-text-medium uppercase tracking-wide">Actual Money</span>
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold-light text-gold hover:bg-gold/20 cursor-help transition-colors"
                title="ACTUAL MONEY is what's really in each envelope. It's normal for these to differ from the plan - life happens! The goal is to gradually align your actual balances with your plan and try to stay on track."
              >
                <HelpCircle className="h-3 w-3" />
              </span>
            </div>

            {hasUnderfundedEnvelopes ? (
              <div className="space-y-2">
                <p className="text-sm text-text-dark flex items-start gap-2">
                  <span
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gold-light text-gold hover:bg-gold/20 cursor-help transition-colors flex-shrink-0 mt-0.5"
                    title="Some envelopes don't have enough actual money. Transfer from surplus or wait for your next pay."
                  >
                    <Info className="h-3 w-3" />
                  </span>
                  <span>
                    <strong className="text-gold">{underfundedCount}</strong>{" "}
                    {underfundedCount === 1 ? "envelope needs" : "envelopes need"}{" "}
                    <strong className="text-gold">${totalShortfall.toFixed(2)}</strong> more money.{" "}
                    <strong>Top up</strong> from surplus.
                  </span>
                </p>
                {currentPage === "dashboard" && (
                  <Button
                    size="sm"
                    onClick={handleTopUpEnvelopes}
                    className="w-full bg-gold hover:bg-gold/90 text-white"
                  >
                    Transfer Funds →
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-sage-very-light border border-sage-light p-3">
                <p className="text-sm text-sage-dark">✓ All envelopes funded</p>
              </div>
            )}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
