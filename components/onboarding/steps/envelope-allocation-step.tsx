"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/finance";
import { Check, X, AlertCircle, Calculator } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
import type { EnvelopeData, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";

interface EnvelopeAllocationStepProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  onAllocationsChange: (allocations: { [envelopeId: string]: { [incomeId: string]: number } }) => void;
}

export function EnvelopeAllocationStep({
  envelopes,
  incomeSources,
  onAllocationsChange,
}: EnvelopeAllocationStepProps) {
  const [allocations, setAllocations] = useState<{ [envelopeId: string]: { [incomeId: string]: number } }>({});

  // Initialize allocations with smart defaults
  useEffect(() => {
    const initialAllocations: { [envelopeId: string]: { [incomeId: string]: number } } = {};

    // If only one income source, allocate everything to it
    if (incomeSources.length === 1) {
      const income = incomeSources[0];
      for (const envelope of envelopes) {
        initialAllocations[envelope.id] = {
          [income.id]: envelope.payCycleAmount || 0,
        };
      }
    } else {
      // Multiple incomes - start with empty allocations
      for (const envelope of envelopes) {
        initialAllocations[envelope.id] = {};
        for (const income of incomeSources) {
          initialAllocations[envelope.id][income.id] = 0;
        }
      }
    }

    setAllocations(initialAllocations);
  }, [envelopes, incomeSources]);

  // Notify parent of changes
  useEffect(() => {
    onAllocationsChange(allocations);
  }, [allocations, onAllocationsChange]);

  // Calculate income totals
  const getIncomeTotals = useCallback(() => {
    const totals: { [incomeId: string]: { allocated: number; remaining: number; isBalanced: boolean } } = {};

    for (const income of incomeSources) {
      const allocated = Object.values(allocations).reduce(
        (sum, envAlloc) => sum + (envAlloc[income.id] || 0),
        0
      );
      const remaining = income.amount - allocated;
      const isBalanced = Math.abs(remaining) < 0.01;

      totals[income.id] = { allocated, remaining, isBalanced };
    }

    return totals;
  }, [incomeSources, allocations]);

  const incomeTotals = getIncomeTotals();
  const allBalanced = Object.values(incomeTotals).every((t) => t.isBalanced);

  // Update allocation for specific envelope and income
  function updateAllocation(envelopeId: string, incomeId: string, newAmount: string) {
    const amount = newAmount === "" ? 0 : parseFloat(newAmount);
    if (isNaN(amount)) return;

    setAllocations((prev) => ({
      ...prev,
      [envelopeId]: {
        ...prev[envelopeId],
        [incomeId]: amount,
      },
    }));
  }

  // Get total allocated to an envelope
  function getEnvelopeTotal(envelopeId: string): number {
    const envAlloc = allocations[envelopeId] || {};
    return Object.values(envAlloc).reduce((sum, amount) => sum + amount, 0);
  }

  // Check if envelope is balanced
  function isEnvelopeBalanced(envelope: EnvelopeData): boolean {
    const total = getEnvelopeTotal(envelope.id);
    const target = envelope.payCycleAmount || 0;
    return Math.abs(total - target) < 0.01;
  }

  // Auto-distribute evenly across all incomes
  function autoDistribute() {
    const newAllocations: { [envelopeId: string]: { [incomeId: string]: number } } = {};

    for (const envelope of envelopes) {
      const target = envelope.payCycleAmount || 0;
      const perIncome = target / incomeSources.length;

      newAllocations[envelope.id] = {};
      for (const income of incomeSources) {
        newAllocations[envelope.id][income.id] = perIncome;
      }
    }

    setAllocations(newAllocations);
  }

  // Single income - no need for complex UI
  if (incomeSources.length === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-text-dark">Allocation Complete!</h2>
          <p className="text-muted-foreground">
            Since you have one income source, all envelopes are automatically funded from{" "}
            <span className="font-semibold">{incomeSources[0].name}</span>
          </p>
        </div>

        {/* Remy's Tip */}
        <RemyTip pose="encouraging">
          Sweet as! With one income, this part's easy. Everything flows from your main pay.
        </RemyTip>

        <Card className="p-6 bg-sage-very-light border-sage-light">
          <div className="flex items-center gap-3 mb-4">
            <Check className="h-6 w-6 text-[#7A9E9A]" />
            <div>
              <h3 className="font-semibold text-text-dark">All Set!</h3>
              <p className="text-sm text-text-medium">
                Every envelope is funded from your {incomeSources[0].name}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {envelopes.map((envelope) => (
              <div key={envelope.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {envelope.icon} {envelope.name}
                </span>
                <span className="font-medium">{formatCurrency(envelope.payCycleAmount || 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Multiple incomes - show allocation UI
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-text-dark">Allocate Your Income</h2>
        <p className="text-muted-foreground">
          Decide which income sources fund each envelope
        </p>
      </div>

      {/* Remy's Tip */}
      <RemyTip pose="thinking">
        Time to allocate your income. Let's make sure your essentials are
        covered first - the must-pays that keep life running. What's left
        goes to your priorities. You decide what matters most.
      </RemyTip>

      {/* Income Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incomeSources.map((income) => {
          const totals = incomeTotals[income.id];
          return (
            <Card
              key={income.id}
              className={`p-4 ${
                totals.isBalanced
                  ? "border-[#B8D4D0] bg-[#E2EEEC]"
                  : totals.remaining > 0
                  ? "border-[#D4A853] bg-[#F5E6C4]"
                  : "border-[#6B9ECE] bg-[#DDEAF5]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-secondary">{income.name}</h3>
                {totals.isBalanced ? (
                  <Check className="h-5 w-5 text-[#7A9E9A]" />
                ) : (
                  <AlertCircle
                    className={`h-5 w-5 ${totals.remaining > 0 ? "text-[#D4A853]" : "text-[#6B9ECE]"}`}
                  />
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income:</span>
                  <span className="font-medium">{formatCurrency(income.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allocated:</span>
                  <span className="font-medium">{formatCurrency(totals.allocated)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span
                    className={`font-bold ${
                      totals.isBalanced
                        ? "text-[#5A7E7A]"
                        : totals.remaining > 0
                        ? "text-[#8B7035]"
                        : "text-[#6B9ECE]"
                    }`}
                  >
                    {formatCurrency(totals.remaining)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Warning if not balanced */}
      {!allBalanced && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Zero-based budget requires all income to be allocated. Please adjust allocations until all income
            sources show $0.00 remaining.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Action */}
      <div className="flex justify-center">
        <Button onClick={autoDistribute} variant="outline" size="sm">
          <Calculator className="mr-2 h-4 w-4" />
          Auto-Distribute Evenly
        </Button>
      </div>

      {/* Allocation Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold text-sm text-secondary">Envelope</th>
                {incomeSources.map((income) => (
                  <th
                    key={income.id}
                    className="text-center p-3 font-semibold text-sm text-secondary min-w-[140px]"
                  >
                    {income.name}
                  </th>
                ))}
                <th className="text-right p-3 font-semibold text-sm text-secondary min-w-[100px]">Total</th>
                <th className="text-center p-3 font-semibold text-sm text-secondary w-12">✓</th>
              </tr>
            </thead>
            <tbody>
              {envelopes.map((envelope) => {
                const isBalanced = isEnvelopeBalanced(envelope);
                const total = getEnvelopeTotal(envelope.id);
                const target = envelope.payCycleAmount || 0;

                return (
                  <tr key={envelope.id} className="border-b border-border hover:bg-muted/30">
                    {/* Envelope Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{envelope.icon}</span>
                        <div>
                          <p className="font-medium text-secondary text-sm">{envelope.name}</p>
                          <p className="text-xs text-muted-foreground">Target: {formatCurrency(target)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Allocation Inputs per Income */}
                    {incomeSources.map((income) => (
                      <td key={income.id} className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={allocations[envelope.id]?.[income.id] || ""}
                          onChange={(e) => updateAllocation(envelope.id, income.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0.00"
                        />
                      </td>
                    ))}

                    {/* Total */}
                    <td className="p-3 text-right">
                      <span
                        className={`font-medium ${
                          isBalanced
                            ? "text-[#7A9E9A]"
                            : total > target
                            ? "text-[#6B9ECE]"
                            : "text-[#D4A853]"
                        }`}
                      >
                        {formatCurrency(total)}
                      </span>
                    </td>

                    {/* Status Icon */}
                    <td className="p-3 text-center">
                      {isBalanced ? (
                        <Check className="h-5 w-5 text-[#7A9E9A] mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-[#6B9ECE] mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Continue hint */}
      {allBalanced && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#E2EEEC] border border-[#B8D4D0] rounded-lg px-4 py-2">
            <Check className="h-5 w-5 text-[#7A9E9A]" />
            <span className="text-sm font-medium text-text-dark">
              Perfect! All income is allocated. Click Continue to review.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
