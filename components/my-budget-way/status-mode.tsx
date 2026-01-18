"use client";

import { CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { GoalRow, DividerRow } from "./shared/goal-row";
import type {
  SuggestedEnvelope,
  CreditCardDebtData,
  MilestoneProgress,
} from "./types";

interface StatusModeProps {
  suggestedEnvelopes: SuggestedEnvelope[];
  creditCardDebt?: CreditCardDebtData | null;
  milestoneProgress: MilestoneProgress;
  onSnooze?: (envelopeId: string, days: number) => void;
  onEnvelopeClick?: (envelope: SuggestedEnvelope) => void;
}

// Step definitions for the expanded table view
const BUDGET_WAY_STEPS = [
  { id: "essentials", icon: "📋", title: "Fill Envelopes", suggestionType: null, step: 1 },
  { id: "starter-stash", icon: "🛡️", title: "Starter Stash", suggestionType: "starter-stash", step: 2 },
  { id: "debt", icon: "💪", title: "Smash Debt", suggestionType: null, step: 3 },
  { id: "safety-net", icon: "💰", title: "Safety Net", suggestionType: "safety-net", step: 4 },
  { id: "cc-holding", icon: "💳", title: "CC Holding", suggestionType: "cc-holding", step: 5 },
];

export function StatusMode({
  suggestedEnvelopes,
  creditCardDebt,
  milestoneProgress,
  onSnooze,
  onEnvelopeClick,
}: StatusModeProps) {
  const hasDebt = creditCardDebt?.hasDebt ?? false;

  // Helper to find envelope by suggestion type
  const getEnvelopeByType = (type: string) =>
    suggestedEnvelopes.find((e) => e.suggestion_type === type);

  // Check if envelope is locked based on debt status
  const isStepLocked = (stepId: string): boolean => {
    if (stepId === "safety-net" || stepId === "cc-holding") {
      return hasDebt;
    }
    return false;
  };

  // Get step status
  type StepStatus = "completed" | "active" | "locked" | "pending";
  const getStepStatus = (stepId: string): StepStatus => {
    if (isStepLocked(stepId)) return "locked";

    if (stepId === "essentials") {
      const essentialsComplete = !milestoneProgress.essentialsUnderfunded && milestoneProgress.overallProgress >= 80;
      return essentialsComplete ? "completed" : "active";
    }

    if (stepId === "debt") {
      if (!creditCardDebt?.startingDebt || creditCardDebt.startingDebt === 0) {
        return "completed";
      }
      return hasDebt ? "active" : "completed";
    }

    // For envelope-based steps
    const envelope = getEnvelopeByType(stepId);
    if (envelope) {
      const current = Number(envelope.current_amount ?? 0);
      const target = Number(envelope.target_amount ?? 0);
      const percent = target > 0 ? (current / target) * 100 : 0;
      return percent >= 100 ? "completed" : percent > 0 ? "active" : "pending";
    }
    return "pending";
  };

  // Get description for each step
  const getStepDescription = (stepId: string, status: StepStatus): string => {
    switch (stepId) {
      case "essentials":
        return milestoneProgress.needsFunding > 0
          ? `${milestoneProgress.needsFunding}/${milestoneProgress.totalCount} envelopes need funding`
          : `All ${milestoneProgress.totalCount} envelopes on track`;
      case "starter-stash":
        return "Your first $1,000 safety cushion – a quick win!";
      case "debt":
        if (!creditCardDebt?.startingDebt || creditCardDebt.startingDebt === 0) {
          return "No debt – you're already ahead!";
        }
        return creditCardDebt?.hasDebt && creditCardDebt?.activeDebt
          ? `Pay off smallest first – ${creditCardDebt.activeDebt.name} ($${creditCardDebt.activeDebt.balance.toLocaleString()} left)`
          : "Debt-free! You're building real momentum!";
      case "safety-net":
        return status === "locked"
          ? "Unlocks when all debt is paid – three months of peace"
          : "Three months of essentials for true peace of mind";
      case "cc-holding":
        return status === "locked"
          ? "Unlocks when all debt is paid – use cards wisely"
          : "Use your card as a tool, not a crutch";
      default:
        return "";
    }
  };

  // Get target and current values for each step
  const getStepValues = (stepId: string): { target: number; current: number } => {
    if (stepId === "essentials") {
      return {
        target: milestoneProgress.totalTarget,
        current: milestoneProgress.totalCurrent,
      };
    }

    if (stepId === "debt") {
      if (!creditCardDebt?.startingDebt || creditCardDebt.startingDebt === 0) {
        return { target: 0, current: 0 };
      }
      const debtPaid = creditCardDebt.startingDebt - creditCardDebt.currentDebt;
      return {
        target: creditCardDebt.startingDebt,
        current: debtPaid,
      };
    }

    // For envelope-based steps
    const envelope = getEnvelopeByType(stepId);
    if (envelope) {
      return {
        target: Number(envelope.target_amount ?? 0),
        current: Number(envelope.current_amount ?? 0),
      };
    }

    // Default targets for steps without envelope data
    const defaultTargets: Record<string, number> = {
      "starter-stash": 1000,
      "safety-net": 0,
      "cc-holding": 0,
    };
    return { target: defaultTargets[stepId] || 0, current: 0 };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px]">
        <thead className="bg-silver-very-light border-b border-silver-light">
          <tr>
            <th className="px-4 py-1.5 text-left text-[11px] font-semibold text-text-medium uppercase tracking-wide">
              Step
            </th>
            <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
              Target
            </th>
            <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
              Current
            </th>
            <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
              Difference
            </th>
            <th className="px-4 py-1.5 text-right text-[11px] font-semibold text-text-medium uppercase tracking-wide w-[180px]">
              Progress
            </th>
            <th className="px-2 py-1.5 w-[32px]"></th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {BUDGET_WAY_STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const isLocked = status === "locked";
            const isComplete = status === "completed";
            const { target, current } = getStepValues(step.id);
            const description = getStepDescription(step.id, status);
            const progress = target > 0 ? Math.min(100, (current / target) * 100) : (isComplete ? 100 : 0);

            // Determine progress bar color
            const progressColor = step.id === "debt" ? "blue" : "sage";

            // For locked steps, show debt payoff progress instead
            const displayProgress = isLocked && creditCardDebt && creditCardDebt.startingDebt > 0
              ? ((creditCardDebt.startingDebt - creditCardDebt.currentDebt) / creditCardDebt.startingDebt) * 100
              : progress;

            return (
              <tr
                key={step.id}
                className={cn(
                  isLocked ? "bg-gray-50/50" :
                  isComplete ? "bg-sage-very-light/30" :
                  current > 0 ? "bg-white" : "bg-sage-very-light/30"
                )}
              >
                {/* Step name with icon */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-base border flex-shrink-0",
                        isLocked
                          ? "bg-gray-100 border-gray-200"
                          : progressColor === "blue"
                          ? "bg-white border-blue-light"
                          : "bg-white border-sage-light"
                      )}
                    >
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div>
                      <div
                        className={cn(
                          "font-semibold text-sm",
                          isLocked ? "text-text-medium" : "text-text-dark"
                        )}
                      >
                        Step {step.step} - {step.title}
                      </div>
                      <div
                        className={cn(
                          "text-[10px]",
                          isLocked ? "text-text-light italic" : "text-text-medium"
                        )}
                      >
                        {description}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Target */}
                <td className="px-4 py-2 text-right">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isLocked ? "text-text-light" : "text-text-dark"
                    )}
                  >
                    {isLocked || target === 0 ? "—" : `$${target.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </td>

                {/* Current */}
                <td className="px-4 py-2 text-right">
                  <span
                    className={cn("text-sm font-semibold", isLocked ? "text-text-light" : "")}
                    style={
                      isLocked
                        ? {}
                        : { color: progressColor === "blue" ? "#6B9ECE" : "#7A9E9A" }
                    }
                  >
                    {isLocked || (target === 0 && current === 0) ? "—" : `$${current.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </td>

                {/* Difference */}
                <td className="px-4 py-2 text-right">
                  {(() => {
                    if (isLocked || (target === 0 && current === 0)) {
                      return <span className="text-sm text-text-light">—</span>;
                    }
                    const diff = current - target;
                    if (Math.abs(diff) < 0.01) {
                      return <span className="text-sm font-semibold text-sage">$0.00</span>;
                    }
                    if (diff > 0) {
                      return (
                        <span className="text-sm font-semibold text-sage">
                          +${diff.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      );
                    }
                    return (
                      <span className="text-sm font-semibold text-blue">
                        -${Math.abs(diff).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    );
                  })()}
                </td>

                {/* Progress */}
                <td className="px-4 py-2">
                  {isLocked ? (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-36 h-2.5 bg-silver-very-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-light to-blue rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, displayProgress)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-blue min-w-[45px] text-right">
                        {displayProgress.toFixed(0)}%
                      </span>
                    </div>
                  ) : target === 0 && !isComplete ? (
                    <div className="flex items-center justify-end">
                      <span className="text-sm text-text-light">—</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-36 h-2.5 bg-silver-very-light rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isComplete
                              ? "bg-sage"
                              : progressColor === "blue"
                              ? "bg-gradient-to-r from-blue-light to-blue"
                              : "bg-gradient-to-r from-sage-light to-sage"
                          )}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold min-w-[45px] text-right",
                          isComplete
                            ? "text-sage"
                            : progressColor === "blue"
                            ? "text-blue"
                            : "text-sage-dark"
                        )}
                      >
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </td>

                {/* Status icon */}
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center w-6 h-6">
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-sage" />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
