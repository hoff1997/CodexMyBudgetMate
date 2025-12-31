"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusMode } from "./status-mode";
import { OnboardingMode } from "./onboarding-mode";
import { AllocationMode } from "./allocation-mode";
import type { MyBudgetWayWidgetProps, WidgetMode } from "./types";

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
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-5 py-3 bg-sage-very-light border-b border-sage-light cursor-pointer hover:bg-sage-light/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-sage-dark" />
          ) : (
            <ChevronRight className="h-4 w-4 text-sage-dark" />
          )}
          <span className="text-lg">✨</span>
          <h2 className="text-base font-bold text-text-dark uppercase tracking-wide">
            The My Budget Way
          </h2>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="bg-white">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { MyBudgetWayWidgetProps, WidgetMode } from "./types";
export type { CreditCardDebtData, SuggestedEnvelope, MilestoneProgress } from "./types";
