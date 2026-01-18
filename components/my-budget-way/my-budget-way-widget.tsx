"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, RotateCw, HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusMode } from "./status-mode";
import { OnboardingMode } from "./onboarding-mode";
import { AllocationMode } from "./allocation-mode";
import type { MyBudgetWayWidgetProps, WidgetMode, SuggestedEnvelope, CreditCardDebtData, MilestoneProgress } from "./types";

const STORAGE_KEY = "my-budget-way-expanded";

// Step definitions for the collapsed view
const BUDGET_WAY_STEPS = [
  { id: "essentials", icon: "📋", title: "Fill Envelopes", step: 1 },
  { id: "starter-stash", icon: "🛡️", title: "Starter Stash", step: 2 },
  { id: "debt", icon: "💪", title: "Smash Debt", step: 3 },
  { id: "safety-net", icon: "💰", title: "Safety Net", step: 4 },
  { id: "cc-holding", icon: "💳", title: "CC Holding", step: 5 },
];

type StepStatus = "completed" | "active" | "locked" | "pending";

function getStepStatuses(
  suggestedEnvelopes: SuggestedEnvelope[],
  creditCardDebt: CreditCardDebtData | null | undefined,
  milestoneProgress: MilestoneProgress
): Record<string, StepStatus> {
  const hasDebt = creditCardDebt?.hasDebt ?? false;

  const getEnvelopeByType = (type: string) =>
    suggestedEnvelopes.find((e) => e.suggestion_type === type);

  const starterStash = getEnvelopeByType("starter-stash");
  const safetyNet = getEnvelopeByType("safety-net");
  const ccHolding = getEnvelopeByType("cc-holding");

  // Calculate status for each step
  const statuses: Record<string, StepStatus> = {};

  // Essentials - based on milestone progress
  const essentialsComplete = !milestoneProgress.essentialsUnderfunded && milestoneProgress.overallProgress >= 80;
  statuses["essentials"] = essentialsComplete ? "completed" : "active";

  // Starter Stash
  if (starterStash) {
    const current = Number(starterStash.current_amount ?? 0);
    const target = Number(starterStash.target_amount ?? 1000);
    const percent = target > 0 ? (current / target) * 100 : 0;
    statuses["starter-stash"] = percent >= 100 ? "completed" : percent > 0 ? "active" : "pending";
  } else {
    statuses["starter-stash"] = "pending";
  }

  // Debt
  if (!creditCardDebt?.startingDebt || creditCardDebt.startingDebt === 0) {
    statuses["debt"] = "completed";
  } else {
    statuses["debt"] = hasDebt ? "active" : "completed";
  }

  // Safety Net - locked until debt is paid
  if (hasDebt) {
    statuses["safety-net"] = "locked";
  } else if (safetyNet) {
    const current = Number(safetyNet.current_amount ?? 0);
    const target = Number(safetyNet.target_amount ?? 0);
    const percent = target > 0 ? (current / target) * 100 : 0;
    statuses["safety-net"] = percent >= 100 ? "completed" : percent > 0 ? "active" : "pending";
  } else {
    statuses["safety-net"] = "pending";
  }

  // CC Holding - locked until debt is paid
  if (hasDebt) {
    statuses["cc-holding"] = "locked";
  } else if (ccHolding) {
    const current = Number(ccHolding.current_amount ?? 0);
    const target = Number(ccHolding.target_amount ?? 0);
    const percent = target > 0 ? (current / target) * 100 : 0;
    statuses["cc-holding"] = percent >= 100 ? "completed" : percent > 0 ? "active" : "pending";
  } else {
    statuses["cc-holding"] = "pending";
  }

  return statuses;
}

