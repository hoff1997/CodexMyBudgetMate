"use client";

import { CheckCircle2, Circle, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type StepStatus = "completed" | "active" | "locked" | "pending";

export interface AllocationStepProps {
  icon: string;
  title: string;
  description: string;
  status: StepStatus;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  progress?: {
    current: number;
    target: number;
  };
}

export function AllocationStep({
  icon,
  title,
  description,
  status,
  ctaText,
  ctaHref,
  onCtaClick,
  progress,
}: AllocationStepProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isActive = status === "active";

  const progressPercent = progress
    ? Math.min(100, (progress.current / progress.target) * 100)
    : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-all",
        isLocked && "bg-gray-50 border-gray-200 opacity-60",
        isCompleted && "bg-sage-very-light/50 border-sage-light",
        isActive && "bg-white border-sage shadow-sm ring-1 ring-sage/20",
        !isLocked && !isCompleted && !isActive && "bg-white border-silver-light"
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0",
          isLocked && "bg-gray-100",
          isCompleted && "bg-sage-light",
          isActive && "bg-sage-very-light border border-sage",
          !isLocked && !isCompleted && !isActive && "bg-silver-very-light"
        )}
      >
        {isLocked ? (
          <Lock className="h-5 w-5 text-gray-400" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-sage-dark" />
        ) : (
          icon
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-semibold",
            isLocked && "text-text-light",
            isCompleted && "text-sage-dark",
            isActive && "text-text-dark",
            !isLocked && !isCompleted && !isActive && "text-text-medium"
          )}
        >
          {title}
        </div>
        <div
          className={cn(
            "text-sm mt-0.5",
            isLocked && "text-text-light italic",
            isCompleted && "text-text-medium",
            isActive && "text-text-medium",
            !isLocked && !isCompleted && !isActive && "text-text-light"
          )}
        >
          {description}
        </div>

        {/* Progress bar for active step */}
        {isActive && progress && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-silver-very-light rounded-full overflow-hidden">
              <div
                className="h-full bg-sage rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-sage-dark font-medium">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* CTA or Status */}
      <div className="flex-shrink-0">
        {isLocked ? (
          <span className="text-xs text-gray-400 uppercase font-medium">
            Locked
          </span>
        ) : isCompleted ? (
          <span className="text-xs text-sage-dark uppercase font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
          </span>
        ) : ctaText ? (
          ctaHref ? (
            <Button asChild size="sm" variant={isActive ? "default" : "outline"}>
              <a href={ctaHref}>
                {ctaText}
                <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
          ) : (
            <Button
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={onCtaClick}
            >
              {ctaText}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}

// Allocation step list container
export function AllocationStepList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}
