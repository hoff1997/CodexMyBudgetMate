"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SmartSuggestion } from "@/lib/utils/smart-suggestion-generator";
import { cn } from "@/lib/cn";

interface SmartSuggestionsWidgetProps {
  unallocatedAmount: number;
  suggestions: SmartSuggestion[];
}

export function SmartSuggestionsWidget({
  unallocatedAmount,
  suggestions,
}: SmartSuggestionsWidgetProps) {
  const router = useRouter();

  // All allocated
  if (unallocatedAmount <= 0 || suggestions.length === 0) {
    return (
      <Card className="border-sage-light bg-sage-very-light p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sage-light flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-sage" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sage-dark text-sm mb-1">
              All Sorted! ✓
            </h3>
            <p className="text-xs text-text-medium">
              Your income is fully allocated. Nice work!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Get color classes based on priority
  const getColorClasses = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-blue",
          text: "text-blue",
          light: "bg-blue-light/50",
          border: "border-blue-light",
        };
      case "medium":
        return {
          bg: "bg-sage",
          text: "text-sage",
          light: "bg-sage-very-light",
          border: "border-sage-light",
        };
      default:
        return {
          bg: "bg-silver",
          text: "text-text-medium",
          light: "bg-silver-light/50",
          border: "border-silver-light",
        };
    }
  };

  return (
    <Card className="border-sage-light bg-white p-4" id="suggestions">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-sage-light flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-sage" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-dark mb-1">Smart Suggestions</h3>
          <p className="text-sm text-text-medium">
            You have{" "}
            <strong className="text-sage">
              ${unallocatedAmount.toFixed(2)}
            </strong>{" "}
            unallocated income. Here's where to put it:
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.slice(0, 3).map((suggestion, index) => {
          const colors = getColorClasses(suggestion.priority);

          return (
            <div
              key={suggestion.id}
              className={cn(
                "rounded-lg p-3 border",
                colors.light,
                colors.border
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className={cn(
                      "flex items-center justify-center h-6 w-6 rounded-full text-white text-xs font-semibold",
                      colors.bg
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-lg">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-dark text-sm truncate">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-text-medium">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-text-medium">
                  Suggested:{" "}
                  <span className={cn("font-semibold", colors.text)}>
                    ${(suggestion.amount ?? 0).toFixed(2)}
                  </span>
                </div>
                {suggestion.targetEnvelopeId && (
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/allocation?highlight=${suggestion.targetEnvelopeId}`
                      )
                    }
                    className="bg-sage hover:bg-sage-dark text-white h-6 text-xs px-2"
                  >
                    Allocate
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>

              {suggestion.impactMessage && (
                <p className={cn("text-xs mt-1.5", colors.text)}>
                  {suggestion.impactMessage}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {suggestions.length > 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/allocation")}
          className="w-full mt-3 border-sage-light text-sage-dark hover:bg-sage-very-light"
        >
          View All {suggestions.length} Suggestions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      <p className="text-xs text-sage-dark mt-3 text-center">
        Suggestions powered by The My Budget Way
      </p>
    </Card>
  );
}
