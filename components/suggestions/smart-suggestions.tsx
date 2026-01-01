"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronDown, ChevronUp, Sparkles, ArrowRight, X } from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import type { SmartSuggestion } from "@/lib/utils/smart-suggestion-generator";
import { cn } from "@/lib/cn";

interface SmartSuggestionsProps {
  className?: string;
  onActionClick?: (suggestion: SmartSuggestion) => void;
}

/**
 * SmartSuggestions - Displays personalized budget suggestions based on "The My Budget Way"
 *
 * Features:
 * - Shows top 3 prioritized suggestions
 * - Expandable cards with Remy's tips
 * - Color-coded by priority (high/medium/low)
 * - Dismissible for the session
 */
export function SmartSuggestions({ className, onActionClick }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isDismissed, setIsDismissed] = useState(false);

  // Load suggestions on mount
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch("/api/suggestions");
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestions();
  }, []);

  // Check session dismissal
  useEffect(() => {
    const dismissed = sessionStorage.getItem("smart-suggestions-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismissAll = () => {
    setIsDismissed(true);
    sessionStorage.setItem("smart-suggestions-dismissed", "true");
  };

  const handleDismissSuggestion = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));

  // If all dismissed or loading with no results, don't show
  if (isDismissed || (visibleSuggestions.length === 0 && !isLoading)) {
    return null;
  }

  // Priority colors
  const priorityColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    high: {
      bg: "bg-blue-light/30",
      border: "border-blue",
      text: "text-blue",
      icon: "text-blue",
    },
    medium: {
      bg: "bg-sage-very-light",
      border: "border-sage-light",
      text: "text-sage-dark",
      icon: "text-sage",
    },
    low: {
      bg: "bg-silver-very-light",
      border: "border-silver-light",
      text: "text-text-medium",
      icon: "text-silver",
    },
  };

  return (
    <Card className={cn("border-sage-light", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-sage-dark">
            <Sparkles className="h-5 w-5 text-gold" />
            Smart Suggestions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-7 w-7 p-0"
            >
              {isMinimized ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              className="h-7 w-7 p-0 text-text-light hover:text-text-medium"
              title="Dismiss suggestions for this session"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-text-medium mt-1">
          Personalized tips based on The My Budget Way
        </p>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse flex items-center gap-2 text-sage">
                <Lightbulb className="h-5 w-5" />
                <span className="text-sm">Analyzing your budget...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSuggestions.slice(0, 3).map((suggestion) => {
                const colors = priorityColors[suggestion.priority] ?? priorityColors.medium;
                const isExpanded = expandedId === suggestion.id;

                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      colors.bg,
                      colors.border
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className={cn("font-medium text-sm", colors.text)}>
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-text-medium mt-0.5 line-clamp-2">
                            {suggestion.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissSuggestion(suggestion.id)}
                          className="h-6 w-6 p-0 text-text-light hover:text-text-medium"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(suggestion.id)}
                          className={cn("h-6 w-6 p-0", colors.icon)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-current/10">
                        {/* Action */}
                        <div className="bg-white/50 rounded-md p-2 mb-3">
                          <p className="text-xs font-medium text-text-dark flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            {suggestion.action}
                          </p>
                          {suggestion.impactMessage && (
                            <p className="text-xs text-sage mt-1 ml-4">
                              {suggestion.impactMessage}
                            </p>
                          )}
                        </div>

                        {/* Remy's tip */}
                        <div className="flex items-start gap-2">
                          <RemyAvatar pose="encouraging" size="sm" className="!w-8 !h-8 !border-2" />
                          <div className="flex-1">
                            <p className="text-xs text-text-medium leading-relaxed italic">
                              "{suggestion.remyTip}"
                            </p>
                            <p className="text-[10px] text-sage mt-1 font-medium">— Remy</p>
                          </div>
                        </div>

                        {/* Action button */}
                        {onActionClick && suggestion.targetEnvelopeId && (
                          <Button
                            size="sm"
                            onClick={() => onActionClick(suggestion)}
                            className="w-full mt-3 bg-sage hover:bg-sage-dark text-white"
                          >
                            Take Action
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleSuggestions.length > 3 && (
                <p className="text-xs text-text-light text-center pt-2">
                  +{visibleSuggestions.length - 3} more suggestions available
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
