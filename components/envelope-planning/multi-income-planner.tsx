"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { Check, X, AlertCircle, Plus, Trash2, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BillCalculator } from "./bill-calculator";
import { EnvelopeProgressBar } from "./envelope-progress-bar";
import {
  calculateEnvelopePrediction,
  type RecurringIncome,
  type Envelope,
  type EnvelopePrediction,
  type PayFrequency,
} from "@/lib/cashflow-calculator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EnvelopeAllocation = {
  envelopeId: string;
  envelopeName: string;
  envelopeIcon: string;
  currentBalance: number;
  billAmount?: number;
  billFrequency?: PayFrequency;
  dueDate?: Date;
  targetAmount?: number;
  allocations: {
    [incomeId: string]: number;
  };
};

type IncomeSource = {
  id: string;
  name: string;
  amount: number;
  frequency: PayFrequency;
  nextDate: Date;
};

type MultiIncomePlannerProps = {
  incomeSources: IncomeSource[];
  envelopes: Envelope[];
  envelopeBalances: Map<string, number>;
  onSave: (allocations: { incomeId: string; envelopeId: string; amount: number }[]) => Promise<void>;
};

export function MultiIncomePlanner({
  incomeSources,
  envelopes,
  envelopeBalances,
  onSave,
}: MultiIncomePlannerProps) {
  const [envelopeAllocations, setEnvelopeAllocations] = useState<EnvelopeAllocation[]>([]);
  const [predictions, setPredictions] = useState<Map<string, EnvelopePrediction>>(new Map());
  const [saving, setSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorEnvelopeId, setCalculatorEnvelopeId] = useState<string | null>(null);
  const [calculatorIncomeId, setCalculatorIncomeId] = useState<string | null>(null);

  // Initialize envelope allocations from envelopes and their funding sources
  useEffect(() => {
    const initialAllocations: EnvelopeAllocation[] = envelopes.map((envelope) => {
      const allocations: { [incomeId: string]: number } = {};

      // Initialize with existing funding sources from envelope
      if (envelope.funding_sources && Array.isArray(envelope.funding_sources)) {
        for (const source of envelope.funding_sources) {
          allocations[source.income_id] = source.amount || 0;
        }
      }

      // Ensure all income sources have an entry (default 0)
      for (const income of incomeSources) {
        if (!(income.id in allocations)) {
          allocations[income.id] = 0;
        }
      }

      return {
        envelopeId: envelope.id,
        envelopeName: envelope.name,
        envelopeIcon: envelope.icon || "💰",
        currentBalance: envelopeBalances.get(envelope.id) || 0,
        billAmount: envelope.bill_amount,
        billFrequency: envelope.frequency,
        dueDate: envelope.due_date ? new Date(envelope.due_date) : undefined,
        targetAmount: envelope.target_amount,
        allocations,
      };
    });

    setEnvelopeAllocations(initialAllocations);
  }, [envelopes, incomeSources, envelopeBalances]);

  // Calculate predictions whenever allocations change
  useEffect(() => {
    const newPredictions = new Map<string, EnvelopePrediction>();

    // Convert envelope allocations to RecurringIncome format for calculator
    const recurringIncomes: RecurringIncome[] = incomeSources.map((income) => ({
      id: income.id,
      name: income.name,
      amount: income.amount,
      frequency: income.frequency,
      next_date: income.nextDate,
      allocation: envelopeAllocations.map((ea) => ({
        envelopeId: ea.envelopeId,
        amount: ea.allocations[income.id] || 0,
      })),
    }));

    // Calculate prediction for each envelope
    for (const envelopeAlloc of envelopeAllocations) {
      const envelope: Envelope = {
        id: envelopeAlloc.envelopeId,
        name: envelopeAlloc.envelopeName,
        bill_amount: envelopeAlloc.billAmount,
        frequency: envelopeAlloc.billFrequency,
        due_date: envelopeAlloc.dueDate,
        target_amount: envelopeAlloc.targetAmount,
      };

      const prediction = calculateEnvelopePrediction(
        envelope,
        recurringIncomes,
        envelopeAlloc.currentBalance
      );

      newPredictions.set(envelopeAlloc.envelopeId, prediction);
    }

    setPredictions(newPredictions);
  }, [envelopeAllocations, incomeSources]);

  // Calculate totals for each income source
  const getIncomeTotals = useCallback(() => {
    const totals: { [incomeId: string]: { allocated: number; remaining: number; isBalanced: boolean } } = {};

    for (const income of incomeSources) {
      const allocated = envelopeAllocations.reduce(
        (sum, ea) => sum + (ea.allocations[income.id] || 0),
        0
      );
      const remaining = income.amount - allocated;
      const isBalanced = Math.abs(remaining) < 0.01;

      totals[income.id] = { allocated, remaining, isBalanced };
    }

    return totals;
  }, [incomeSources, envelopeAllocations]);

  const incomeTotals = getIncomeTotals();

  // Check if all incomes are balanced
  const allBalanced = Object.values(incomeTotals).every((t) => t.isBalanced);

  // Update allocation amount
  function updateAllocation(envelopeId: string, incomeId: string, newAmount: string) {
    const amount = newAmount === "" ? 0 : parseFloat(newAmount);
    if (isNaN(amount)) return;

    setEnvelopeAllocations((prev) =>
      prev.map((ea) =>
        ea.envelopeId === envelopeId
          ? {
              ...ea,
              allocations: {
                ...ea.allocations,
                [incomeId]: amount,
              },
            }
          : ea
      )
    );
  }

  // Open bill calculator for specific envelope and income
  function openCalculator(envelopeId: string, incomeId: string) {
    setCalculatorEnvelopeId(envelopeId);
    setCalculatorIncomeId(incomeId);
    setShowCalculator(true);
  }

  // Handle calculator result
  function handleCalculatorResult(perPayAmount: number) {
    if (calculatorEnvelopeId && calculatorIncomeId) {
      updateAllocation(calculatorEnvelopeId, calculatorIncomeId, perPayAmount.toFixed(2));
      setShowCalculator(false);
      setCalculatorEnvelopeId(null);
      setCalculatorIncomeId(null);
    }
  }

  // Update bill details for an envelope
  function updateBillDetails(envelopeId: string, details: {
    billAmount: number;
    billFrequency: PayFrequency;
    dueDate?: Date;
  }) {
    setEnvelopeAllocations((prev) =>
      prev.map((ea) =>
        ea.envelopeId === envelopeId
          ? {
              ...ea,
              billAmount: details.billAmount,
              billFrequency: details.billFrequency,
              dueDate: details.dueDate,
            }
          : ea
      )
    );
  }

  // Handle save
  async function handleSave() {
    if (!allBalanced) {
      toast.error("All income sources must be fully allocated (zero remaining)");
      return;
    }

    setSaving(true);
    try {
      // Flatten allocations for API
      const flatAllocations: { incomeId: string; envelopeId: string; amount: number }[] = [];

      for (const ea of envelopeAllocations) {
        for (const [incomeId, amount] of Object.entries(ea.allocations)) {
          if (amount > 0) {
            flatAllocations.push({
              incomeId,
              envelopeId: ea.envelopeId,
              amount,
            });
          }
        }
      }

      await onSave(flatAllocations);
      toast.success("Envelope plan saved successfully!");
    } catch (error) {
      console.error("Failed to save envelope plan:", error);
      toast.error("Failed to save envelope plan");
    } finally {
      setSaving(false);
    }
  }

  // Get envelope already funded amount (total from all incomes)
  function getAlreadyFunded(envelopeId: string): number {
    const ea = envelopeAllocations.find((e) => e.envelopeId === envelopeId);
    if (!ea) return 0;
    return Object.values(ea.allocations).reduce((sum, amount) => sum + amount, 0);
  }

  // Get envelope still needs amount
  function getStillNeeds(envelopeId: string): number {
    const prediction = predictions.get(envelopeId);
    if (!prediction) return 0;
    return Math.max(0, prediction.gap);
  }

  const calculatorEnvelope = envelopeAllocations.find((e) => e.envelopeId === calculatorEnvelopeId);
  const calculatorIncome = incomeSources.find((i) => i.id === calculatorIncomeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary">Envelope Planning</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Allocate your income across envelopes. All money must have a job (zero-based budget).
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !allBalanced} className="gap-2">
          {saving && <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />}
          Save Plan
        </Button>
      </div>

      {/* Income Sources Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incomeSources.map((income) => {
          const totals = incomeTotals[income.id];
          return (
            <div
              key={income.id}
              className={`rounded-lg border p-4 ${
                totals.isBalanced
                  ? "border-green-200 bg-green-50"
                  : totals.remaining > 0
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-secondary">{income.name}</h3>
                {totals.isBalanced ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className={`h-5 w-5 ${totals.remaining > 0 ? "text-yellow-600" : "text-red-600"}`} />
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
                        ? "text-green-700"
                        : totals.remaining > 0
                        ? "text-yellow-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(totals.remaining)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning if not balanced */}
      {!allBalanced && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Zero-based budget requires all income to be allocated. Please adjust allocations until all income sources show $0.00 remaining.
          </AlertDescription>
        </Alert>
      )}

      {/* Envelope Allocation Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold text-sm text-secondary">Envelope</th>
                <th className="text-left p-3 font-semibold text-sm text-secondary">Status</th>
                {incomeSources.map((income) => (
                  <th key={income.id} className="text-center p-3 font-semibold text-sm text-secondary min-w-[140px]">
                    {income.name}
                  </th>
                ))}
                <th className="text-right p-3 font-semibold text-sm text-secondary min-w-[120px]">
                  Total / Needs
                </th>
              </tr>
            </thead>
            <tbody>
              {envelopeAllocations.map((ea) => {
                const prediction = predictions.get(ea.envelopeId);
                const alreadyFunded = getAlreadyFunded(ea.envelopeId);
                const stillNeeds = getStillNeeds(ea.envelopeId);

                return (
                  <tr key={ea.envelopeId} className="border-b border-border hover:bg-muted/30">
                    {/* Envelope Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{ea.envelopeIcon}</span>
                        <div>
                          <p className="font-medium text-secondary">{ea.envelopeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {formatCurrency(ea.currentBalance)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status / Progress */}
                    <td className="p-3">
                      {prediction && (
                        <EnvelopeProgressBar prediction={prediction} compact showDetails={false} />
                      )}
                    </td>

                    {/* Allocation Inputs per Income */}
                    {incomeSources.map((income) => (
                      <td key={income.id} className="p-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={ea.allocations[income.id] || ""}
                            onChange={(e) => updateAllocation(ea.envelopeId, income.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openCalculator(ea.envelopeId, income.id)}
                            className="h-9 w-9 p-0"
                            title="Use bill calculator"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    ))}

                    {/* Total Already Funded / Still Needs */}
                    <td className="p-3 text-right">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Funded: </span>
                          <span className="font-medium text-secondary">{formatCurrency(alreadyFunded)}</span>
                        </div>
                        {stillNeeds > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Needs: </span>
                            <span className="font-medium text-red-600">{formatCurrency(stillNeeds)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Envelope Predictions Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-secondary">Cashflow Predictions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from(predictions.entries()).map(([envelopeId, prediction]) => {
            const envelope = envelopeAllocations.find((e) => e.envelopeId === envelopeId);
            if (!envelope) return null;

            return (
              <div key={envelopeId} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{envelope.envelopeIcon}</span>
                  <h4 className="font-medium text-secondary">{envelope.envelopeName}</h4>
                </div>
                <EnvelopeProgressBar prediction={prediction} showDetails />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bill Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bill Calculator</DialogTitle>
            <DialogDescription>
              Calculate per-pay amount for {calculatorEnvelope?.envelopeName} from{" "}
              {calculatorIncome?.name}
            </DialogDescription>
          </DialogHeader>

          {calculatorEnvelope && calculatorIncome && (
            <BillCalculator
              billAmount={calculatorEnvelope.billAmount || 0}
              billFrequency={calculatorEnvelope.billFrequency || "monthly"}
              dueDate={calculatorEnvelope.dueDate}
              incomeFrequency={calculatorIncome.frequency}
              onChange={handleCalculatorResult}
              onBillDetailsChange={(details) => updateBillDetails(calculatorEnvelope.envelopeId, details)}
            />
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCalculator(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
