'use client';

/**
 * Payment Reconciliation Dialog
 *
 * Appears when a credit card payment is detected.
 * Asks user to confirm how the payment should be split:
 * - CC Holding (for current statement spending)
 * - Extra toward principal (debt paydown)
 * - Interest portion
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CreditCard, Wallet, TrendingDown, DollarSign, AlertCircle, Info } from 'lucide-react';
import type { PaymentReconciliation, PaymentSplit } from '@/lib/types/credit-card-onboarding';

interface PaymentReconciliationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (split: PaymentSplit) => void;
  paymentAmount: number;
  cardName: string;
  holdingBalance: number;
  estimatedInterest?: number;
  suggestedSplit?: PaymentSplit;
  usageType: 'pay_in_full' | 'paying_down' | 'minimum_only';
}

export function PaymentReconciliationDialog({
  isOpen,
  onClose,
  onConfirm,
  paymentAmount,
  cardName,
  holdingBalance,
  estimatedInterest = 0,
  suggestedSplit,
  usageType,
}: PaymentReconciliationDialogProps) {
  // Initialize split based on suggestions or defaults
  const [split, setSplit] = useState<PaymentSplit>(() => {
    if (suggestedSplit) {
      return suggestedSplit;
    }

    // Default logic based on usage type
    if (usageType === 'pay_in_full') {
      // Pay in full: all goes to holding
      return {
        holdingPortion: Math.min(paymentAmount, holdingBalance),
        interestPortion: 0,
        extraPrincipal: Math.max(0, paymentAmount - holdingBalance),
      };
    } else {
      // Paying down: estimate interest and split the rest
      const interestPortion = Math.min(estimatedInterest, paymentAmount);
      const remainingAfterInterest = paymentAmount - interestPortion;
      const holdingPortion = Math.min(remainingAfterInterest, holdingBalance);
      const extraPrincipal = remainingAfterInterest - holdingPortion;

      return {
        holdingPortion,
        interestPortion,
        extraPrincipal,
      };
    }
  });

  // Validate split totals to payment amount
  const splitTotal = split.holdingPortion + split.interestPortion + split.extraPrincipal;
  const isValidSplit = Math.abs(splitTotal - paymentAmount) < 0.01;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle slider change for simple mode (interest vs principal)
  const handleSimpleSplit = (interestPercent: number) => {
    const interestPortion = (interestPercent / 100) * paymentAmount;
    const remainingAfterInterest = paymentAmount - interestPortion;
    const holdingPortion = Math.min(remainingAfterInterest, holdingBalance);
    const extraPrincipal = remainingAfterInterest - holdingPortion;

    setSplit({
      holdingPortion,
      interestPortion,
      extraPrincipal,
    });
  };

  // Handle manual input changes
  const handleInputChange = (field: keyof PaymentSplit, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newSplit = { ...split, [field]: numValue };

    // Adjust other fields to maintain total
    const total = newSplit.holdingPortion + newSplit.interestPortion + newSplit.extraPrincipal;
    const diff = paymentAmount - total;

    if (diff !== 0) {
      // Adjust extra principal to balance
      newSplit.extraPrincipal = Math.max(0, newSplit.extraPrincipal + diff);
    }

    setSplit(newSplit);
  };

  // Auto-fill remaining to principal
  const autoFillPrincipal = () => {
    const usedAmount = split.holdingPortion + split.interestPortion;
    setSplit({
      ...split,
      extraPrincipal: Math.max(0, paymentAmount - usedAmount),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue" />
            Reconcile Payment
          </DialogTitle>
          <DialogDescription>
            A payment of {formatCurrency(paymentAmount)} was made to {cardName}.
            How would you like to allocate it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Summary */}
          <div className="p-3 bg-silver-light/30 rounded-lg border border-silver/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-medium">Payment Amount</span>
              <span className="text-lg font-bold text-text-dark">
                {formatCurrency(paymentAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-text-light">
              <span>Holding Balance</span>
              <span>{formatCurrency(holdingBalance)}</span>
            </div>
          </div>

          {/* Split Allocation */}
          <div className="space-y-4">
            {/* CC Holding Portion */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-sage" />
                From Holding (statement spending)
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-medium text-sm">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={Math.min(paymentAmount, holdingBalance)}
                  value={split.holdingPortion || ''}
                  onChange={(e) => handleInputChange('holdingPortion', e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-text-light">
                Max available: {formatCurrency(holdingBalance)}
              </p>
            </div>

            {/* Interest Portion (for paying_down types) */}
            {usageType !== 'pay_in_full' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  Interest Portion
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-medium text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={paymentAmount}
                    value={split.interestPortion || ''}
                    onChange={(e) => handleInputChange('interestPortion', e.target.value)}
                    className="pl-7"
                  />
                </div>
                {estimatedInterest > 0 && (
                  <p className="text-xs text-text-light">
                    Estimated interest: ~{formatCurrency(estimatedInterest)}
                  </p>
                )}
              </div>
            )}

            {/* Extra Principal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-blue" />
                  Extra Toward Principal
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={autoFillPrincipal}
                >
                  Auto-fill
                </Button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-medium text-sm">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentAmount}
                  value={split.extraPrincipal || ''}
                  onChange={(e) => handleInputChange('extraPrincipal', e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-text-light">
                This amount directly reduces your debt
              </p>
            </div>
          </div>

          {/* Validation Warning */}
          {!isValidSplit && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Split doesn't match payment</p>
                <p className="text-xs mt-1">
                  Total: {formatCurrency(splitTotal)} | Difference: {formatCurrency(splitTotal - paymentAmount)}
                </p>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-light/30 rounded-lg border border-blue/30">
            <Info className="w-4 h-4 text-blue flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-medium">
              The holding portion will be deducted from your CC Holding envelope.
              Interest is tracked separately. Extra principal reduces your debt faster.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(split)}
            disabled={!isValidSplit}
            className="bg-sage hover:bg-sage-dark"
          >
            Confirm Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
