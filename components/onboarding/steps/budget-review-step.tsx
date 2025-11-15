"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, CheckCircle2, Zap, ShoppingBag, PiggyBank, Plus } from "lucide-react";
import type { EnvelopeData, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";

interface BudgetReviewStepProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  onEditEnvelopes: () => void;
}

const FREQUENCY_CYCLES = {
  weekly: 52,
  fortnightly: 26,
  twice_monthly: 24,
  monthly: 12,
};

export function BudgetReviewStep({
  envelopes,
  incomeSources,
  onEditEnvelopes,
}: BudgetReviewStepProps) {
  // Calculate totals
  const primaryIncome = incomeSources[0];
  const totalIncomePerCycle = incomeSources.reduce((sum, source) => sum + source.amount, 0);

  const billEnvelopes = envelopes.filter((env) => env.type === "bill");
  const spendingEnvelopes = envelopes.filter((env) => env.type === "spending");
  const savingsEnvelopes = envelopes.filter((env) => env.type === "savings");

  const totalBillsPerCycle = billEnvelopes.reduce((sum, env) => sum + (env.payCycleAmount || 0), 0);
  const totalSpendingPerCycle = spendingEnvelopes.reduce((sum, env) => sum + (env.payCycleAmount || 0), 0);
  const totalSavingsPerCycle = savingsEnvelopes.reduce((sum, env) => sum + (env.payCycleAmount || 0), 0);

  const totalAllocatedPerCycle = totalBillsPerCycle + totalSpendingPerCycle + totalSavingsPerCycle;
  const remainingPerCycle = totalIncomePerCycle - totalAllocatedPerCycle;

  const isOverAllocated = remainingPerCycle < 0;
  const hasLeftover = remainingPerCycle > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">📊</div>
        <h2 className="text-3xl font-bold">Review Your Budget</h2>
        <p className="text-muted-foreground">
          Let's make sure everything adds up correctly
        </p>
      </div>

      {/* Income Summary */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <h3 className="font-semibold text-lg mb-4">Your Income</h3>
        <div className="space-y-2">
          {incomeSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between">
              <span className="text-sm">{source.name}</span>
              <span className="font-semibold">${source.amount.toFixed(2)} per {source.frequency}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold">Total per paycheck:</span>
              <span className="font-bold text-blue-600">${totalIncomePerCycle.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Envelope Allocation Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Envelope Allocations</h3>
          <Button variant="outline" size="sm" onClick={onEditEnvelopes}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Envelopes
          </Button>
        </div>

        {/* Bills */}
        {billEnvelopes.length > 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Bills</p>
                  <p className="text-xs text-muted-foreground">{billEnvelopes.length} envelopes</p>
                </div>
              </div>
              <p className="font-bold text-amber-700">${totalBillsPerCycle.toFixed(2)}</p>
            </div>
            <div className="space-y-1 text-sm">
              {billEnvelopes.map((env) => (
                <div key={env.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{env.icon} {env.name}</span>
                  <span>${env.payCycleAmount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Spending */}
        {spendingEnvelopes.length > 0 && (
          <Card className="p-4 border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Spending</p>
                  <p className="text-xs text-muted-foreground">{spendingEnvelopes.length} envelopes</p>
                </div>
              </div>
              <p className="font-bold text-blue-700">${totalSpendingPerCycle.toFixed(2)}</p>
            </div>
            <div className="space-y-1 text-sm">
              {spendingEnvelopes.map((env) => (
                <div key={env.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{env.icon} {env.name}</span>
                  <span>${env.payCycleAmount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Savings */}
        {savingsEnvelopes.length > 0 && (
          <Card className="p-4 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <PiggyBank className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Savings</p>
                  <p className="text-xs text-muted-foreground">{savingsEnvelopes.length} envelopes</p>
                </div>
              </div>
              <p className="font-bold text-emerald-700">${totalSavingsPerCycle.toFixed(2)}</p>
            </div>
            <div className="space-y-1 text-sm">
              {savingsEnvelopes.map((env) => (
                <div key={env.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{env.icon} {env.name}</span>
                  <span>${env.payCycleAmount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Total Summary */}
      <Card className={`p-6 ${isOverAllocated ? "border-2 border-red-500 bg-red-50" : hasLeftover ? "border-2 border-green-500 bg-green-50" : "border-2 border-gray-300"}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Total Allocated:</span>
            <span className="font-bold">${totalAllocatedPerCycle.toFixed(2)}</span>
          </div>

          <div className={`flex items-center justify-between text-xl border-t pt-3 ${isOverAllocated ? "text-red-600" : hasLeftover ? "text-green-600" : "text-gray-900"}`}>
            <span className="font-bold flex items-center gap-2">
              {isOverAllocated ? (
                <>
                  <AlertTriangle className="h-6 w-6" />
                  Over-Allocated:
                </>
              ) : hasLeftover ? (
                <>
                  <CheckCircle2 className="h-6 w-6" />
                  Remaining:
                </>
              ) : (
                "Perfectly Balanced:"
              )}
            </span>
            <span className="font-bold text-2xl">${Math.abs(remainingPerCycle).toFixed(2)}</span>
          </div>
        </div>

        {/* Warning or Success Message */}
        {isOverAllocated && (
          <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <p className="font-semibold mb-1">⚠️ You're allocating more than you earn</p>
                <p>
                  You need to reduce your envelope amounts by ${Math.abs(remainingPerCycle).toFixed(2)} per paycheck,
                  or add more income sources.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasLeftover && (
          <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-semibold mb-1">Great! You have money left over</p>
                <p className="mb-2">
                  Consider creating a "Surplus" or "Buffer" savings envelope for this ${remainingPerCycle.toFixed(2)}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditEnvelopes}
                  className="border-green-600 text-green-700 hover:bg-green-100"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Surplus Envelope
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Continue hint */}
      {!isOverAllocated && (
        <div className="text-center text-sm text-muted-foreground">
          Click "Continue" when you're happy with your budget
        </div>
      )}
    </div>
  );
}
