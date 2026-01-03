'use client';

/**
 * Reconciliation Widget
 *
 * Displays the reconciliation status with CC holding factored in.
 * Shows:
 * - Bank balance
 * - CC Holding amount
 * - Available cash (bank - holding)
 * - Envelope total
 * - Discrepancy if any
 */

import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Info, Wallet, Building2, Minus, Equal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { validateReconciliation } from '@/lib/utils/reconciliation-calculator';

interface ReconciliationWidgetProps {
  bankBalance: number;
  envelopeTotal: number;
  ccHoldingBalance: number;
  showDetails?: boolean;
}

export function ReconciliationWidget({
  bankBalance,
  envelopeTotal,
  ccHoldingBalance,
  showDetails = true,
}: ReconciliationWidgetProps) {
  // Run reconciliation validation
  const result = useMemo(() => {
    return validateReconciliation(bankBalance, envelopeTotal, ccHoldingBalance);
  }, [bankBalance, envelopeTotal, ccHoldingBalance]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Determine status styling
  const statusStyle = useMemo(() => {
    if (result.isBalanced) {
      return {
        bgColor: 'bg-sage-light/30',
        borderColor: 'border-sage/30',
        iconColor: 'text-sage',
        icon: CheckCircle2,
        statusText: 'Balanced',
      };
    } else if (Math.abs(result.discrepancy) < 10) {
      return {
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        iconColor: 'text-amber-500',
        icon: AlertTriangle,
        statusText: 'Minor Difference',
      };
    } else {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
        icon: AlertTriangle,
        statusText: 'Out of Balance',
      };
    }
  }, [result.isBalanced, result.discrepancy]);

  const StatusIcon = statusStyle.icon;

  return (
    <Card className={`${statusStyle.borderColor} ${statusStyle.bgColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StatusIcon className={`w-5 h-5 ${statusStyle.iconColor}`} />
            Reconciliation
          </CardTitle>
          <span className={`text-xs font-medium ${statusStyle.iconColor}`}>
            {statusStyle.statusText}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-text-medium">
          {result.explanation}
        </p>

        {/* Detailed Breakdown */}
        {showDetails && (
          <div className="space-y-3">
            {/* Formula Visual */}
            <div className="p-3 bg-white rounded-lg border border-border/50 space-y-2">
              {/* Bank Balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-medium">
                  <Building2 className="w-4 h-4" />
                  <span>Bank Balance</span>
                </div>
                <span className="text-sm font-medium text-text-dark">
                  {formatCurrency(result.breakdown.bankBalance)}
                </span>
              </div>

              {/* CC Holding (subtracted) */}
              {result.breakdown.ccHoldingBalance > 0 && (
                <>
                  <div className="flex items-center justify-between text-text-light">
                    <div className="flex items-center gap-2 text-sm">
                      <Minus className="w-4 h-4" />
                      <span>CC Holding (reserved)</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              Money in your CC Holding envelope is reserved for credit card payments.
                              It's in the bank but already "spent" via credit card.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-sm text-blue">
                      {formatCurrency(result.breakdown.ccHoldingBalance)}
                    </span>
                  </div>

                  <div className="border-t border-border/50 pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-text-medium">
                      <Equal className="w-4 h-4" />
                      <span>Available Cash</span>
                    </div>
                    <span className="text-sm font-bold text-text-dark">
                      {formatCurrency(result.breakdown.bankBalance - result.breakdown.ccHoldingBalance)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-white rounded-lg border border-border/50">
                <p className="text-xs text-text-light">Adjusted Envelopes</p>
                <p className="font-medium text-text-dark">
                  {formatCurrency(result.breakdown.adjustedEnvelopeTotal)}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-border/50">
                <p className="text-xs text-text-light">Discrepancy</p>
                <p className={`font-medium ${
                  result.isBalanced
                    ? 'text-sage'
                    : result.discrepancy > 0
                      ? 'text-amber-500'
                      : 'text-red-500'
                }`}>
                  {result.discrepancy >= 0 ? '+' : ''}{formatCurrency(result.discrepancy)}
                </p>
              </div>
            </div>

            {/* Action hint */}
            {!result.isBalanced && (
              <div className="text-xs text-text-light">
                {result.discrepancy > 0 ? (
                  <p>
                    Tip: You have {formatCurrency(result.discrepancy)} more in the bank than allocated.
                    Consider allocating this surplus to your envelopes.
                  </p>
                ) : (
                  <p>
                    Tip: Your envelopes total {formatCurrency(Math.abs(result.discrepancy))} more than
                    your available cash. Check for over-allocated envelopes.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact reconciliation status indicator
 */
export function ReconciliationStatusBadge({
  isBalanced,
  discrepancy,
}: {
  isBalanced: boolean;
  discrepancy: number;
}) {
  if (isBalanced) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-light/50 text-sage text-xs font-medium">
        <CheckCircle2 className="w-3 h-3" />
        Balanced
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      Math.abs(discrepancy) < 10
        ? 'bg-amber-50 text-amber-600'
        : 'bg-red-50 text-red-600'
    }`}>
      <AlertTriangle className="w-3 h-3" />
      {discrepancy >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(discrepancy)}
    </span>
  );
}
