"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, CheckCircle2, Zap, ShoppingBag, PiggyBank, Plus, TrendingUp } from "lucide-react";
import { useBudgetValidation } from "@/lib/hooks/use-budget-validation";
import { AllocateSurplusDialog } from "@/components/dialogs/allocate-surplus-dialog";
import { trackSurplusAllocation } from "@/lib/analytics/events";
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
  const [showSurplusDialog, setShowSurplusDialog] = useState(false);

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

  // Use budget validation hook
  const budgetValidation = useBudgetValidation(totalIncomePerCycle, totalAllocatedPerCycle);

  const isOverAllocated = remainingPerCycle < 0;
  const hasLeftover = remainingPerCycle > 0;

  // Handle surplus allocation (placeholder - would need actual implementation)
  const handleAllocateSurplus = async () => {
    console.log("Allocating surplus in onboarding - would save to Surplus envelope");

    // Track analytics event
    trackSurplusAllocation({
      amount: budgetValidation.difference,
      incomeSourceCount: incomeSources.length,
      context: 'onboarding',
    });

    // This would need to actually create/update envelope allocations
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">📊</div>
        <h2 className="text-3xl font-bold">Review Your Budget</h2>
        <p className="text-muted-foreground">
          Let&apos;s make sure everything adds up correctly
        </p>
      </div>

      {/* Income Summary */}
      <Card className="p-6 bg-gradient-to-br from-[#E2EEEC] to-[#DDEAF5] border-[#B8D4D0]">
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
              <span className="font-bold text-[#6B9ECE]">${totalIncomePerCycle.toFixed(2)}</span>
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
          <Card className="p-4 border-[#D4A853] bg-[#F5E6C4]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#D4A853] rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Bills</p>
                  <p className="text-xs text-muted-foreground">{billEnvelopes.length} envelopes</p>
                </div>
              </div>
              <p className="font-bold text-[#8B7035]">${totalBillsPerCycle.toFixed(2)}</p>
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
          <Card className="p-4 border-[#6B9ECE] bg-[#DDEAF5]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#6B9ECE] rounded-lg flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Spending</p>
                  <p className="text-xs text-muted-foreground">{spendingEnvelopes.length} envelopes</p>
                </div>
              </div>
              <p className="font-bold text-[#6B9ECE]">${totalSpendingPerCycle.toFixed(2)}</p>
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
          <Card className="p-4 border-[#B8D4D0] bg-[#E2EEEC]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#7A9E9A] rounded-lg flex items-center justify-center">
                  <PiggyBank className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Savings</p>
                  <p className="text-xs text-muted-foreground">{savingsEnvelopes.length} envelopes</p>
                </div>
              </div>
              <p className="font-bold text-[#5A7E7A]">${totalSavingsPerCycle.toFixed(2)}</p>
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
      <Card className={`p-6 ${isOverAllocated ? "border-2 border-[#6B9ECE] bg-[#DDEAF5]" : hasLeftover ? "border-2 border-[#7A9E9A] bg-[#E2EEEC]" : "border-2 border-gray-300"}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Total Allocated:</span>
            <span className="font-bold">${totalAllocatedPerCycle.toFixed(2)}</span>
          </div>

          <div className={`flex items-center justify-between text-xl border-t pt-3 ${isOverAllocated ? "text-[#6B9ECE]" : hasLeftover ? "text-[#5A7E7A]" : "text-gray-900"}`}>
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
          <div className="mt-4 bg-[#DDEAF5] border border-[#6B9ECE] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#6B9ECE] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-dark">
                <p className="font-semibold mb-1">⚠️ You&apos;re allocating more than you earn</p>
                <p>
                  You need to reduce your envelope amounts by ${Math.abs(remainingPerCycle).toFixed(2)} per paycheck,
                  or add more income sources.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasLeftover && (
          <div className="mt-4 bg-[#E2EEEC] border border-[#B8D4D0] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#7A9E9A] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-dark flex-1">
                <p className="font-semibold mb-1">Great! You have money left over</p>
                <p className="mb-3">
                  You have ${budgetValidation.difference.toFixed(2)} unallocated.
                  You can allocate this to a Surplus envelope or leave it unallocated for now.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSurplusDialog(true)}
                    className="bg-white hover:bg-[#E2EEEC]"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Allocate to Surplus
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditEnvelopes}
                    className="border-[#7A9E9A] text-[#5A7E7A] hover:bg-[#E2EEEC]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Surplus Envelope
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Continue hint */}
      {!isOverAllocated && (
        <div className="text-center text-sm text-muted-foreground">
          Click "Continue" when you&apos;re happy with your budget
        </div>
      )}

      {/* Allocate Surplus Dialog */}
      <AllocateSurplusDialog
        open={showSurplusDialog}
        onOpenChange={setShowSurplusDialog}
        surplusAmount={budgetValidation.difference}
        incomeSources={incomeSources.map(source => ({
          id: source.id,
          name: source.name,
          amount: budgetValidation.difference / incomeSources.length, // Distribute evenly for onboarding
        }))}
        onConfirm={handleAllocateSurplus}
      />
    </div>
  );
}