export function MyBudgetWayWidget({
  mode,
  suggestedEnvelopes,
  creditCardDebt,
  milestoneProgress,
  hiddenCount = 0,
  onSnooze,
  onRestoreHidden,
  onEnvelopeClick,
  defaultExpanded = true,
  showHeader = true,
  className,
}: MyBudgetWayWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Calculate step statuses for collapsed view
  const stepStatuses = useMemo(
    () => getStepStatuses(suggestedEnvelopes, creditCardDebt, milestoneProgress),
    [suggestedEnvelopes, creditCardDebt, milestoneProgress]
  );

  // Load preference from localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(STORAGE_KEY);
    if (savedPreference !== null) {
      setIsExpanded(savedPreference === "true");
    }
    // If no saved preference, default stays as is (expanded for new users)
    setHasLoaded(true);
  }, []);

  // Handle toggle and save preference
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(STORAGE_KEY, newState.toString());
  };

  const renderContent = () => {
    switch (mode) {
      case "status":
        return (
          <StatusMode
            suggestedEnvelopes={suggestedEnvelopes}
            creditCardDebt={creditCardDebt}
            milestoneProgress={milestoneProgress}
            onSnooze={onSnooze}
            onEnvelopeClick={onEnvelopeClick}
          />
        );

      case "onboarding":
        return (
          <OnboardingMode
            suggestedEnvelopes={suggestedEnvelopes}
            creditCardDebt={creditCardDebt}
            milestoneProgress={milestoneProgress}
          />
        );

      case "allocation":
        return (
          <AllocationMode
            suggestedEnvelopes={suggestedEnvelopes}
            creditCardDebt={creditCardDebt}
            milestoneProgress={milestoneProgress}
          />
        );

      default:
        return null;
    }
  };

  // Simple header for non-status modes
  if (!showHeader) {
    return (
      <div className={cn("bg-white rounded-xl border border-sage-light overflow-hidden shadow-sm", className)}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-sage-light overflow-hidden shadow-sm", className)}>
      {/* Widget Header - Collapsible */}
      <div className="bg-sage-very-light border-b border-sage-light">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls="my-budget-way-content"
          aria-label={isExpanded ? "Collapse My Budget Way" : "Expand My Budget Way"}
          className="flex items-center justify-between w-full px-4 py-2 cursor-pointer hover:bg-sage-light/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-sage-dark transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 text-sage-dark transition-transform" />
            )}
            <h2 id="my-budget-way-heading" className="text-sm font-bold text-text-dark uppercase tracking-wide">
              The My Budget Way
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-full text-sage hover:text-sage-dark hover:bg-sage-light/50 transition-colors"
                    aria-label="About My Budget Way"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs bg-sage-very-light border-sage-light text-sage-dark"
                >
                  <p className="text-sm">
                    This shows your progress on the My Budget Way - a step-by-step approach to
                    financial stability. Complete each step in order: build emergency savings,
                    pay off debt, then grow your wealth.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasLoaded && isExpanded && (
              <span className="text-xs text-sage-dark/80 italic">
                You can close this view for more space. I'll remember your preference.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Show only active step badge when collapsed */}
            {hasLoaded && !isExpanded && (() => {
              const activeStep = BUDGET_WAY_STEPS.find((step) => stepStatuses[step.id] === "active");
              if (!activeStep) return null;
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-sage-dark">You are up to:</span>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sage text-white">
                    <span>{activeStep.icon}</span>
                    <span>Step {activeStep.step} - {activeStep.title}</span>
                  </div>
                </div>
              );
            })()}
            {/* Restore button for hidden goals */}
            {hiddenCount > 0 && onRestoreHidden && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreHidden();
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-sage-dark hover:bg-sage-light rounded transition-colors"
                title={`Restore ${hiddenCount} hidden goal${hiddenCount > 1 ? "s" : ""}`}
              >
                <RotateCw className="h-3 w-3" />
                Restore ({hiddenCount})
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Collapsible Content with smooth transition */}
      <div
        id="my-budget-way-content"
        role="region"
        aria-labelledby="my-budget-way-heading"
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden bg-white",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {renderContent()}
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { MyBudgetWayWidgetProps, WidgetMode } from "./types";
export type { CreditCardDebtData, SuggestedEnvelope, MilestoneProgress } from "./types";
