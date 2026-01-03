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
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
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

// Journey stage configuration
type JourneyStage = {
  key: string;
  title: string;
  description: string;
  icon: typeof Shield;
  color: "sage" | "blue" | "gold";
};

const JOURNEY_STAGES: Record<string, JourneyStage> = {
  starter_stash: {
    key: "starter_stash",
    title: "Building Your Starter Stash",
    description: "First $1,000 for emergencies",
    icon: Shield,
    color: "sage",
  },
  debt_payoff: {
    key: "debt_payoff",
    title: "Paying Down Debt",
    description: "Tackling high-interest debt first",
    icon: CreditCard,
    color: "blue",
  },
  safety_net: {
    key: "safety_net",
    title: "Building Your Safety Net",
    description: "3-6 months of expenses saved",
    icon: Target,
    color: "sage",
  },
  goals: {
    key: "goals",
    title: "Growing Your Goals",
    description: "Investing in your future",
    icon: TrendingUp,
    color: "sage",
  },
  balanced: {
    key: "balanced",
    title: "Budget Balanced",
    description: "All income allocated",
    icon: CheckCircle2,
    color: "sage",
  },
  over_allocated: {
    key: "over_allocated",
    title: "Budget Over-Allocated",
    description: "Reduce allocations to balance",
    icon: AlertTriangle,
    color: "blue",
  },
};

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
    const dismissed = localStorage.getItem("allocation-banner-dismissed");
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
    localStorage.setItem("allocation-banner-dismissed", "true");
    setIsDismissed(true);
  };

  // Critical states show even if dismissed
  const isCritical = allocationState === "over" || allocationState === "under";

  if (isDismissed && !isCritical) {
    return null;
  }

  // Determine current journey stage
  const getJourneyStage = (): JourneyStage => {
    if (allocationState === "over") {
      return JOURNEY_STAGES.over_allocated;
    }
    if (allocationState === "balanced") {
      return JOURNEY_STAGES.balanced;
    }
    // Default to starter stash for under-allocated (suggestions will refine this)
    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      if (topSuggestion.type === "starter_stash") return JOURNEY_STAGES.starter_stash;
      if (topSuggestion.type === "debt_payoff") return JOURNEY_STAGES.debt_payoff;
      if (topSuggestion.type === "emergency_fund") return JOURNEY_STAGES.safety_net;
      if (topSuggestion.type === "savings_goal") return JOURNEY_STAGES.goals;
    }
    return JOURNEY_STAGES.starter_stash;
  };

  const journeyStage = getJourneyStage();
  const StageIcon = journeyStage.icon;

  // Color classes for icon backgrounds
  const iconBgClasses: Record<string, string> = {
    sage: "bg-sage-light",
    blue: "bg-blue-light",
    gold: "bg-gold-light",
  };

  const iconTextClasses: Record<string, string> = {
    sage: "text-sage-dark",
    blue: "text-blue",
    gold: "text-gold",
  };

  const bannerBgClasses: Record<string, string> = {
    sage: "bg-sage-very-light border-sage-light",
    blue: "bg-blue-light/30 border-blue-light",
    gold: "bg-gold-light/30 border-gold",
  };

  // Compact mode - inline banner for header
  if (compact) {
    return (
      <div className={cn("flex-1 mr-3", className)}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full rounded-xl border px-3 py-2.5 text-left hover:opacity-90 transition-opacity",
            bannerBgClasses[journeyStage.color]
          )}
        >
          <div className="flex items-center gap-3">
            {/* Journey stage icon */}
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                iconBgClasses[journeyStage.color]
              )}
            >
              <StageIcon className={cn("h-5 w-5", iconTextClasses[journeyStage.color])} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Top row: Stage title + Amount */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h4 className="font-semibold text-text-dark text-sm">
                  {journeyStage.title}
                </h4>

                {allocationState === "under" && (
                  <span className="text-sm font-semibold text-sage-dark">
                    ${unallocatedAmount.toFixed(2)} to allocate
                  </span>
                )}

                {allocationState === "over" && (
                  <span className="text-sm font-semibold text-blue">
                    ${overAllocatedAmount.toFixed(2)} over
                  </span>
                )}
              </div>

              {/* Bottom row: Description + CTA */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-medium">
                  {journeyStage.description}
                </p>

                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs", iconTextClasses[journeyStage.color])}>
                    {isExpanded ? "Hide" : "See suggestions"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className={cn("h-3.5 w-3.5", iconTextClasses[journeyStage.color])} />
                  ) : (
                    <ChevronDown className={cn("h-3.5 w-3.5", iconTextClasses[journeyStage.color])} />
                  )}
                  {suggestions.length > 0 && !isExpanded && (
                    <span className="text-xs text-text-light">
                      ({suggestions.length})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dismiss button (only for non-critical) */}
            {!isCritical && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="flex-shrink-0 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </button>

        {/* Expanded suggestions dropdown */}
        {isExpanded && (
          <div className="mt-2 bg-white rounded-xl border border-silver-light shadow-lg p-4">
            {isLoadingSuggestions ? (
              <div className="flex items-center gap-2 py-3 text-sage">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analysing your budget...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <>
                <p className="text-sm text-text-dark mb-3">
                  Here's where to put that ${unallocatedAmount.toFixed(2)}:
                </p>
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
                <p className="text-xs text-text-medium mt-3 text-center">
                  Suggestions powered by The My Budget Way
                </p>
              </>
            ) : (
              <p className="text-sm text-text-medium">
                {allocationState === "over"
                  ? "Reduce allocations in your envelopes below to balance your budget."
                  : "Allocate your remaining income to envelopes below."}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode - larger banner with more details
  const getBannerContent = () => {
    // CRITICAL: Over-allocated
    if (allocationState === "over") {
      return {
        stage: JOURNEY_STAGES.over_allocated,
        canDismiss: false,
        content: (
          <>
            <div className="mb-3">
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
        stage: journeyStage,
        canDismiss: false,
        content: (
          <>
            <div className="mb-3">
              <p className="text-sm text-text-dark mb-2">
                This is money from your income that isn't assigned to any envelope yet.
                Let's give it a job:
              </p>
            </div>

            {/* Explanation box */}
            <div className="bg-white rounded-lg border border-sage-light p-2.5 mb-3 text-xs">
              <div className="font-semibold text-text-dark mb-1">
                Budget Allocation vs Envelope Balance:
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
                  Suggested allocations:
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
        stage: journeyStage,
        canDismiss: false,
        content: (
          <p className="text-sm text-text-dark">
            This income isn't assigned to any envelope yet. Allocate it below
            to complete your budget plan.
          </p>
        ),
      };
    }

    // DEFAULT: All good
    return {
      stage: JOURNEY_STAGES.balanced,
      canDismiss: true,
      content: (
        <p className="text-sm text-text-dark">
          You're telling your money exactly where to go. Great job!
        </p>
      ),
    };
  };

  const banner = getBannerContent();
  const BannerIcon = banner.stage.icon;

  return (
    <div className={cn("relative rounded-xl border p-4", bannerBgClasses[banner.stage.color], className)}>
      <div className="flex items-start gap-3">
        {/* Journey stage icon */}
        <div
          className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
            iconBgClasses[banner.stage.color]
          )}
        >
          <BannerIcon className={cn("h-6 w-6", iconTextClasses[banner.stage.color])} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header with title and amount */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="font-semibold text-text-dark">
              {banner.stage.title}
            </h4>
            {allocationState === "under" && (
              <span className="text-sm font-semibold text-sage-dark">
                ${unallocatedAmount.toFixed(2)} to allocate
              </span>
            )}
            {allocationState === "over" && (
              <span className="text-sm font-semibold text-blue">
                ${overAllocatedAmount.toFixed(2)} over
              </span>
            )}
          </div>

          {banner.content}

          <p className="text-xs text-text-medium mt-3 text-center">
            Suggestions powered by The My Budget Way
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

// Suggestion card component - Compact styling
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

// Help icon button with Remy avatar
export function RemyHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-9 w-9 p-0 border-silver-light hover:border-sage-light hover:bg-sage-very-light overflow-hidden"
      title="Ask Remy for help"
    >
      <RemyAvatar pose="small" size="sm" className="!w-7 !h-7 !border-0" />
    </Button>
  );
}
