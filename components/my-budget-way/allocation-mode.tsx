"use client";

import { CheckCircle2, Circle, Lock, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  SuggestedEnvelope,
  CreditCardDebtData,
  MilestoneProgress,
} from "./types";

interface AllocationModeProps {
  suggestedEnvelopes: SuggestedEnvelope[];
  creditCardDebt?: CreditCardDebtData | null;
  milestoneProgress: MilestoneProgress;
  unallocatedAmount?: number;
  onAllocateToEnvelope?: (envelopeId: string, amount: number) => void;
}

type Priority = "essentials" | "starter-stash" | "important" | "debt" | "extras" | "safety-net";

interface AllocationStep {
  id: Priority;
  icon: string;
  title: string;
  description: string;
  urgentDescription?: string;
  priority: number;
}

const ALLOCATION_STEPS: AllocationStep[] = [
  {
    id: "essentials",
    icon: "🔴",
    title: "Essential Bills",
    description: "Rent, utilities, groceries – the must-haves.",
    urgentDescription: "Cover your essentials first. These are non-negotiable.",
    priority: 1,
  },
  {
    id: "starter-stash",
    icon: "🛡️",
    title: "Starter Stash",
    description: "Your $1,000 safety cushion.",
    urgentDescription: "Build your buffer for unexpected expenses.",
    priority: 2,
  },
  {
    id: "important",
    icon: "🟡",
    title: "Important Expenses",
    description: "Insurance, transport, healthcare.",
    urgentDescription: "These keep your life running smoothly.",
    priority: 3,
  },
  {
    id: "debt",
    icon: "💪",
    title: "Debt Payments",
    description: "Extra payments towards smallest debt.",
    urgentDescription: "Every extra dollar speeds up your freedom date.",
    priority: 4,
  },
  {
    id: "extras",
    icon: "🟢",
    title: "Flexible Spending",
    description: "Entertainment, hobbies, dining out.",
    urgentDescription: "The fun stuff – but only after the basics are covered.",
    priority: 5,
  },
  {
    id: "safety-net",
    icon: "🌈",
    title: "Safety Net",
    description: "Three months of expenses.",
    urgentDescription: "Unlocks after debt is cleared.",
    priority: 6,
  },
];

