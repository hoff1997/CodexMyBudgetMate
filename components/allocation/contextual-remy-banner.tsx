"use client";

import { useState, useEffect } from "react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { Button } from "@/components/ui/button";
import {
  X,
  Shield,
  CreditCard,
  Target,
  TrendingUp,
  ArrowRight,
  HelpCircle,
  Receipt,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SmartSuggestion } from "@/lib/utils/smart-suggestion-generator";
import { cn } from "@/lib/cn";

interface ContextualRemyBannerProps {
  allocationState: "balanced" | "under" | "over";
  unallocatedAmount?: number;
  overAllocatedAmount?: number;
  onTransfer?: (envelopeId: string, amount: number) => void;
  onShowHelp?: () => void;
  className?: string;
  compact?: boolean;
}

export function ContextualRemyBanner({
  allocationState,
  unallocatedAmount = 0,
  overAllocatedAmount = 0,
  onTransfer,
  onShowHelp,
  className,
  compact = false,
}: ContextualRemyBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem("allocation-remy-dismissed");
    setIsDismissed(dismissed === "true");
  }, []);

  // Fetch suggestions when there's unallocated money
  useEffect(() => {
    if (unallocatedAmount > 0 && allocationState === "under") {
      setIsLoadingSuggestions(true);
      fetch("/api/suggestions")
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch((error) => {
          console.error("Failed to fetch suggestions:", error);
        })
        .finally(() => {
          setIsLoadingSuggestions(false);
        });
    }
  }, [unallocatedAmount, allocationState]);

  // Handle dismiss
  const handleDismiss = () => {
    localStorage.setItem("allocation-remy-dismissed", "true");
    setIsDismissed(true);
  };

  // Critical states show even if dismissed
  const isCritical = allocationState === "over" || allocationState === "under";

  if (isDismissed && !isCritical) {
    return null;
  }

  // Get Remy's message for compact mode - highlight the next step
  const getCompactMessage = () => {
    if (allocationState === "over") {
      return (
        <>
          <span className="text-blue font-semibold">${overAllocatedAmount.toFixed(2)} over</span>
          <span className="text-text-medium"> — trim Flexible items first</span>
        </>
      );
    }
    if (allocationState === "under") {
      // If we have suggestions, mention the top priority
      if (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        return (
          <>
            <span className="text-sage-dark font-semibold">${unallocatedAmount.toFixed(2)} to allocate</span>
            <span className="text-text-medium"> → </span>
            <span className="text-sage font-medium">{topSuggestion.title}</span>
          </>
        );
      }
      if (isLoadingSuggestions) {
        return (
          <>
            <span className="text-sage-dark font-semibold">${unallocatedAmount.toFixed(2)} to allocate</span>
            <span className="text-text-medium"> — finding best options...</span>
          </>
        );
      }
      return (
        <>
          <span className="text-sage-dark font-semibold">${unallocatedAmount.toFixed(2)} to allocate</span>
          <span className="text-text-medium"> — assign to envelopes below</span>
        </>
      );
    }
    return (
      <>
        <span className="text-sage font-semibold">Budget balanced</span>
        <span className="text-text-medium"> you're all set!</span>
      </>
    );
  };

  const getCompactColor = () => {
    if (allocationState === "over") return "blue";
    if (allocationState === "under") return "sage";
    return "sage";
  };

  // Compact mode - inline banner for header (expands to fill available space)
  if (compact) {
    const color = getCompactColor();
    const colorClasses: Record<string, string> = {
      sage: "bg-sage-very-light border-sage-light",
      blue: "bg-blue-light/30 border-blue-light",
      gold: "bg-gold-light/30 border-gold",
    };

    return (
      <div className={cn("flex-1 mr-3", className)}>
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-3 py-2",
            colorClasses[color]
          )}
        >
          <RemyAvatar pose="small" size="sm" className="!w-10 !h-10 !border-2 flex-shrink-0" />
          <span className="text-sm font-medium text-text-dark flex-1 leading-snug">
            {getCompactMessage()}
          </span>
          {allocationState === "under" && suggestions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Expanded suggestions dropdown */}
        {isExpanded && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl border border-sage-light shadow-lg p-3">
            <div className="flex items-start gap-3 mb-3">
              <RemyAvatar pose="encouraging" size="sm" className="flex-shrink-0" />
              <p className="text-sm text-text-dark">
                Here's where I suggest putting that ${unallocatedAmount.toFixed(2)}:
              </p>
            </div>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  rank={index + 1}
                  onTransfer={onTransfer}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode - clearer messaging about allocation vs balance
  const getBannerContent = () => {
    // CRITICAL: Over-allocated
    if (allocationState === "over") {
      return {
        pose: "thinking" as const,
        color: "blue",
        canDismiss: false,
        content: (
          <>
            <div className="mb-3">
              <h4 className="font-semibold text-text-dark mb-1">
                Your Budget is Over by ${overAllocatedAmount.toFixed(2)}
              </h4>
              <p className="text-sm text-text-dark">
                You've promised your envelopes more money than you actually earn per pay.
                Trim some allocations below to match your real income.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-blue p-2.5 text-xs">
              <div className="font-semibold text-text-dark mb-1">
                What this means:
              </div>
              <p className="text-text-medium">
                Your <strong>budget plan</strong> allocates more than you earn.
                This won't work long-term - reduce allocations to balance.
              </p>
            </div>
          </>
        ),
      };
    }

    // CRITICAL: Unallocated with smart suggestions
    if (allocationState === "under" && (suggestions.length > 0 || isLoadingSuggestions)) {
      return {
        pose: "encouraging" as const,
        color: "sage",
        canDismiss: false,
        content: (
          <>
            <div className="mb-3">
              <h4 className="font-semibold text-text-dark mb-1">
                You Have ${unallocatedAmount.toFixed(2)} Unallocated Income
              </h4>
              <p className="text-sm text-text-dark mb-2">
                This is money from your income that isn't assigned to any envelope yet.
                Let's give it a job:
              </p>
            </div>

            {/* Explanation box */}
            <div className="bg-white rounded-lg border border-sage-light p-2.5 mb-3 text-xs">
              <div className="font-semibold text-text-dark mb-1">
                📋 Budget Allocation vs Envelope Balance:
              </div>
              <div className="space-y-1 text-text-medium">
                <div>
                  <strong>Unallocated Income</strong> = You haven't told this money
                  where to go in your budget plan yet
                </div>
                <div>
                  <strong>Under-funded Envelope</strong> = An envelope needs more actual
                  money right now (check balances below)
                </div>
              </div>
            </div>

            {isLoadingSuggestions ? (
              <div className="flex items-center gap-2 py-3 text-sage">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analysing your budget...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-text-dark mb-1">
                  Suggested allocations (based on The My Budget Way):
                </div>
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    rank={index + 1}
                    onTransfer={onTransfer}
                  />
                ))}
              </div>
            )}
          </>
        ),
      };
    }

    // CRITICAL: Unallocated without suggestions
    if (allocationState === "under") {
      return {
        pose: "thinking" as const,
        color: "gold",
        canDismiss: false,
        content: (
          <>
            <h4 className="font-semibold text-text-dark mb-1">
              You Have ${unallocatedAmount.toFixed(2)} Unallocated Income
            </h4>
            <p className="text-sm text-text-dark">
              This income isn't assigned to any envelope yet. Allocate it below
              to complete your budget plan.
            </p>
          </>
        ),
      };
    }

    // DEFAULT: All good
    return {
      pose: "encouraging" as const,
      color: "sage",
      canDismiss: true,
      content: (
        <p className="text-sm text-text-dark">
          Budget balanced! You're telling your money exactly where to go.
          You're in control - I'm here if you need me.
        </p>
      ),
    };
  };

  const banner = getBannerContent();

  const colorClasses: Record<string, string> = {
    sage: "bg-sage-very-light border-sage-light",
    blue: "bg-blue-light/30 border-blue-light",
    gold: "bg-gold-light/30 border-gold",
  };

  return (
    <div className={cn("relative rounded-xl border p-3", colorClasses[banner.color], className)}>
      <div className="flex items-start gap-3">
        <RemyAvatar pose={banner.pose} size="md" className="flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {banner.content}

          <p className="text-xs text-sage-dark mt-2 italic">
            - Remy, your financial coach
          </p>
        </div>

        {banner.canDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 h-7 w-7 p-0 -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Suggestion card component (nested inside Remy's message) - Compact styling
function SuggestionCard({
  suggestion,
  rank,
  onTransfer,
}: {
  suggestion: SmartSuggestion;
  rank: number;
  onTransfer?: (envelopeId: string, amount: number) => void;
}) {
  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-blue",
          text: "text-blue",
        };
      case "medium":
        return {
          bg: "bg-sage",
          text: "text-sage",
        };
      case "low":
      default:
        return {
          bg: "bg-silver",
          text: "text-silver",
        };
    }
  };

  const colors = getPriorityColors(suggestion.priority);

  return (
    <div className="bg-white rounded-lg border border-silver-light p-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center",
              colors.bg
            )}
          >
            <span className="text-xs font-bold text-white">#{rank}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-text-dark text-sm flex items-center gap-1.5">
              <span>{suggestion.icon}</span>
              <span className="truncate">{suggestion.title}</span>
            </h4>
          </div>

          <p className="text-xs text-text-medium mb-1.5">{suggestion.description}</p>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs">
              <span className="text-text-medium">Action: </span>
              <span className="text-text-dark">{suggestion.action}</span>
            </div>
            {onTransfer && suggestion.targetEnvelopeId && suggestion.amount && (
              <Button
                size="sm"
                onClick={() =>
                  onTransfer(suggestion.targetEnvelopeId!, suggestion.amount!)
                }
                className="bg-sage hover:bg-sage-dark text-white h-6 text-xs px-2.5 flex-shrink-0"
              >
                Transfer
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>

          {suggestion.impactMessage && (
            <p className="text-xs text-sage mt-1.5">{suggestion.impactMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Help icon button to re-show dismissed banner
export function RemyHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-9 w-9 p-0"
      title="Show Remy's guidance"
    >
      <HelpCircle className="h-5 w-5 text-text-medium" />
    </Button>
  );
}
