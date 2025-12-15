"use client";

/**
 * Smart Fill Tab
 *
 * Main component for the Smart Fill feature.
 * Shows sources with surplus, destinations needing funds,
 * and a summary of proposed transfers.
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import {
  calculateSmartFill,
  updateSourceSelection,
  type SmartFillCalculation,
} from "@/lib/utils/smart-fill-calculator";
import { SmartFillSourceList } from "./smart-fill-source-list";
import { SmartFillDestinationList } from "./smart-fill-destination-list";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";

interface SmartFillTabProps {
  envelopes: SummaryEnvelope[];
  onApplyTransfers: (transfers: Array<{ fromId: string; toId: string; amount: number }>) => Promise<void>;
  onSwitchToManual: () => void;
  isApplying: boolean;
}

export function SmartFillTab({
  envelopes,
  onApplyTransfers,
  onSwitchToManual,
  isApplying,
}: SmartFillTabProps) {
  // Initial calculation
  const initialCalculation = useMemo(
    () => calculateSmartFill(envelopes),
    [envelopes]
  );

  const [calculation, setCalculation] = useState<SmartFillCalculation>(initialCalculation);

  // Handle source toggle
  const handleToggleSource = useCallback((envelopeId: string, selected: boolean) => {
    setCalculation((prev) => updateSourceSelection(prev, envelopeId, selected));
  }, []);

  // Handle fill amount change
  const handleUpdateFillAmount = useCallback((envelopeId: string, amount: number) => {
    setCalculation((prev) => {
      // Manually update the fill amount
      const updatedDestinations = prev.destinations.map((d) => {
        if (d.envelopeId !== envelopeId) return d;
        const fillAmount = Math.max(0, Math.min(amount, d.shortfall));
        return {
          ...d,
          fillAmount,
          remaining: d.shortfall - fillAmount,
          isFullyCovered: d.shortfall - fillAmount <= 0.01,
        };
      });

      // Recalculate totals
      const totalFilling = updatedDestinations.reduce((sum, d) => sum + d.fillAmount, 0);

      // Don't allow exceeding available
      if (totalFilling > prev.totalAvailable) {
        return prev;
      }

      // Regenerate transfers
      const selectedSources = prev.sources.filter((s) => s.selected);
      const sourceRemaining = new Map<string, number>();
      selectedSources.forEach((s) => sourceRemaining.set(s.envelopeId, s.surplus));

      const transfers: Array<{ fromId: string; fromName: string; toId: string; toName: string; amount: number }> = [];

      for (const dest of updatedDestinations) {
        if (dest.fillAmount <= 0) continue;
        let amountNeeded = dest.fillAmount;

        for (const source of selectedSources) {
          if (amountNeeded <= 0) break;
          const available = sourceRemaining.get(source.envelopeId) ?? 0;
          if (available <= 0) continue;

          const transferAmount = Math.min(available, amountNeeded);
          transfers.push({
            fromId: source.envelopeId,
            fromName: source.name,
            toId: dest.envelopeId,
            toName: dest.name,
            amount: Math.round(transferAmount * 100) / 100,
          });

          sourceRemaining.set(source.envelopeId, available - transferAmount);
          amountNeeded -= transferAmount;
        }
      }

      return {
        ...prev,
        destinations: updatedDestinations,
        totalFilling,
        transfers,
        summary: {
          fullyCovered: updatedDestinations.filter((d) => d.isFullyCovered).length,
          partiallyCovered: updatedDestinations.filter((d) => d.fillAmount > 0 && !d.isFullyCovered).length,
          notCovered: updatedDestinations.filter((d) => d.fillAmount === 0).length,
        },
      };
    });
  }, []);

  // Handle apply
  const handleApply = async () => {
    const transferPayload = calculation.transfers.map((t) => ({
      fromId: t.fromId,
      toId: t.toId,
      amount: t.amount,
    }));
    await onApplyTransfers(transferPayload);
  };

  const hasNoSurplus = calculation.sources.length === 0;
  const hasNoShortfall = calculation.destinations.length === 0;
  const hasNoTransfers = calculation.transfers.length === 0;

  return (
    <div className="space-y-6">
      {/* Sources Section */}
      <SmartFillSourceList
        sources={calculation.sources}
        totalAvailable={calculation.totalAvailable}
        onToggleSource={handleToggleSource}
      />

      {/* Divider */}
      {!hasNoSurplus && <hr className="border-silver-light" />}

      {/* Destinations Section */}
      <SmartFillDestinationList
        destinations={calculation.destinations}
        totalNeeded={calculation.totalNeeded}
        totalAvailable={calculation.totalAvailable}
        onUpdateFillAmount={handleUpdateFillAmount}
      />

      {/* Summary */}
      {!hasNoTransfers && (
        <>
          <hr className="border-silver-light" />
          <TransferSummary calculation={calculation} />
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onSwitchToManual}
          className="text-text-medium hover:text-text-dark"
        >
          Switch to Manual Transfer
        </Button>

        <Button
          type="button"
          onClick={handleApply}
          disabled={hasNoTransfers || isApplying}
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
  );
}

function TransferSummary({ calculation }: { calculation: SmartFillCalculation }) {
  const { transfers, summary, totalFilling } = calculation;

  // Group transfers by destination
  const byDestination = transfers.reduce((acc, t) => {
    if (!acc[t.toName]) {
      acc[t.toName] = { total: 0, sources: [] as string[] };
    }
    acc[t.toName].total += t.amount;
    if (!acc[t.toName].sources.includes(t.fromName)) {
      acc[t.toName].sources.push(t.fromName);
    }
    return acc;
  }, {} as Record<string, { total: number; sources: string[] }>);

  const sourceCount = new Set(transfers.map((t) => t.fromId)).size;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-dark uppercase tracking-wide">
        Summary
      </h3>

      <div className="rounded-lg bg-sage-very-light/50 border border-sage-light p-4">
        <p className="text-sm text-text-medium mb-3">
          Moving <span className="font-semibold text-sage-dark">{formatCurrency(totalFilling)}</span>{" "}
          from {sourceCount} envelope{sourceCount !== 1 ? "s" : ""}
        </p>

        <div className="space-y-2">
          {Object.entries(byDestination).map(([name, data]) => {
            const dest = calculation.destinations.find((d) => d.name === name);
            const isFull = dest?.isFullyCovered ?? false;

            return (
              <div
                key={name}
                className="flex items-center gap-2 text-sm"
              >
                <ArrowRight className="h-3 w-3 text-sage flex-shrink-0" />
                <span className="text-text-dark font-medium">{name}:</span>
                <span className="text-text-medium">{formatCurrency(data.total)}</span>
                {isFull ? (
                  <span className="inline-flex items-center gap-1 text-xs text-sage">
                    <CheckCircle className="h-3 w-3" /> fully covered
                  </span>
                ) : (
                  <span className="text-xs text-blue">(partial)</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-sage-light/50 text-xs text-text-medium">
          <span>
            <span className="font-medium text-sage">{summary.fullyCovered}</span> fully covered
          </span>
          {summary.partiallyCovered > 0 && (
            <span>
              <span className="font-medium text-blue">{summary.partiallyCovered}</span> partial
            </span>
          )}
          {summary.notCovered > 0 && (
            <span>
              <span className="font-medium text-text-light">{summary.notCovered}</span> not covered
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