export function AllocationMode({
  suggestedEnvelopes,
  creditCardDebt,
  milestoneProgress,
  unallocatedAmount = 0,
  onAllocateToEnvelope,
}: AllocationModeProps) {
  const hasDebt = creditCardDebt?.hasDebt ?? false;
  const hasUnallocated = unallocatedAmount > 0;

  // Get current status of each goal
  const getEnvelopeByType = (suggestionType: string) => {
    return suggestedEnvelopes.find((e) => e.suggestion_type === suggestionType);
  };

  const starterStash = getEnvelopeByType("starter-stash");
  const safetyNet = getEnvelopeByType("safety-net");

  // Calculate progress for each priority level
  const getStepProgress = (step: AllocationStep): {
    current: number;
    target: number;
    percent: number;
    status: "completed" | "active" | "locked" | "pending";
    gap: number;
  } => {
    switch (step.id) {
      case "essentials":
        // This would come from priority filtering in real implementation
        return {
          current: milestoneProgress.totalCurrent * 0.4, // Approximation
          target: milestoneProgress.totalTarget * 0.4,
          percent: milestoneProgress.essentialsUnderfunded ? 80 : 100,
          status: milestoneProgress.essentialsUnderfunded ? "active" : "completed",
          gap: milestoneProgress.essentialsUnderfunded ? 500 : 0,
        };

      case "starter-stash":
        if (starterStash) {
          const current = Number(starterStash.current_amount ?? 0);
          const target = Number(starterStash.target_amount ?? 1000);
          const percent = target > 0 ? (current / target) * 100 : 0;
          return {
            current,
            target,
            percent,
            status: percent >= 100 ? "completed" : percent > 0 ? "active" : "pending",
            gap: Math.max(0, target - current),
          };
        }
        return { current: 0, target: 1000, percent: 0, status: "pending", gap: 1000 };

      case "important":
        // Approximation for important priority
        return {
          current: milestoneProgress.totalCurrent * 0.3,
          target: milestoneProgress.totalTarget * 0.3,
          percent: 85,
          status: "active",
          gap: 200,
        };

      case "debt":
        if (!creditCardDebt?.startingDebt) {
          return { current: 0, target: 0, percent: 100, status: "completed", gap: 0 };
        }
        const debtPaid = creditCardDebt.startingDebt - creditCardDebt.currentDebt;
        const debtPercent = (debtPaid / creditCardDebt.startingDebt) * 100;
        return {
          current: debtPaid,
          target: creditCardDebt.startingDebt,
          percent: debtPercent,
          status: hasDebt ? "active" : "completed",
          gap: creditCardDebt.currentDebt,
        };

      case "extras":
        return {
          current: milestoneProgress.totalCurrent * 0.2,
          target: milestoneProgress.totalTarget * 0.2,
          percent: 70,
          status: "pending",
          gap: 150,
        };

      case "safety-net":
        if (hasDebt) {
          return { current: 0, target: 0, percent: 0, status: "locked", gap: 0 };
        }
        if (safetyNet) {
          const current = Number(safetyNet.current_amount ?? 0);
          const target = Number(safetyNet.target_amount ?? 0);
          const percent = target > 0 ? (current / target) * 100 : 0;
          return {
            current,
            target,
            percent,
            status: percent >= 100 ? "completed" : percent > 0 ? "active" : "pending",
            gap: Math.max(0, target - current),
          };
        }
        return { current: 0, target: 0, percent: 0, status: "pending", gap: 0 };

      default:
        return { current: 0, target: 0, percent: 0, status: "pending", gap: 0 };
    }
  };

  // Find the active step (first non-completed, non-locked)
  const getActiveStep = (): AllocationStep | null => {
    for (const step of ALLOCATION_STEPS) {
      const progress = getStepProgress(step);
      if (progress.status === "active" || progress.status === "pending") {
        return step;
      }
    }
    return null;
  };

  const activeStep = getActiveStep();

  return (
    <div className="p-4 space-y-4">
      {/* Unallocated Banner */}
      {hasUnallocated && (
        <div className="bg-gold-light border border-gold rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-gold flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-text-dark">
              ${unallocatedAmount.toLocaleString()} unallocated
            </p>
            <p className="text-sm text-text-medium">
              Follow the priority order below to allocate your funds.
            </p>
          </div>
          <Button size="sm" className="bg-gold hover:bg-gold/90 text-text-dark">
            Quick Allocate
          </Button>
        </div>
      )}

      {/* Priority Guide */}
      <div className="bg-sage-very-light/50 border border-sage-light rounded-lg p-3">
        <h3 className="font-semibold text-text-dark text-sm mb-2">
          Priority Allocation Order
        </h3>
        <p className="text-xs text-text-medium">
          Allocate in this order: Essentials first, then Starter Stash, then work
          down the list. This ensures your most important needs are always covered.
        </p>
      </div>

      {/* Allocation Steps */}
      <div className="space-y-2">
        {ALLOCATION_STEPS.map((step) => {
          const progress = getStepProgress(step);
          const isLocked = progress.status === "locked";
          const isCompleted = progress.status === "completed";
          const isActive = step.id === activeStep?.id;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                isLocked && "bg-gray-50 border-gray-200 opacity-60",
                isCompleted && "bg-sage-very-light/30 border-sage-light",
                isActive && "bg-white border-sage shadow-sm ring-1 ring-sage/20",
                !isLocked && !isCompleted && !isActive && "bg-white border-silver-light"
              )}
            >
              {/* Priority indicator */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0",
                  isLocked && "bg-gray-100",
                  isCompleted && "bg-sage-light",
                  isActive && "bg-sage-very-light border border-sage",
                  !isLocked && !isCompleted && !isActive && "bg-silver-very-light"
                )}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4 text-gray-400" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-sage-dark" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-medium text-sm",
                      isLocked && "text-text-light",
                      isCompleted && "text-sage-dark",
                      isActive && "text-text-dark",
                      !isLocked && !isCompleted && !isActive && "text-text-medium"
                    )}
                  >
                    {step.title}
                  </span>
                  {isCompleted && (
                    <span className="text-[10px] text-sage bg-sage-very-light px-1.5 py-0.5 rounded uppercase font-medium">
                      Done
                    </span>
                  )}
                  {isActive && progress.gap > 0 && (
                    <span className="text-[10px] text-blue bg-blue-light px-1.5 py-0.5 rounded font-medium">
                      -${progress.gap.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Progress bar for active/in-progress */}
                {!isLocked && progress.target > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-silver-very-light rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          step.id === "debt"
                            ? "bg-blue"
                            : isCompleted
                            ? "bg-sage"
                            : "bg-sage-light"
                        )}
                        style={{ width: `${Math.min(100, progress.percent)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isCompleted ? "text-sage" : "text-text-medium"
                      )}
                    >
                      {progress.percent.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action */}
              {isActive && hasUnallocated && onAllocateToEnvelope && (
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  Allocate
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-silver-light pt-4 mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-medium">Overall Progress</span>
          <span className="font-semibold text-sage-dark">
            {milestoneProgress.overallProgress.toFixed(0)}% funded
          </span>
        </div>
        <div className="mt-2 h-2 bg-silver-very-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-light to-sage rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, milestoneProgress.overallProgress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
