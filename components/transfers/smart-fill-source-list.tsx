"use client";

/**
 * Smart Fill Source List
 *
 * Displays envelopes with surplus available to use as transfer sources.
 * Users can select/deselect which surpluses to include.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import type { SmartFillSource } from "@/lib/utils/smart-fill-calculator";
import { Info } from "lucide-react";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

interface SmartFillSourceListProps {
  sources: SmartFillSource[];
  totalAvailable: number;
  onToggleSource: (envelopeId: string, selected: boolean) => void;
}

export function SmartFillSourceList({
  sources,
  totalAvailable,
  onToggleSource,
}: SmartFillSourceListProps) {
  const selectedCount = sources.filter((s) => s.selected).length;

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-silver-light bg-silver-very-light/50 p-4">
        <div className="text-center text-sm text-text-medium">
          <p className="font-medium">No envelopes have surplus right now.</p>
          <p className="mt-1 text-text-light">
            You can still use Manual Transfer to move money between any envelopes.
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
            Available to Move
          </h3>
          <p className="text-xs text-text-light mt-0.5">
            Select envelopes with surplus to use as source
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-medium">Total:</p>
          <p className="text-lg font-bold text-sage">
            {formatCurrency(totalAvailable)}
          </p>
        </div>
      </div>

      {/* Source List */}
      <div className="space-y-2 rounded-lg border border-silver-light bg-white p-2">
        {sources.map((source) => (
          <SourceRow
            key={source.envelopeId}
            source={source}
            onToggle={(selected) => onToggleSource(source.envelopeId, selected)}
          />
        ))}
      </div>

      {/* Tip */}
      {sources.some((s) => !s.selected && s.subtype === "savings") && (
        <div className="flex items-start gap-2 rounded-lg bg-sage-very-light/50 p-3 text-xs text-text-medium">
          <Info className="h-4 w-4 flex-shrink-0 text-sage mt-0.5" />
          <p>
            <strong>Tip:</strong> We&apos;ve pre-selected smaller surpluses. Your savings
            and emergency fund surpluses are excluded by default.
          </p>
        </div>
      )}
    </div>
  );
}

function SourceRow({
  source,
  onToggle,
}: {
  source: SmartFillSource;
  onToggle: (selected: boolean) => void;
}) {
  const percentage = source.targetAmount > 0
    ? Math.round((source.currentAmount / source.targetAmount) * 100)
    : 100;

  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 cursor-pointer transition",
        source.selected
          ? "bg-sage-very-light/50 border border-sage-light"
          : "bg-silver-very-light/30 border border-transparent hover:bg-silver-very-light/50"
      )}
    >
      <Checkbox
        checked={source.selected}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="data-[state=checked]:bg-sage data-[state=checked]:border-sage"
      />

      <EnvelopeIcon icon={source.icon || "wallet"} size={20} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-dark truncate">
          {source.name}
        </p>
        <p className="text-xs text-text-light">
          {formatCurrency(source.currentAmount)} / {formatCurrency(source.targetAmount)}
          <span className="ml-1 text-sage">({percentage}%)</span>
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-sage-dark">
          Surplus: {formatCurrency(source.surplus)}
        </p>
      </div>
    </label>
  );
}
