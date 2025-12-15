'use client';

/**
 * Paying Down Config
 *
 * Configuration form for Options B/C: Users carrying a balance.
 * Collects APR, minimum payment, and starting debt amount.
 */

import { DollarSign, Percent } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { APRInput } from './apr-input';

interface PayingDownConfigProps {
  apr: number | null;
  minimumPayment: number | null;
  startingDebtAmount: number | null;
  onAPRChange: (apr: number | null) => void;
  onMinimumPaymentChange: (amount: number | null) => void;
  cardName: string;
  usageType: 'paying_down' | 'minimum_only' | null;
  errors?: {
    apr?: string;
    minimumPayment?: string;
  };
}

export function PayingDownConfig({
  apr,
  minimumPayment,
  startingDebtAmount,
  onAPRChange,
  onMinimumPaymentChange,
  cardName,
  usageType,
  errors,
}: PayingDownConfigProps) {
  const handleAmountChange = (
    value: string,
    setter: (amount: number | null) => void
  ) => {
    if (value === '') {
      setter(null);
    } else {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0) {
        setter(num);
      }
    }
  };

  // Format debt for display
  const formattedDebt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(startingDebtAmount || 0);

  return (
    <div className="space-y-4 p-4 bg-blue-light/30 rounded-xl border border-blue/30">
      <div>
        <p className="text-sm text-text-dark">
          {usageType === 'paying_down'
            ? "We'll help you track your progress and show you when you'll be debt-free."
            : "We'll make sure you never miss a minimum payment."}
        </p>
        <p className="text-sm text-blue mt-2">
          Starting balance: <span className="font-medium">{formattedDebt}</span>
        </p>
      </div>

      <div className="space-y-4">
        {/* APR */}
        <APRInput
          value={apr}
          onChange={onAPRChange}
          error={errors?.apr}
          showHelp={true}
        />

        {/* Minimum Payment */}
        <div className="space-y-2">
          <Label htmlFor="minimumPayment" className="text-sm text-text-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Minimum monthly payment
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-medium">
              $
            </span>
            <Input
              id="minimumPayment"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={minimumPayment ?? ''}
              onChange={(e) => handleAmountChange(e.target.value, onMinimumPaymentChange)}
              className={`pl-7 ${errors?.minimumPayment ? 'border-red-500' : ''}`}
            />
          </div>
          {errors?.minimumPayment && (
            <p className="text-xs text-red-500">{errors.minimumPayment}</p>
          )}
          <p className="text-xs text-text-light">
            The minimum amount required each month. You can find this on your statement.
          </p>
        </div>
      </div>

      {/* Projection preview (if we have enough info) */}
      {apr && minimumPayment && startingDebtAmount && startingDebtAmount > 0 && (
        <PayoffPreviewMini
          balance={startingDebtAmount}
          apr={apr}
          minimumPayment={minimumPayment}
        />
      )}
    </div>
  );
}

/**
 * Mini payoff preview shown inline
 */
function PayoffPreviewMini({
  balance,
  apr,
  minimumPayment,
}: {
  balance: number;
  apr: number;
  minimumPayment: number;
}) {
  // Simple payoff calculation
  const monthlyRate = apr / 100 / 12;
  let currentBalance = balance;
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 600;

  while (currentBalance > 0 && months < maxMonths) {
    const interest = currentBalance * monthlyRate;
    totalInterest += interest;

    if (interest >= minimumPayment && months > 0) {
      // Payment doesn't cover interest
      return (
        <div className="p-3 bg-white rounded-lg border border-blue/30 text-xs">
          <p className="text-red-600">
            ⚠️ The minimum payment doesn't cover the monthly interest. Consider paying more to make progress.
          </p>
        </div>
      );
    }

    currentBalance = currentBalance + interest - minimumPayment;
    months++;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  const formattedInterest = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalInterest);

  const formattedDate = payoffDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-3 bg-white rounded-lg border border-blue/30 text-xs">
      <p className="text-text-medium">
        At minimum payments, you'd be debt-free by{' '}
        <span className="font-medium text-text-dark">{formattedDate}</span>
        {' '}({months} months)
      </p>
      <p className="text-text-light mt-1">
        Total interest: <span className="text-blue">{formattedInterest}</span>
      </p>
    </div>
  );
}
