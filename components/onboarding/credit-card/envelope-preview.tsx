'use client';

/**
 * Envelope Preview
 *
 * Shows a preview of what will be set up based on the credit card configuration.
 *
 * Important: The system uses a SINGLE consolidated "CC Holding" envelope for ALL
 * credit cards (created via suggested-envelopes.ts), NOT per-card holding envelopes.
 *
 * For pay-in-full users: No additional envelopes needed - the CC Holding system
 * tracks their spending and the payment is reconciled automatically.
 *
 * For debt users: A "{CardName} Payoff" envelope is created to track debt elimination.
 */

import { CreditCard, TrendingDown, CheckCircle } from 'lucide-react';
import type { CreditCardUsageType } from '@/lib/types/credit-card-onboarding';

interface EnvelopePreviewProps {
  cardName: string;
  usageType: CreditCardUsageType;
  stillUsing: boolean;
  currentOutstanding?: number;
  expectedMonthlySpending?: number;
  startingDebtAmount?: number;
}

interface PreviewItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  initialAmount?: number;
  type: 'system' | 'debt';
}

export function EnvelopePreview({
  cardName,
  usageType,
  stillUsing,
  currentOutstanding,
  startingDebtAmount,
}: EnvelopePreviewProps) {
  const items: PreviewItem[] = [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount);
  };

  // For pay-in-full users: explain the CC Holding system (no extra envelopes needed)
  if (usageType === 'pay_in_full') {
    items.push({
      name: 'CC Holding System',
      description: `Your spending is tracked automatically. Keep ${formatCurrency(currentOutstanding || 0)} in your account to cover the current balance.`,
      icon: <CheckCircle className="w-4 h-4 text-sage" />,
      type: 'system',
    });
  }

  // For debt users: show the payoff envelope that will be created
  if (usageType === 'paying_down' || usageType === 'minimum_only') {
    // Debt payoff envelope
    items.push({
      name: `${cardName} Payoff`,
      description: stillUsing
        ? 'Tracks your debt payoff progress while new spending is tracked separately'
        : 'Tracks your journey to becoming debt-free',
      icon: <TrendingDown className="w-4 h-4 text-blue" />,
      initialAmount: startingDebtAmount || 0,
      type: 'debt',
    });

    // If still using the card, explain CC Holding tracks new spending
    if (stillUsing) {
      items.push({
        name: 'CC Holding System',
        description: 'New purchases are tracked separately from your legacy debt',
        icon: <CheckCircle className="w-4 h-4 text-sage" />,
        type: 'system',
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
        <CreditCard className="w-4 h-4" />
        <span>What we'll set up</span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                item.type === 'debt'
                  ? 'bg-blue-light/50'
                  : 'bg-sage-light/50'
              }`}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-text-dark">{item.name}</p>
                <p className="text-xs text-text-light">{item.description}</p>
              </div>
            </div>
            {item.initialAmount !== undefined && item.initialAmount > 0 && (
              <div className="text-right">
                <p className="text-sm font-medium text-text-dark">
                  {formatCurrency(item.initialAmount)}
                </p>
                <p className="text-xs text-text-light">to pay off</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary note */}
      <div className="p-3 bg-silver-light/30 rounded-lg border border-silver/30">
        <p className="text-xs text-text-medium">
          {usageType === 'pay_in_full' && (
            <>
              <strong>How it works:</strong> When you spend on this card, the CC Holding
              envelope automatically tracks how much you need to keep in your account.
              When you pay your card, the money comes from CC Holding - no extra budgeting needed!
            </>
          )}
          {usageType === 'paying_down' && stillUsing && (
            <>
              <strong>Hybrid mode:</strong> Your {formatCurrency(startingDebtAmount || 0)} legacy debt
              is tracked separately. New purchases go to CC Holding so you can see your true payoff progress.
            </>
          )}
          {usageType === 'paying_down' && !stillUsing && (
            <>
              <strong>Debt payoff mode:</strong> We'll track your {formatCurrency(startingDebtAmount || 0)} debt
              as you pay it down. Watch your progress toward being debt-free!
            </>
          )}
          {usageType === 'minimum_only' && (
            <>
              <strong>Minimum payments:</strong> We'll help you track minimum payments. When you're ready
              to pay off faster, you can switch to active paydown mode.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
