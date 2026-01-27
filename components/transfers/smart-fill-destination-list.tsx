"use client";

/**
 * Smart Fill Destination List
 *
 * Shows envelopes that need topping up, grouped by priority.
 * Displays fill amounts and allows adjustment.
 */

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import { getProgressColor } from "@/lib/utils/progress-colors";
import { cn } from "@/lib/cn";
import type { SmartFillDestination } from "@/lib/utils/smart-fill-calculator";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

interface SmartFillDestinationListProps {
  destinations: SmartFillDestination[];
  totalNeeded: number;
  totalAvailable: number;
  onUpdateFillAmount: (envelopeId: string, amount: number) => void;
}

const PRIORITY_CONFIG = {
  essential: {
    label: "Essential",
    dotColor: "bg-sage-dark",
    bgColor: "bg-sage-very-light/50",
    borderColor: "border-sage-light",
  },
  important: {
    label: "Important",
    dotColor: "bg-silver",
    bgColor: "bg-silver-very-light/50",
    borderColor: "border-silver-light",
  },
  flexible: {
    label: "Flexible",
    dotColor: "bg-blue",
    bgColor: "bg-blue-light/30",
    borderColor: "border-blue/30",
  },
};

export function SmartFillDestinationList({
  destinations,
  totalNeeded,
  totalAvailable,
  onUpdateFillAmount,
}: SmartFillDestinationListProps) {
  // Group destinations by priority
  const essential = destinations.filter((d) => d.priority === 1);
  const important = destinations.filter((d) => d.priority === 2);
  const flexible = destinations.filter((d) => d.priority === 3);

  if (destinations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-sage-light bg-sage-very-light/30 p-6">
        <div className="text-center">
          <CheckCircle className="h-10 w-10 mx-auto mb-2 text-sage" />
          <p className="text-sm font-medium text-sage-dark">
            All envelopes are on track!
          </p>
          <p className="mt-1 text-xs text-text-light">
            Nothing needs topping up right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-dark uppercase tracking-wide">
            Needs Topping Up
          </h3>
          <p className="text-xs text-text-light mt-0.5">
            Sorted by priority - Essential first
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-medium">Shortfall:</p>
          <p className="text-lg font-bold text-blue">
            {formatCurrency(totalNeeded)}
          </p>
        </div>
      </div>

      {/* Priority Groups */}
      {essential.length > 0 && (
        <PriorityGroup
          priority="essential"
          destinations={essential}
          totalAvailable={totalAvailable}
          onUpdateFillAmount={onUpdateFillAmount}
        />
      )}

      {important.length > 0 && (
        <PriorityGroup
          priority="important"
          destinations={important}
          totalAvailable={totalAvailable}
          onUpdateFillAmount={onUpdateFillAmount}
        />
      )}

      {flexible.length > 0 && (
        <PriorityGroup
          priority="flexible"
          destinations={flexible}
          totalAvailable={totalAvailable}
          onUpdateFillAmount={onUpdateFillAmount}
        />
      )}
    </div>
  );
}

function PriorityGroup({
  priority,
  destinations,
  totalAvailable,
  onUpdateFillAmount,
}: {
  priority: "essential" | "important" | "flexible";
  destinations: SmartFillDestination[];
  totalAvailable: number;
  onUpdateFillAmount: (envelopeId: string, amount: number) => void;
}) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <div className={cn("rounded-lg p-3 border", config.bgColor, config.borderColor)}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("w-3 h-3 rounded-full", config.dotColor)} />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-dark">
          {config.label}
        </span>
        <span className="text-xs text-text-light">
          ({destinations.length})
        </span>
      </div>

      <div className="space-y-2">
        {destinations.map((dest) => (
          <DestinationRow
            key={dest.envelopeId}
            destination={dest}
            totalAvailable={totalAvailable}
            onUpdateFillAmount={onUpdateFillAmount}
          />
        ))}
      </div>
    </div>
  );
}

function DestinationRow({
  destination,
  totalAvailable,
  onUpdateFillAmount,
}: {
  destination: SmartFillDestination;
  totalAvailable: number;
  onUpdateFillAmount: (envelopeId: string, amount: number) => void;
}) {
  const progressPercent = Math.min(100, Math.max(0, destination.percentage));
  const newPercent = destination.targetAmount > 0
    ? Math.min(100, ((destination.currentAmount + destination.fillAmount) / destination.targetAmount) * 100)
    : 100;

  // Status icon and text
  let StatusIcon = AlertCircle;
  let statusText = "No funds remaining";
  let statusColor = "text-text-light";

  if (destination.isFullyCovered) {
    StatusIcon = CheckCircle;
    statusText = "Fully covered";
    statusColor = "text-sage";
  } else if (destination.fillAmount > 0) {
    StatusIcon = Clock;
    statusText = `${formatCurrency(destination.remaining)} remaining`;
    statusColor = "text-blue";
  }

  return (
    <div className="rounded-lg bg-white/80 p-3 border border-white">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <EnvelopeIcon icon={destination.icon || "wallet"} size={20} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-dark truncate">
              {destination.name}
            </p>
            <p className="text-xs text-text-light">
              {formatCurrency(destination.currentAmount)} / {formatCurrency(destination.targetAmount)}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-blue">
            Needs: {formatCurrency(destination.shortfall)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-sage-very-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: getProgressColor(progressPercent),
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-text-light">
          <span>Current: {progressPercent.toFixed(0)}%</span>
          {destination.fillAmount > 0 && (
            <span className="text-sage">After fill: {newPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>

      {/* Fill Amount Input */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-text-medium mb-1 block">Fill amount:</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-light">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={destination.shortfall}
              value={destination.fillAmount.toFixed(2)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                onUpdateFillAmount(destination.envelopeId, value);
              }}
              className="pl-7 h-9 text-sm border-silver-light focus:border-sage focus:ring-sage"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-5">
          <StatusIcon className={cn("h-4 w-4", statusColor)} />
          <span className={cn("text-xs", statusColor)}>{statusText}</span>
        </div>
      </div>
    </div>
  );
}
