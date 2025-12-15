'use client';

/**
 * Payoff Preview
 *
 * Shows debt payoff projections for Options B/C.
 * Displays minimum payment timeline and potential savings with extra payments.
 */

import { useMemo } from 'react';
import { TrendingDown, Calendar, DollarSign, Zap, Info } from 'lucide-react';
import { calculatePayoffProjection, comparePaymentScenarios } from '@/lib/utils/interest-calculator';

interface PayoffPreviewProps {
  balance: number;
  apr: number;
  minimumPayment: number;
  extraMonthlyPayment?: number;
  showComparison?: boolean;
}

export function PayoffPreview({
  balance,
  apr,
  minimumPayment,
  extraMonthlyPayment = 0,
  showComparison = true,
}: PayoffPreviewProps) {
  // Calculate projections
  const baseProjection = useMemo(() => {
    return calculatePayoffProjection(balance, apr, minimumPayment);
  }, [balance, apr, minimumPayment]);

  const extraProjection = useMemo(() => {
    if (extraMonthlyPayment <= 0) return null;
    return calculatePayoffProjection(balance, apr, minimumPayment + extraMonthlyPayment);
  }, [balance, apr, minimumPayment, extraMonthlyPayment]);

  // Compare scenarios if extra payment provided
  const comparison = useMemo(() => {
    if (!showComparison || extraMonthlyPayment <= 0) return null;
    return comparePaymentScenarios(balance, apr, minimumPayment, extraMonthlyPayment);
  }, [balance, apr, minimumPayment, extraMonthlyPayment, showComparison]);

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatMonths = (months: number) => {
    if (months >= 600) return 'Never';
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${months} months`;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}y ${remainingMonths}m`;
  };

  // Handle edge cases - check if payoff isn't possible (monthsToPayoff = 9999)
  const reachesZero = baseProjection.monthsToPayoff < 9999;
  if (!reachesZero) {
    return (
      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Info className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">
              Payment Too Low
            </p>
            <p className="text-xs text-red-600 mt-1">
              The minimum payment of {formatCurrency(minimumPayment)} doesn't cover the
              monthly interest. Your balance will grow instead of shrink.
            </p>
            <p className="text-xs text-red-600 mt-2">
              Monthly interest: ~{formatCurrency(balance * (apr / 100 / 12))}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main projection card */}
      <div className="p-4 bg-blue-light/30 rounded-xl border border-blue/30">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-blue" />
          <span className="text-sm font-medium text-text-dark">Payoff Projection</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Time to payoff */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-text-light">
              <Calendar className="w-3 h-3" />
              <span>Time to debt-free</span>
            </div>
            <p className="text-lg font-semibold text-text-dark">
              {formatMonths(baseProjection.monthsToPayoff)}
            </p>
            <p className="text-xs text-text-medium">
              {baseProjection.projectedPayoffDate && formatDate(baseProjection.projectedPayoffDate)}
            </p>
          </div>

          {/* Total interest */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-text-light">
              <DollarSign className="w-3 h-3" />
              <span>Total interest</span>
            </div>
            <p className="text-lg font-semibold text-blue">
              {formatCurrency(baseProjection.totalInterestProjected)}
            </p>
            <p className="text-xs text-text-medium">
              Total paid: {formatCurrency(baseProjection.totalPaymentsProjected)}
            </p>
          </div>
        </div>
      </div>

      {/* Extra payment comparison */}
      {comparison && extraProjection && (
        <div className="p-4 bg-sage-light/30 rounded-xl border border-sage/30">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-sage" />
            <span className="text-sm font-medium text-text-dark">
              With +{formatCurrency(extraMonthlyPayment)}/month extra
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Time saved */}
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-lg font-semibold text-sage">
                {comparison.monthsSaved}
              </p>
              <p className="text-xs text-text-light">months saved</p>
            </div>

            {/* Interest saved */}
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-lg font-semibold text-sage">
                {formatCurrency(comparison.interestSaved)}
              </p>
              <p className="text-xs text-text-light">interest saved</p>
            </div>

            {/* New payoff date */}
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-sm font-semibold text-text-dark">
                {extraProjection.projectedPayoffDate && formatDate(extraProjection.projectedPayoffDate)}
              </p>
              <p className="text-xs text-text-light">debt-free by</p>
            </div>
          </div>
        </div>
      )}

      {/* Motivation note */}
      <div className="p-3 bg-background rounded-lg border border-border">
        <p className="text-xs text-text-medium">
          {baseProjection.monthsToPayoff <= 12 && (
            <>
              🎉 Great news! At this rate, you'll be debt-free in under a year!
            </>
          )}
          {baseProjection.monthsToPayoff > 12 && baseProjection.monthsToPayoff <= 36 && (
            <>
              💪 Stay consistent with your payments. Every extra dollar helps you get there faster!
            </>
          )}
          {baseProjection.monthsToPayoff > 36 && (
            <>
              📈 Long journey ahead, but you've got this. Consider adding extra to your payments when possible.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact inline payoff preview for use in forms
 */
export function PayoffPreviewCompact({
  balance,
  apr,
  minimumPayment,
}: {
  balance: number;
  apr: number;
  minimumPayment: number;
}) {
  const projection = useMemo(() => {
    return calculatePayoffProjection(balance, apr, minimumPayment);
  }, [balance, apr, minimumPayment]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const reachesZeroCompact = projection.monthsToPayoff < 9999;
  if (!reachesZeroCompact) {
    return (
      <div className="p-2 bg-red-50 rounded-lg text-xs text-red-600">
        Payment doesn't cover interest. Balance will grow.
      </div>
    );
  }

  return (
    <div className="p-2 bg-sage-light/30 rounded-lg text-xs">
      <p className="text-text-medium">
        Debt-free by{' '}
        <span className="font-medium text-text-dark">
          {projection.projectedPayoffDate && formatDate(projection.projectedPayoffDate)}
        </span>
        {' '}({projection.monthsToPayoff} months)
      </p>
      <p className="text-text-light mt-0.5">
        Total interest: <span className="text-blue">{formatCurrency(projection.totalInterestProjected)}</span>
      </p>
    </div>
  );
}
