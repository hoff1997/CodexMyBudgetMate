'use client';

/**
 * Pay In Full Config
 *
 * Configuration form for Option A: Users who pay their card off in full each month.
 * Collects current outstanding and expected monthly spending.
 */

import { Wallet, TrendingUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PayInFullConfigProps {
  currentOutstanding: number | null;
  expectedMonthlySpending: number | null;
  onCurrentOutstandingChange: (amount: number | null) => void;
  onExpectedMonthlySpendingChange: (amount: number | null) => void;
  cardName: string;
  errors?: {
    currentOutstanding?: string;
    expectedMonthlySpending?: string;
  };
}

export function PayInFullConfig({
  currentOutstanding,
  expectedMonthlySpending,
  onCurrentOutstandingChange,
  onExpectedMonthlySpendingChange,
  cardName,
  errors,
}: PayInFullConfigProps) {
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

  return (
    <div className="space-y-4 p-4 bg-sage-very-light/50 rounded-xl border border-sage-light">
      <p className="text-sm text-sage-dark">
        Great! Since you pay this off each month, we'll help you track your spending and make sure
        the money is always ready when the bill comes due.
      </p>

      <div className="space-y-4">
        {/* Current Outstanding */}
        <div className="space-y-2">
          <Label htmlFor="currentOutstanding" className="text-sm text-text-medium flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Current outstanding amount
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-medium">
              $
            </span>
            <Input
              id="currentOutstanding"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={currentOutstanding ?? ''}
              onChange={(e) => handleAmountChange(e.target.value, onCurrentOutstandingChange)}
              className={`pl-7 ${errors?.currentOutstanding ? 'border-red-500' : ''}`}
            />
          </div>
          {errors?.currentOutstanding && (
            <p className="text-xs text-red-500">{errors.currentOutstanding}</p>
          )}
          <p className="text-xs text-text-light">
            The amount currently charged to your card that you'll need to pay off.
            This will be set aside in your {cardName} Holding envelope.
          </p>
        </div>

        {/* Expected Monthly Spending */}
        <div className="space-y-2">
          <Label htmlFor="expectedMonthly" className="text-sm text-text-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Expected monthly spending
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-medium">
              $
            </span>
            <Input
              id="expectedMonthly"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={expectedMonthlySpending ?? ''}
              onChange={(e) => handleAmountChange(e.target.value, onExpectedMonthlySpendingChange)}
              className={`pl-7 ${errors?.expectedMonthlySpending ? 'border-red-500' : ''}`}
            />
          </div>
          {errors?.expectedMonthlySpending && (
            <p className="text-xs text-red-500">{errors.expectedMonthlySpending}</p>
          )}
          <p className="text-xs text-text-light">
            Roughly how much you typically spend on this card each month.
            This helps us set up your payment budget.
          </p>
        </div>
      </div>
    </div>
  );
}
