"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, Zap, HelpCircle, ArrowRight, X } from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { cn } from "@/lib/cn";
import { SeasonalPattern, SEASONAL_PATTERNS } from "@/lib/utils/seasonal-bills";

interface SeasonalBillDetectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeName: string;
  matchedKeyword: string;
  suggestedPattern: SeasonalPattern;
  confidence: "high" | "medium" | "low";
  onSetupLeveling: (method: "12-month" | "quick-estimate") => void;
  onSkip: () => void;
}

/**
 * Dialog shown when we detect a bill that might benefit from leveling.
 * Explains the concept and offers setup options.
 */
export function SeasonalBillDetectionDialog({
  open,
  onOpenChange,
  envelopeName,
  matchedKeyword,
  suggestedPattern,
  confidence,
  onSetupLeveling,
  onSkip,
}: SeasonalBillDetectionDialogProps) {
  const pattern = SEASONAL_PATTERNS[suggestedPattern];

  const getPatternIcon = () => {
    if (suggestedPattern === "winter-peak") {
      return <Thermometer className="h-5 w-5 text-blue" />;
    }
    if (suggestedPattern === "summer-peak") {
      return <Droplets className="h-5 w-5 text-blue" />;
    }
    return <Zap className="h-5 w-5 text-gold" />;
  };

  const getConfidenceBadge = () => {
    const colors = {
      high: "bg-sage-very-light text-sage-dark border-sage-light",
      medium: "bg-gold-light text-gold-dark border-gold",
      low: "bg-silver-very-light text-text-medium border-silver-light",
    };
    const labels = {
      high: "Highly likely seasonal",
      medium: "Possibly seasonal",
      low: "May be seasonal",
    };
    return (
      <Badge variant="outline" className={cn("text-xs", colors[confidence])}>
        {labels[confidence]}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <RemyAvatar pose="thinking" size="sm" />
            <div>
              <DialogTitle className="text-lg">
                Looks like "{envelopeName}" might be seasonal
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Would you like to level out the payments?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detection info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPatternIcon()}
              <span className="text-sm font-medium">{pattern?.name || "Seasonal"}</span>
            </div>
            {getConfidenceBadge()}
          </div>

          {/* Explanation card */}
          <Card className="p-4 bg-sage-very-light border-sage-light">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <HelpCircle className="h-4 w-4 text-sage" />
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-text-dark">What is bill leveling?</p>
                <p className="text-text-medium">
                  Instead of paying varying amounts each month (higher in{" "}
                  {suggestedPattern === "winter-peak" ? "winter" : "summer"}, lower in{" "}
                  {suggestedPattern === "winter-peak" ? "summer" : "winter"}), you save a
                  consistent amount each pay cycle.
                </p>
                <p className="text-text-medium">
                  This builds a buffer during low season that covers the higher bills during
                  peak season - no surprises, no stress.
                </p>
              </div>
            </div>
          </Card>

          {/* Pattern description */}
          {pattern && (
            <div className="text-xs text-muted-foreground bg-silver-very-light rounded-lg p-3">
              <p>
                <span className="font-medium">{pattern.name}:</span> {pattern.description}
              </p>
              {pattern.examples.length > 0 && (
                <p className="mt-1">
                  Common examples: {pattern.examples.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Setup options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-dark">
              How would you like to set this up?
            </p>

            <div className="grid gap-2">
              {/* 12-month entry option */}
              <button
                type="button"
                onClick={() => onSetupLeveling("12-month")}
                className="w-full p-3 text-left rounded-lg border border-sage-light hover:border-sage hover:bg-sage-very-light transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-dark group-hover:text-sage-dark">
                      Enter 12 months of bills
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Most accurate - enter each month's actual amount
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-sage opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              {/* Quick estimate option */}
              <button
                type="button"
                onClick={() => onSetupLeveling("quick-estimate")}
                className="w-full p-3 text-left rounded-lg border border-silver-light hover:border-sage hover:bg-sage-very-light transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-dark group-hover:text-sage-dark">
                      Quick estimate
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Just enter your typical high and low season bills
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-sage opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Skip for now
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            You can set this up later from the envelope settings
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
