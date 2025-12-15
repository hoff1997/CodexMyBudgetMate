'use client';

/**
 * Interest Tracker Card
 *
 * Displays interest tracking information for a credit card:
 * - Total interest paid
 * - Monthly interest estimate
 * - Interest savings potential
 */

import { useMemo } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateMonthlyInterest, calculateInterestSavings } from '@/lib/utils/interest-calculator';

interface InterestTrackerCardProps {
  balance: number;
  apr: number;
  minimumPayment: number;
  totalInterestPaid?: number;
  extraMonthlyPayment?: number;
}

export function InterestTrackerCard({
  balance,
  apr,
  minimumPayment,
  totalInterestPaid = 0,
  extraMonthlyPayment = 0,
}: InterestTrackerCardProps) {
  // Calculate interest values
  const monthlyInterest = useMemo(() => {
    return calculateMonthlyInterest(balance, apr);
  }, [balance, apr]);

  const yearlyInterestEstimate = useMemo(() => {
    // Simplified yearly estimate (actual would compound)
    return monthlyInterest * 12;
  }, [monthlyInterest]);

  const potentialSavings = useMemo(() => {
    if (extraMonthlyPayment <= 0) return null;
    return calculateInterestSavings(balance, apr, minimumPayment, extraMonthlyPayment);
  }, [balance, apr, minimumPayment, extraMonthlyPayment]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate what percentage of minimum goes to interest
  const interestPercentOfPayment = useMemo(() => {
    if (minimumPayment <= 0) return 0;
    return Math.min(100, (monthlyInterest / minimumPayment) * 100);
  }, [monthlyInterest, minimumPayment]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4 text-amber-500" />
            Interest Tracking
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-text-light cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Interest is calculated based on your APR ({apr}%) and current balance.
                  Paying more than the minimum reduces total interest paid.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Monthly Interest */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-600 mb-1">Monthly Interest</p>
            <p className="text-lg font-bold text-amber-700">
              {formatCurrency(monthlyInterest)}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {interestPercentOfPayment.toFixed(0)}% of min payment
            </p>
          </div>

          <div className="p-3 bg-silver-light/50 rounded-lg">
            <p className="text-xs text-text-medium mb-1">Est. Yearly Interest</p>
            <p className="text-lg font-bold text-text-dark">
              {formatCurrency(yearlyInterestEstimate)}
            </p>
            <p className="text-xs text-text-light mt-1">
              If balance unchanged
            </p>
          </div>
        </div>

        {/* Total Interest Paid */}
        {totalInterestPaid > 0 && (
          <div className="p-3 bg-blue-light/30 rounded-lg border border-blue/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue" />
                <span className="text-sm text-text-medium">Total Interest Paid</span>
              </div>
              <span className="text-sm font-bold text-blue">
                {formatCurrency(totalInterestPaid)}
              </span>
            </div>
          </div>
        )}

        {/* Savings Potential */}
        {potentialSavings && (
          <div className="p-3 bg-sage-light/30 rounded-lg border border-sage/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-sage" />
              <span className="text-sm font-medium text-text-dark">
                With +{formatCurrency(extraMonthlyPayment)}/month extra
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-text-light text-xs">Interest Saved</p>
                <p className="font-semibold text-sage">
                  {formatCurrency(potentialSavings.interestSaved)}
                </p>
              </div>
              <div>
                <p className="text-text-light text-xs">That's</p>
                <p className="font-semibold text-text-dark">
                  {((potentialSavings.interestSaved / yearlyInterestEstimate) * 100).toFixed(0)}% less interest
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Interest Impact Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-medium">Payment Breakdown</p>
          <div className="h-3 rounded-full overflow-hidden bg-silver-light flex">
            <div
              className="bg-amber-400 transition-all duration-300"
              style={{ width: `${interestPercentOfPayment}%` }}
              title="Interest portion"
            />
            <div
              className="bg-sage transition-all duration-300"
              style={{ width: `${100 - interestPercentOfPayment}%` }}
              title="Principal portion"
            />
          </div>
          <div className="flex justify-between text-xs text-text-light">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Interest ({interestPercentOfPayment.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sage" />
              Principal ({(100 - interestPercentOfPayment).toFixed(0)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
