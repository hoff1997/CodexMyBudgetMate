"use client";

/**
 * Compact Smart Fill Tab
 *
 * Space-efficient Smart Fill interface with:
 * - Surplus source pills at top
 * - Compact table with one row per envelope (~40px)
 * - Priority grouping with thin dividers
 * - Checkbox selection for batch transfers
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import type { SummaryEnvelope, PriorityLevel } from "@/components/layout/envelopes/envelope-summary-card";
import { CheckCircle, Loader2, ArrowRight, X } from "lucide-react";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

interface CompactSmartFillProps {
  envelopes: SummaryEnvelope[];
  onApplyTransfers: (transfers: Array<{ fromId: string; toId: string; amount: number }>) => Promise<void>;
  onSwitchToManual: () => void;
  isApplying: boolean;
  onClose: () => void;
}

interface SourceEnvelope {
  id: string;
  name: string;
  icon: string;
  surplus: number;
  selected: boolean;
}

interface DestinationEnvelope {
  id: string;
  name: string;
  icon: string;
  current: number;
  target: number;
  needs: number;
  fillAmount: number;
  selected: boolean;
  priority: PriorityLevel;
}

export function CompactSmartFill({
  envelopes,
  onApplyTransfers,
  onSwitchToManual,
  isApplying,
  onClose,
}: CompactSmartFillProps) {
  // Identify sources (surplus) and destinations (shortfall)
  const { initialSources, initialDestinations } = useMemo(() => {
    const sources: SourceEnvelope[] = [];
    const destinations: DestinationEnvelope[] = [];

    for (const env of envelopes) {
      const current = Number(env.current_amount ?? 0);
      const target = Number(env.target_amount ?? 0);
      const isSpending = Boolean(env.is_spending);

      if (isSpending) continue; // Skip spending envelopes

      const diff = current - target;

      if (target > 0 && diff > 0.01) {
        // Surplus
        sources.push({
          id: env.id,
          name: env.name,
          icon: env.icon ?? "📁",
          surplus: diff,
          selected: true, // Select all by default
        });
      } else if (target > 0 && diff < -0.01) {
        // Shortfall
        destinations.push({
          id: env.id,
          name: env.name,
          icon: env.icon ?? "📁",
          current,
          target,
          needs: Math.abs(diff),
          fillAmount: 0,
          selected: false,
          priority: (env.priority as PriorityLevel) ?? "discretionary",
        });
      }
    }

    // Sort destinations by priority
    const priorityOrder: Record<PriorityLevel, number> = {
      essential: 0,
      important: 1,
      discretionary: 2,
    };
    destinations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { initialSources: sources, initialDestinations: destinations };
  }, [envelopes]);

  const [sources, setSources] = useState<SourceEnvelope[]>(initialSources);
  const [destinations, setDestinations] = useState<DestinationEnvelope[]>(initialDestinations);

  // Calculate available from selected sources
  const totalAvailable = useMemo(
    () => sources.filter((s) => s.selected).reduce((sum, s) => sum + s.surplus, 0),
    [sources]
  );

  // Calculate total to fill from selected destinations
  const totalToFill = useMemo(
    () => destinations.filter((d) => d.selected).reduce((sum, d) => sum + d.fillAmount, 0),
    [destinations]
  );

  // Toggle source selection
  const toggleSource = useCallback((id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  }, []);

  // Toggle destination selection and auto-fill
  const toggleDestination = useCallback(
    (id: string) => {
      setDestinations((prev) => {
        const updated = prev.map((d) => {
          if (d.id !== id) return d;
          const newSelected = !d.selected;
          return {
            ...d,
            selected: newSelected,
            fillAmount: newSelected ? d.needs : 0,
          };
        });

        // Validate total doesn't exceed available
        const newTotal = updated.filter((d) => d.selected).reduce((sum, d) => sum + d.fillAmount, 0);
        if (newTotal > totalAvailable) {
          // Reduce the newly selected item's fill amount
          return updated.map((d) => {
            if (d.id !== id) return d;
            const overflow = newTotal - totalAvailable;
            const adjustedFill = Math.max(0, d.fillAmount - overflow);
            return { ...d, fillAmount: adjustedFill };
          });
        }
        return updated;
      });
    },
    [totalAvailable]
  );

  // Update fill amount for a destination
  const updateFillAmount = useCallback(
    (id: string, amount: number) => {
      setDestinations((prev) => {
        const dest = prev.find((d) => d.id === id);
        if (!dest) return prev;

        const clampedAmount = Math.max(0, Math.min(amount, dest.needs));
        const otherTotal = prev
          .filter((d) => d.id !== id && d.selected)
          .reduce((sum, d) => sum + d.fillAmount, 0);

        const maxAllowed = totalAvailable - otherTotal;
        const finalAmount = Math.min(clampedAmount, maxAllowed);

        return prev.map((d) =>
          d.id === id
            ? { ...d, fillAmount: finalAmount, selected: finalAmount > 0 }
            : d
        );
      });
    },
    [totalAvailable]
  );

  // Smart fill all - distribute available to destinations by priority
  const smartFillAll = useCallback(() => {
    let remaining = totalAvailable;
    const updated = destinations.map((d) => {
      if (remaining <= 0) return { ...d, fillAmount: 0, selected: false };
      const fillAmount = Math.min(d.needs, remaining);
      remaining -= fillAmount;
      return { ...d, fillAmount, selected: fillAmount > 0 };
    });
    setDestinations(updated);
  }, [destinations, totalAvailable]);

  // Clear all selections
  const clearAll = useCallback(() => {
    setDestinations((prev) =>
      prev.map((d) => ({ ...d, fillAmount: 0, selected: false }))
    );
  }, []);

  // Generate transfers
  const generateTransfers = useCallback(() => {
    const selectedSources = sources.filter((s) => s.selected);
    const selectedDests = destinations.filter((d) => d.selected && d.fillAmount > 0);

    if (selectedSources.length === 0 || selectedDests.length === 0) return [];

    const transfers: Array<{ fromId: string; toId: string; amount: number }> = [];
    const sourceRemaining = new Map<string, number>();
    selectedSources.forEach((s) => sourceRemaining.set(s.id, s.surplus));

    for (const dest of selectedDests) {
      let amountNeeded = dest.fillAmount;

      for (const source of selectedSources) {
        if (amountNeeded <= 0) break;
        const available = sourceRemaining.get(source.id) ?? 0;
        if (available <= 0) continue;

        const transferAmount = Math.min(available, amountNeeded);
        transfers.push({
          fromId: source.id,
          toId: dest.id,
          amount: Math.round(transferAmount * 100) / 100,
        });

        sourceRemaining.set(source.id, available - transferAmount);
        amountNeeded -= transferAmount;
      }
    }

    return transfers;
  }, [sources, destinations]);

  // Handle apply
  const handleApply = async () => {
    const transfers = generateTransfers();
    if (transfers.length > 0) {
      await onApplyTransfers(transfers);
    }
  };

  // Group destinations by priority
  const groupedDestinations = useMemo(() => {
    const groups: Record<string, DestinationEnvelope[]> = {
      essential: [],
      important: [],
      discretionary: [],
    };

    for (const dest of destinations) {
      groups[dest.priority].push(dest);
    }

    return groups;
  }, [destinations]);

  const hasNoSources = sources.length === 0;
  const hasNoDestinations = destinations.length === 0;
  const hasSelections = destinations.some((d) => d.selected && d.fillAmount > 0);

  return (
    <div className="space-y-4">
      {/* Sources - Surplus Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-light">
            Sources (Surplus)
          </h3>
          <span className="text-xs text-text-medium">
            Available: <span className="font-semibold text-sage-dark">{formatCurrency(totalAvailable)}</span>
          </span>
        </div>

        {hasNoSources ? (
          <p className="text-sm text-text-light py-2">
            No envelopes have surplus funds to transfer.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => toggleSource(source.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                  source.selected
                    ? "bg-sage-light text-sage-dark border border-sage"
                    : "bg-silver-very-light text-text-medium border border-silver-light hover:border-sage-light"
                )}
              >
                <EnvelopeIcon icon={source.icon || "wallet"} size={16} />
                <span className="font-medium">{source.name}</span>
                <span className="text-xs">+{formatCurrency(source.surplus)}</span>
                {source.selected && <CheckCircle className="h-3.5 w-3.5 ml-0.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      {!hasNoSources && <hr className="border-silver-light" />}

      {/* Destinations Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-light">
            Destinations (Need Funds)
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={smartFillAll}
              disabled={hasNoDestinations || totalAvailable <= 0}
              className="text-xs text-sage hover:text-sage-dark font-medium disabled:opacity-50"
            >
              Fill All
            </button>
            <span className="text-silver">|</span>
            <button
              type="button"
              onClick={clearAll}
              disabled={!hasSelections}
              className="text-xs text-text-medium hover:text-text-dark disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        {hasNoDestinations ? (
          <p className="text-sm text-text-light py-2">
            All envelopes are fully funded. Great job!
          </p>
        ) : (
          <div className="border border-silver-light rounded-lg overflow-hidden">
            {/* Table Header */}
            <div
              className="grid items-center px-3 py-2 bg-silver-very-light/70 border-b border-silver-light text-[10px] font-semibold uppercase tracking-wide text-text-light"
              style={{
                gridTemplateColumns: "32px 1fr 70px 60px 70px 70px 60px",
                height: "32px",
              }}
            >
              <div></div>
              <div>Envelope</div>
              <div className="text-right">Current</div>
              <div className="text-center">Progress</div>
              <div className="text-right">Needs</div>
              <div className="text-center">Fill</div>
              <div className="text-center">Status</div>
            </div>

            {/* Priority Groups */}
            {(["essential", "important", "discretionary"] as const).map((priority) => {
              const group = groupedDestinations[priority];
              if (group.length === 0) return null;

              return (
                <div key={priority}>
                  {/* Priority Header */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-silver-very-light/30">
                    <div className="flex-1 h-px bg-silver-light" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-text-light">
                      {priority}
                    </span>
                    <div className="flex-1 h-px bg-silver-light" />
                  </div>

                  {/* Rows */}
                  {group.map((dest) => {
                    const percentage = dest.target > 0
                      ? Math.min(100, Math.max(0, Math.round((dest.current / dest.target) * 100)))
                      : 0;

                    return (
                      <div
                        key={dest.id}
                        className={cn(
                          "grid items-center px-3 py-1 border-b border-silver-light/40 last:border-b-0",
                          "hover:bg-sage-very-light/30 transition-colors"
                        )}
                        style={{
                          gridTemplateColumns: "32px 1fr 70px 60px 70px 70px 60px",
                          height: "40px",
                        }}
                      >
                        {/* Checkbox */}
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={dest.selected}
                            onChange={() => toggleDestination(dest.id)}
                            className="h-4 w-4 rounded border-silver text-sage focus:ring-sage cursor-pointer"
                          />
                        </div>

                        {/* Envelope */}
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <EnvelopeIcon icon={dest.icon || "wallet"} size={16} />
                          <span className="text-sm font-medium text-text-dark truncate">
                            {dest.name}
                          </span>
                        </div>

                        {/* Current */}
                        <div className="text-right text-sm text-text-dark">
                          ${dest.current.toFixed(0)}
                        </div>

                        {/* Progress */}
                        <div className="flex items-center justify-center">
                          <div className="w-10 h-1.5 bg-silver-very-light rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  percentage >= 100
                                    ? "#7C9A82"
                                    : percentage >= 50
                                    ? "#B8D4BE"
                                    : "#6B9ECE",
                              }}
                            />
                          </div>
                        </div>

                        {/* Needs */}
                        <div className="text-right">
                          <span className="text-sm font-medium text-blue">
                            -${dest.needs.toFixed(0)}
                          </span>
                        </div>

                        {/* Fill Input */}
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="0"
                            max={dest.needs}
                            step="1"
                            value={dest.fillAmount || ""}
                            onChange={(e) => updateFillAmount(dest.id, Number(e.target.value))}
                            className="w-14 h-6 px-1.5 text-xs text-right border border-silver-light rounded focus:border-sage focus:ring-1 focus:ring-sage"
                            placeholder="0"
                          />
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-center">
                          {dest.fillAmount >= dest.needs ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-sage font-medium">
                              <CheckCircle className="h-3 w-3" />
                            </span>
                          ) : dest.fillAmount > 0 ? (
                            <span className="text-[10px] text-blue font-medium">Partial</span>
                          ) : (
                            <span className="text-[10px] text-text-light">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary & Actions */}
      {hasSelections && (
        <>
          <hr className="border-silver-light" />
          <div className="flex items-center justify-between px-3 py-2 bg-sage-very-light/40 rounded-lg">
            <div className="text-sm text-text-medium">
              Moving{" "}
              <span className="font-semibold text-sage-dark">{formatCurrency(totalToFill)}</span>
              {" "}to {destinations.filter((d) => d.selected).length} envelope
              {destinations.filter((d) => d.selected).length !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-text-light">
              Remaining: {formatCurrency(totalAvailable - totalToFill)}
            </div>
          </div>
        </>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-silver-light">
        <button
          type="button"
          onClick={onSwitchToManual}
          className="text-sm text-text-medium hover:text-text-dark"
        >
          Switch to Manual
        </button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!hasSelections || isApplying}
            className="bg-sage hover:bg-sage-dark text-white"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                Apply Transfers
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
