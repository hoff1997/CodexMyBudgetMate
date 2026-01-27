"use client";

/**
 * Compact Manual Transfer Tab
 *
 * Space-efficient Manual Transfer interface with:
 * - Single source dropdown at top
 * - Compact table with one row per envelope (~40px)
 * - Per-row Transfer buttons
 * - Priority grouping with thin dividers
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import type { SummaryEnvelope, PriorityLevel } from "@/components/layout/envelopes/envelope-summary-card";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";

interface CompactManualTransferProps {
  envelopes: SummaryEnvelope[];
  onTransfer: (fromId: string, toId: string, amount: number) => Promise<void>;
  onSwitchToSmartFill: () => void;
  onClose: () => void;
}

interface DestinationEnvelope {
  id: string;
  name: string;
  icon: string;
  current: number;
  target: number;
  needs: number;
  priority: PriorityLevel;
}

export function CompactManualTransfer({
  envelopes,
  onTransfer,
  onSwitchToSmartFill,
  onClose,
}: CompactManualTransferProps) {
  // Selected source envelope
  const [sourceId, setSourceId] = useState<string>("");
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  // Get source envelope details
  const sourceEnvelope = useMemo(
    () => envelopes.find((e) => e.id === sourceId),
    [envelopes, sourceId]
  );
  const availableBalance = Number(sourceEnvelope?.current_amount ?? 0);

  // Envelopes that can be sources (have funds)
  const sourceOptions = useMemo(() => {
    return envelopes
      .filter((e) => Number(e.current_amount ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [envelopes]);

  // Destinations (all envelopes except selected source, with shortfall)
  const destinations = useMemo(() => {
    const dests: DestinationEnvelope[] = [];

    for (const env of envelopes) {
      if (env.id === sourceId) continue; // Skip source

      const current = Number(env.current_amount ?? 0);
      const target = Number(env.target_amount ?? 0);
      const isSpending = Boolean(env.is_spending);

      if (isSpending) continue; // Skip spending envelopes

      const needs = Math.max(0, target - current);

      dests.push({
        id: env.id,
        name: env.name,
        icon: env.icon ?? "📁",
        current,
        target,
        needs,
        priority: (env.priority as PriorityLevel) ?? "discretionary",
      });
    }

    // Sort by priority
    const priorityOrder: Record<PriorityLevel, number> = {
      essential: 0,
      important: 1,
      discretionary: 2,
    };
    dests.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return dests;
  }, [envelopes, sourceId]);

  // Group by priority
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

  // Update amount for a destination
  const updateAmount = useCallback((id: string, amount: number) => {
    setAmounts((prev) => ({ ...prev, [id]: Math.max(0, amount) }));
  }, []);

  // Handle single transfer
  const handleTransfer = useCallback(
    async (toId: string) => {
      const amount = amounts[toId] ?? 0;

      if (!sourceId) {
        toast.error("Select a source envelope first");
        return;
      }
      if (amount <= 0) {
        toast.error("Enter an amount to transfer");
        return;
      }
      if (amount > availableBalance) {
        toast.error("Amount exceeds available balance");
        return;
      }

      setTransferringId(toId);
      try {
        await onTransfer(sourceId, toId, amount);
        // Clear the amount after successful transfer
        setAmounts((prev) => ({ ...prev, [toId]: 0 }));
        toast.success("Transfer completed");
      } catch (err) {
        console.error(err);
        toast.error("Transfer failed");
      } finally {
        setTransferringId(null);
      }
    },
    [sourceId, amounts, availableBalance, onTransfer]
  );

  // Fill max amount for a destination
  const fillMax = useCallback(
    (id: string, needs: number) => {
      const maxAmount = Math.min(needs, availableBalance);
      setAmounts((prev) => ({ ...prev, [id]: maxAmount }));
    },
    [availableBalance]
  );

  return (
    <div className="space-y-4">
      {/* Source Selector */}
      <div className="flex items-center gap-4 p-3 bg-silver-very-light/50 rounded-lg border border-silver-light">
        <div className="flex-1">
          <label
            htmlFor="source-select"
            className="block text-xs font-semibold uppercase tracking-wide text-text-light mb-1"
          >
            From
          </label>
          <select
            id="source-select"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-silver-light rounded-lg bg-white focus:border-sage focus:ring-sage"
          >
            <option value="" disabled>
              Select source envelope...
            </option>
            {sourceOptions.map((env) => (
              <option key={env.id} value={env.id}>
                {env.icon ?? "📁"} {env.name} — {formatCurrency(Number(env.current_amount ?? 0))}
              </option>
            ))}
          </select>
        </div>

        {sourceEnvelope && (
          <div className="text-right">
            <span className="text-xs text-text-light block">Available</span>
            <span className="text-lg font-semibold text-sage-dark">
              {formatCurrency(availableBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Destinations Table */}
      {!sourceId ? (
        <div className="text-center py-8 text-text-light text-sm">
          Select a source envelope above to see transfer options.
        </div>
      ) : destinations.length === 0 ? (
        <div className="text-center py-8 text-text-light text-sm">
          No other envelopes available for transfer.
        </div>
      ) : (
        <div className="border border-silver-light rounded-lg overflow-hidden">
          {/* Table Header */}
          <div
            className="grid items-center px-3 py-2 bg-silver-very-light/70 border-b border-silver-light text-[10px] font-semibold uppercase tracking-wide text-text-light"
            style={{
              gridTemplateColumns: "1fr 70px 60px 70px 80px 70px",
              height: "32px",
            }}
          >
            <div>Envelope</div>
            <div className="text-right">Current</div>
            <div className="text-center">Progress</div>
            <div className="text-right">Needs</div>
            <div className="text-center">Amount</div>
            <div className="text-center">Action</div>
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
                  const percentage =
                    dest.target > 0
                      ? Math.min(100, Math.max(0, Math.round((dest.current / dest.target) * 100)))
                      : 0;
                  const amount = amounts[dest.id] ?? 0;
                  const isTransferring = transferringId === dest.id;

                  return (
                    <div
                      key={dest.id}
                      className={cn(
                        "grid items-center px-3 py-1 border-b border-silver-light/40 last:border-b-0",
                        "hover:bg-sage-very-light/30 transition-colors"
                      )}
                      style={{
                        gridTemplateColumns: "1fr 70px 60px 70px 80px 70px",
                        height: "40px",
                      }}
                    >
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
                        {dest.target > 0 ? (
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
                        ) : (
                          <span className="text-xs text-text-light">—</span>
                        )}
                      </div>

                      {/* Needs */}
                      <div className="text-right">
                        {dest.needs > 0 ? (
                          <button
                            type="button"
                            onClick={() => fillMax(dest.id, dest.needs)}
                            className="text-sm font-medium text-blue hover:underline"
                            title="Click to fill this amount"
                          >
                            -${dest.needs.toFixed(0)}
                          </button>
                        ) : (
                          <span className="text-xs text-sage">
                            <Check className="h-3.5 w-3.5 inline" />
                          </span>
                        )}
                      </div>

                      {/* Amount Input */}
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          min="0"
                          max={Math.min(dest.needs || availableBalance, availableBalance)}
                          step="1"
                          value={amount || ""}
                          onChange={(e) => updateAmount(dest.id, Number(e.target.value))}
                          className="w-16 h-6 px-1.5 text-xs text-right border border-silver-light rounded focus:border-sage focus:ring-1 focus:ring-sage"
                          placeholder="0"
                          disabled={isTransferring}
                        />
                      </div>

                      {/* Transfer Button */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleTransfer(dest.id)}
                          disabled={isTransferring || amount <= 0 || amount > availableBalance}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded transition-colors",
                            amount > 0 && amount <= availableBalance
                              ? "bg-sage text-white hover:bg-sage-dark"
                              : "bg-silver-very-light text-text-light cursor-not-allowed"
                          )}
                        >
                          {isTransferring ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Transfer"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-silver-light">
        <button
          type="button"
          onClick={onSwitchToSmartFill}
          className="text-sm text-text-medium hover:text-text-dark"
        >
          Switch to Smart Fill
        </button>

        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
