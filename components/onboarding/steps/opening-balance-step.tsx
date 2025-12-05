"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, Wallet, CreditCard, DollarSign } from "lucide-react";
import { calculateSuggestedOpeningBalance } from "@/lib/utils/ideal-allocation-calculator";
import type { EnvelopeData, IncomeSource, BankAccount } from "@/app/(app)/onboarding/unified-onboarding-client";

interface OpeningBalanceStepProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  bankAccounts: BankAccount[];
  onOpeningBalancesChange: (balances: { [envelopeId: string]: number }) => void;
}

export function OpeningBalanceStep({
  envelopes,
  incomeSources,
  bankAccounts,
  onOpeningBalancesChange,
}: OpeningBalanceStepProps) {
  const [openingBalances, setOpeningBalances] = useState<{ [envelopeId: string]: number }>({});

  // Calculate available funds
  const totalBankBalance = bankAccounts
    .filter(acc => acc.type !== 'credit_card')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalCreditCardDebt = bankAccounts
    .filter(acc => acc.type === 'credit_card')
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);

  const availableFunds = totalBankBalance - totalCreditCardDebt;

  // Calculate total allocated
  const totalAllocated = Object.values(openingBalances).reduce((sum, val) => sum + (val || 0), 0);
  const remaining = availableFunds - totalAllocated;

  // Get primary income for frequency calculations
  const primaryIncome = incomeSources[0];
  const userPayCycle = primaryIncome?.frequency || 'fortnightly';

  // Calculate suggested opening balances
  const suggestedBalances: { [envelopeId: string]: number } = {};

  envelopes
    .filter(env => env.type === 'bill' && env.dueDate)
    .forEach(envelope => {
      // For onboarding, we need to calculate suggested opening balance
      // based on ideal per-pay allocation and pay cycles until due date

      // Calculate ideal per-pay for this envelope
      const idealPerPay = envelope.payCycleAmount || 0;

      // Estimate due date (day of month to actual date)
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const dueDay = envelope.dueDate || 1;

      let dueDate = new Date(currentYear, currentMonth, dueDay);
      if (dueDate < today) {
        dueDate = new Date(currentYear, currentMonth + 1, dueDay);
      }

      const suggested = calculateSuggestedOpeningBalance(
        {
          target_amount: envelope.billAmount || 0,
          due_date: dueDate,
        },
        idealPerPay,
        today,
        userPayCycle
      );

      suggestedBalances[envelope.id] = Math.max(0, suggested);
    });

  // Initialize with suggested balances on mount
  useEffect(() => {
    setOpeningBalances(suggestedBalances);
    onOpeningBalancesChange(suggestedBalances);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleBalanceChange = (envelopeId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = {
      ...openingBalances,
      [envelopeId]: numValue,
    };
    setOpeningBalances(updated);
    onOpeningBalancesChange(updated);
  };

  const hasInsufficientFunds = remaining < 0;
  const billEnvelopes = envelopes.filter(env => env.type === 'bill');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">💰</div>
        <h2 className="text-3xl font-bold">Opening Balances</h2>
        <p className="text-muted-foreground">
          Allocate your current funds to envelopes to start on track
        </p>
      </div>

      {/* Available Funds Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Available Funds
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Bank Balance
            </span>
            <span className="font-semibold text-green-600">
              ${totalBankBalance.toFixed(2)}
            </span>
          </div>

          {totalCreditCardDebt > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Card Debt
              </span>
              <span className="font-semibold text-red-600">
                -${totalCreditCardDebt.toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Available to Allocate:</span>
            <span className="text-2xl font-bold text-blue-600">
              ${availableFunds.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle>How Opening Balances Work</AlertTitle>
        <AlertDescription className="text-sm space-y-2">
          <p>
            Opening balances help your envelopes start on track. We&apos;ve suggested amounts
            based on your bills and upcoming due dates.
          </p>
          <p>
            <strong>You can adjust these amounts</strong> - the system will warn you if you&apos;re
            allocating more than available, but you can still proceed if needed.
          </p>
        </AlertDescription>
      </Alert>

      {/* Bill Envelopes - Opening Balance Allocations */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Allocate Opening Balances</h3>

        {billEnvelopes.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>No bill envelopes to allocate opening balances.</p>
            <p className="text-sm mt-2">Opening balances are typically used for bills.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {billEnvelopes.map((envelope) => (
              <Card key={envelope.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="text-2xl mt-1">{envelope.icon}</div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold">{envelope.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {envelope.billAmount && `$${envelope.billAmount.toFixed(2)} ${envelope.frequency}`}
                        {envelope.dueDate && ` • Due: ${envelope.dueDate}${getDaySuffix(envelope.dueDate)} of month`}
                      </p>
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label htmlFor={`opening-${envelope.id}`} className="text-xs text-muted-foreground">
                          Opening Balance
                        </Label>
                        <Input
                          id={`opening-${envelope.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={openingBalances[envelope.id] || ''}
                          onChange={(e) => handleBalanceChange(envelope.id, e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>

                      {suggestedBalances[envelope.id] !== undefined && (
                        <div className="text-sm text-muted-foreground pb-2">
                          Suggested: ${suggestedBalances[envelope.id].toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Card */}
      <Card className={`p-6 ${hasInsufficientFunds ? 'border-2 border-amber-500 bg-amber-50' : 'border-2 border-green-500 bg-green-50'}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Total Allocated:</span>
            <span className="font-bold">${totalAllocated.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Available Funds:</span>
            <span className="font-bold">${availableFunds.toFixed(2)}</span>
          </div>

          <div className={`flex items-center justify-between text-xl border-t pt-3 ${hasInsufficientFunds ? 'text-amber-600' : 'text-green-600'}`}>
            <span className="font-bold">Remaining:</span>
            <span className="font-bold text-2xl">${remaining.toFixed(2)}</span>
          </div>
        </div>

        {/* Warning for insufficient funds */}
        {hasInsufficientFunds && (
          <Alert className="mt-4 border-amber-300 bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900">Insufficient Funds</AlertTitle>
            <AlertDescription className="text-sm text-amber-900">
              You&apos;re allocating <strong>${Math.abs(remaining).toFixed(2)} more</strong> than
              you have available. You can still continue, but you&apos;ll need to add funds or
              adjust allocations when your next income arrives.
            </AlertDescription>
          </Alert>
        )}

        {remaining > 0 && (
          <div className="mt-4 text-sm text-green-700">
            💡 You have ${remaining.toFixed(2)} remaining. You can allocate this to other
            envelopes or keep it as buffer.
          </div>
        )}
      </Card>

      {/* Continue hint */}
      <div className="text-center text-sm text-muted-foreground">
        Click "Continue" to proceed to budget review
      </div>
    </div>
  );
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
