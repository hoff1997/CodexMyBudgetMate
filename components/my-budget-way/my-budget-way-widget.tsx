"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusMode } from "./status-mode";
import { OnboardingMode } from "./onboarding-mode";
import { AllocationMode } from "./allocation-mode";
import type { MyBudgetWayWidgetProps, WidgetMode } from "./types";

const STORAGE_KEY = "my-budget-way-expanded";

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
          className="flex items-center justify-between w-full px-5 py-3 cursor-pointer hover:bg-sage-light/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-sage-dark transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 text-sage-dark transition-transform" />
            )}
            <span className="text-lg">✨</span>
            <h2 id="my-budget-way-heading" className="text-base font-bold text-text-dark uppercase tracking-wide">
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

        {/* Helper text - only show after initial load to prevent flash */}
        {hasLoaded && (
          <div className="px-5 pb-2">
            <p className="text-xs text-sage-dark/80 italic">
              {isExpanded
                ? "You can close this view for more space. I'll remember your preference."
                : "Open the My Budget Way by clicking the arrow. I'll remember your preference."}
            </p>
          </div>
        )}
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
