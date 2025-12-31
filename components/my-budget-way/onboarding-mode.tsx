"use client";

import { CheckCircle2, Circle, Lock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { RemyTip } from "@/components/onboarding/remy-tip";
import type {
  SuggestedEnvelope,
  CreditCardDebtData,
  MilestoneProgress,
} from "./types";

interface OnboardingModeProps {
  suggestedEnvelopes: SuggestedEnvelope[];
  creditCardDebt?: CreditCardDebtData | null;
  milestoneProgress: MilestoneProgress;
}

interface StepConfig {
  id: string;
  icon: string;
  title: string;
  description: string;
  remyVoice: string;
  lockedRemyVoice?: string;
  ctaText: string;
  ctaHref?: string;
}

export function OnboardingMode({
  suggestedEnvelopes,
  creditCardDebt,
  milestoneProgress,
}: OnboardingModeProps) {
  const hasDebt = creditCardDebt?.hasDebt ?? false;

  // Get current status of each goal
  const getEnvelopeStatus = (suggestionType: string) => {
    const envelope = suggestedEnvelopes.find(
      (e) => e.suggestion_type === suggestionType
    );
    if (!envelope) return { exists: false, progress: 0, isComplete: false };

    const target = Number(envelope.target_amount ?? 0);
    const current = Number(envelope.current_amount ?? 0);
    const progress = target > 0 ? (current / target) * 100 : 0;

    return {
      exists: true,
      progress,
      isComplete: progress >= 100,
      current,
      target,
    };
  };

  const starterStash = getEnvelopeStatus("starter-stash");
  const safetyNet = getEnvelopeStatus("safety-net");
  const ccHolding = getEnvelopeStatus("cc-holding");

  // Debt progress
  const debtProgress = creditCardDebt?.startingDebt
    ? ((creditCardDebt.startingDebt - creditCardDebt.currentDebt) /
        creditCardDebt.startingDebt) *
      100
    : hasDebt
    ? 0
    : 100;
  const isDebtFree = !hasDebt;

  // Define steps with Remy's coaching voice
  const steps: StepConfig[] = [
    {
      id: "envelopes",
      icon: "📊",
      title: "Fill Your Envelopes",
      description:
        "Allocate your income across your spending categories. Start with essentials.",
      remyVoice:
        "Start by covering the basics – rent, bills, groceries. Once those are sorted, the rest feels a lot less stressful.",
      ctaText: "Go to Allocation",
      ctaHref: "/allocation",
    },
    {
      id: "starter-stash",
      icon: "🛡️",
      title: "Build Your Starter Stash",
      description: "Your first $1,000 safety cushion for unexpected expenses.",
      remyVoice:
        "Think of this as your first buffer against life's surprises. $1,000 is a good start – enough to handle most small emergencies without touching your budget.",
      ctaText: "View Starter Stash",
      ctaHref: "/envelopes?filter=suggested",
    },
    {
      id: "debt",
      icon: "💪",
      title: "Smash Your Debt",
      description:
        "Pay off smallest debts first for quick wins. Each win builds momentum.",
      remyVoice:
        "The snowball method works wonders. Pay off your smallest debt first, then roll that payment into the next one. Those early wins really help keep you motivated.",
      ctaText: "View Debts",
      ctaHref: "/accounts?filter=debt",
    },
    {
      id: "safety-net",
      icon: "🌈",
      title: "Grow Your Safety Net",
      description: "Three months of essentials for true peace of mind.",
      remyVoice: hasDebt
        ? "This one unlocks once you're debt-free. Three months of expenses gives you real breathing room – job changes, health issues, whatever life throws at you."
        : "Three months of expenses gives you real breathing room. Take your time building this one – it's a marathon, not a sprint.",
      lockedRemyVoice:
        "Focus on smashing that debt first. Once you're debt-free, this goal unlocks. Good things come to those who stay the course.",
      ctaText: "View Safety Net",
      ctaHref: "/envelopes?filter=suggested",
    },
    {
      id: "cc-holding",
      icon: "💳",
      title: "Credit Card Holding",
      description: "Use your cards as a tool, not a crutch.",
      remyVoice: hasDebt
        ? "This feature unlocks when you're debt-free. It helps you use credit cards responsibly by setting aside money before you spend."
        : "Set aside money before you spend. This way, you're using your card for the perks while always having the cash to back it up.",
      lockedRemyVoice:
        "First things first – clear that debt. Once you're free, this tool helps you use credit cards the right way.",
      ctaText: "View CC Holding",
      ctaHref: "/envelopes?filter=suggested",
    },
  ];

  // Determine step status
  const getStepStatus = (
    step: StepConfig
  ): "completed" | "active" | "locked" | "pending" => {
    switch (step.id) {
      case "envelopes":
        if (milestoneProgress.overallProgress >= 100) return "completed";
        if (milestoneProgress.overallProgress > 0) return "active";
        return "pending";

      case "starter-stash":
        if (starterStash.isComplete) return "completed";
        if (starterStash.progress > 0) return "active";
        return "pending";

      case "debt":
        if (!hasDebt && creditCardDebt?.startingDebt) return "completed";
        if (debtProgress > 0 && hasDebt) return "active";
        if (!creditCardDebt?.hasDebt && !creditCardDebt?.startingDebt)
          return "completed"; // No debt history
        return "pending";

      case "safety-net":
        if (hasDebt) return "locked";
        if (safetyNet.isComplete) return "completed";
        if (safetyNet.progress > 0) return "active";
        return "pending";

      case "cc-holding":
        if (hasDebt) return "locked";
        if (ccHolding.isComplete) return "completed";
        if (ccHolding.progress > 0) return "active";
        return "pending";

      default:
        return "pending";
    }
  };

  const getProgress = (step: StepConfig) => {
    switch (step.id) {
      case "envelopes":
        return {
          current: milestoneProgress.totalCurrent,
          target: milestoneProgress.totalTarget,
          percent: milestoneProgress.overallProgress,
        };
      case "starter-stash":
        return {
          current: starterStash.current ?? 0,
          target: starterStash.target ?? 1000,
          percent: starterStash.progress,
        };
      case "debt":
        return {
          current: creditCardDebt
            ? creditCardDebt.startingDebt - creditCardDebt.currentDebt
            : 0,
          target: creditCardDebt?.startingDebt ?? 0,
          percent: debtProgress,
        };
      case "safety-net":
        return {
          current: safetyNet.current ?? 0,
          target: safetyNet.target ?? 0,
          percent: safetyNet.progress,
        };
      case "cc-holding":
        return {
          current: ccHolding.current ?? 0,
          target: ccHolding.target ?? 0,
          percent: ccHolding.progress,
        };
      default:
        return { current: 0, target: 0, percent: 0 };
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header with Remy */}
      <RemyTip pose="encouraging">
        <div className="space-y-1">
          <p className="font-medium text-text-dark">
            Here&apos;s your path to financial peace of mind.
          </p>
          <p className="text-sm text-text-medium">
            Take it one step at a time – there&apos;s no rush. Each step builds on
            the last, and every bit of progress matters.
          </p>
        </div>
      </RemyTip>

      {/* Steps */}
      <div className="space-y-3 mt-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const progress = getProgress(step);
          const isLocked = status === "locked";
          const isCompleted = status === "completed";
          const isActive = status === "active";

          return (
            <div
              key={step.id}
              className={cn(
                "rounded-xl border p-4 transition-all",
                isLocked && "bg-gray-50 border-gray-200 opacity-70",
                isCompleted && "bg-sage-very-light/50 border-sage-light",
                isActive && "bg-white border-sage shadow-sm ring-1 ring-sage/20",
                !isLocked &&
                  !isCompleted &&
                  !isActive &&
                  "bg-white border-silver-light"
              )}
            >
              {/* Step Header */}
              <div className="flex items-start gap-3">
                {/* Step Number/Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0",
                    isLocked && "bg-gray-100",
                    isCompleted && "bg-sage-light",
                    isActive && "bg-sage-very-light border border-sage",
                    !isLocked &&
                      !isCompleted &&
                      !isActive &&
                      "bg-silver-very-light"
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-sage-dark" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        "font-semibold",
                        isLocked && "text-text-light",
                        isCompleted && "text-sage-dark",
                        isActive && "text-text-dark",
                        !isLocked &&
                          !isCompleted &&
                          !isActive &&
                          "text-text-medium"
                      )}
                    >
                      {step.title}
                    </h3>
                    {isCompleted && (
                      <span className="text-xs text-sage-dark uppercase font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-xs text-gray-400 uppercase font-medium">
                        Locked
                      </span>
                    )}
                  </div>

                  <p
                    className={cn(
                      "text-sm mt-1",
                      isLocked && "text-text-light",
                      !isLocked && "text-text-medium"
                    )}
                  >
                    {step.description}
                  </p>

                  {/* Remy's Voice */}
                  <div
                    className={cn(
                      "mt-3 p-3 rounded-lg text-sm",
                      isLocked
                        ? "bg-gray-100 text-text-light italic"
                        : "bg-sage-very-light/50 text-text-medium"
                    )}
                  >
                    <span className="font-medium text-sage-dark">Remy says:</span>{" "}
                    {isLocked && step.lockedRemyVoice
                      ? step.lockedRemyVoice
                      : step.remyVoice}
                  </div>

                  {/* Progress bar for active step */}
                  {(isActive || isCompleted) && progress.target > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-silver-very-light rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            step.id === "debt"
                              ? "bg-gradient-to-r from-blue-light to-blue"
                              : "bg-gradient-to-r from-sage-light to-sage"
                          )}
                          style={{
                            width: `${Math.min(100, progress.percent)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          step.id === "debt" ? "text-blue" : "text-sage-dark"
                        )}
                      >
                        {progress.percent.toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* CTA Button */}
                  {!isLocked && step.ctaHref && (
                    <div className="mt-3">
                      <Button
                        asChild
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "bg-sage hover:bg-sage-dark" : ""}
                      >
                        <Link href={step.ctaHref}>
                          {step.ctaText}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
