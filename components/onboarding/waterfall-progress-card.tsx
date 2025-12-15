"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface WaterfallProgressCardProps {
  totalAvailable: number;
  creditCardAllocated: number;
  essentialAllocated: number;
  importantAllocated: number;
  flexibleAllocated: number;
  remaining: number;
}

export function WaterfallProgressCard({
  totalAvailable,
  creditCardAllocated,
  essentialAllocated,
  importantAllocated,
  flexibleAllocated,
  remaining,
}: WaterfallProgressCardProps) {
  // Calculate percentages
  const total = totalAvailable || 1; // Avoid division by zero
  const ccPercent = (creditCardAllocated / total) * 100;
  const essentialPercent = (essentialAllocated / total) * 100;
  const importantPercent = (importantAllocated / total) * 100;
  const flexiblePercent = (flexibleAllocated / total) * 100;
  const remainingPercent = (remaining / total) * 100;

  const totalAllocated = creditCardAllocated + essentialAllocated + importantAllocated + flexibleAllocated;

  // Legend items
  const legendItems = [
    {
      label: "Credit Card",
      amount: creditCardAllocated,
      percent: ccPercent,
      color: "bg-blue",
      textColor: "text-blue",
      show: creditCardAllocated > 0,
    },
    {
      label: "Essential",
      amount: essentialAllocated,
      percent: essentialPercent,
      color: "bg-sage-dark",
      textColor: "text-sage-dark",
      show: essentialAllocated > 0,
    },
    {
      label: "Important",
      amount: importantAllocated,
      percent: importantPercent,
      color: "bg-silver",
      textColor: "text-silver",
      show: importantAllocated > 0,
    },
    {
      label: "Flexible",
      amount: flexibleAllocated,
      percent: flexiblePercent,
      color: "bg-[#6B9ECE]",
      textColor: "text-[#6B9ECE]",
      show: flexibleAllocated > 0,
    },
    {
      label: "Remaining",
      amount: remaining,
      percent: remainingPercent,
      color: "bg-silver-light",
      textColor: "text-text-light",
      show: remaining > 0,
    },
  ];

  return (
    <Card className="p-4 bg-white border border-silver-light">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-dark">
          Allocation Summary
        </h3>
        <div className="text-right">
          <span className="text-xs text-text-medium">
            ${totalAllocated.toLocaleString()} of ${totalAvailable.toLocaleString()} allocated
          </span>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div className="h-6 rounded-full overflow-hidden flex bg-silver-very-light mb-4">
        {/* Credit Card segment */}
        {ccPercent > 0 && (
          <div
            className="bg-blue h-full transition-all duration-300"
            style={{ width: `${ccPercent}%` }}
            title={`Credit Card: $${creditCardAllocated.toLocaleString()}`}
          />
        )}

        {/* Essential segment */}
        {essentialPercent > 0 && (
          <div
            className="bg-sage-dark h-full transition-all duration-300"
            style={{ width: `${essentialPercent}%` }}
            title={`Essential: $${essentialAllocated.toLocaleString()}`}
          />
        )}

        {/* Important segment */}
        {importantPercent > 0 && (
          <div
            className="bg-silver h-full transition-all duration-300"
            style={{ width: `${importantPercent}%` }}
            title={`Important: $${importantAllocated.toLocaleString()}`}
          />
        )}

        {/* Flexible segment */}
        {flexiblePercent > 0 && (
          <div
            className="bg-[#6B9ECE] h-full transition-all duration-300"
            style={{ width: `${flexiblePercent}%` }}
            title={`Flexible: $${flexibleAllocated.toLocaleString()}`}
          />
        )}

        {/* Remaining segment (empty/unfilled) */}
        {/* This is handled by the background color */}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {legendItems
          .filter((item) => item.show)
          .map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", item.color)} />
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-text-medium">{item.label}:</span>
                <span className={cn("text-sm font-semibold", item.textColor)}>
                  ${item.amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Quick stats */}
      {remaining > 0 && (
        <div className="mt-3 pt-3 border-t border-silver-light">
          <p className="text-xs text-text-medium">
            <span className="font-semibold text-sage">
              ${remaining.toLocaleString()}
            </span>{" "}
            remaining to allocate
          </p>
        </div>
      )}

      {remaining <= 0 && totalAllocated >= totalAvailable && (
        <div className="mt-3 pt-3 border-t border-silver-light">
          <p className="text-xs text-sage-dark font-medium">
            ✓ All funds have been allocated
          </p>
        </div>
      )}
    </Card>
  );
}
