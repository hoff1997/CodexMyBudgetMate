'use client';

/**
 * Envelope Preview
 *
 * Shows a preview of the envelopes that will be created based on the
 * credit card configuration. Helps users understand what's being set up.
 */

import { CreditCard, Wallet, Lock, TrendingDown } from 'lucide-react';
import type { CreditCardUsageType } from '@/lib/types/credit-card-onboarding';

interface EnvelopePreviewProps {
  cardName: string;
  usageType: CreditCardUsageType;
  stillUsing: boolean;
  currentOutstanding?: number;
  expectedMonthlySpending?: number;
  startingDebtAmount?: number;
}

interface PreviewEnvelope {
  name: string;
  description: string;
  icon: React.ReactNode;
  initialAmount?: number;
  type: 'holding' | 'payment' | 'debt';
}

export function EnvelopePreview({
  cardName,
  usageType,
  stillUsing,
  currentOutstanding,
  expectedMonthlySpending,
  startingDebtAmount,
}: EnvelopePreviewProps) {
  const envelopes: PreviewEnvelope[] = [];

  // CC Holding envelope - for all types that have active spending
  // Pay-in-full always gets holding; paying_down/minimum_only only if still using card
  const needsHolding = usageType === 'pay_in_full' || stillUsing;
  if (needsHolding) {
    const holdingAmount = usageType === 'pay_in_full'
      ? currentOutstanding || 0
      : 0; // Hybrid mode starts at 0 for new spending

    envelopes.push({
      name: `${cardName} Holding`,
      description: usageType === 'pay_in_full'
        ? 'Holds money for your current statement balance'
        : 'Tracks money set aside for new purchases',
      icon: <Wallet className="w-4 h-4 text-blue" />,
      initialAmount: holdingAmount,
      type: 'holding',
    });
  }

  // CC Payment envelope - for tracking payment obligations
  if (usageType === 'pay_in_full') {
    envelopes.push({
      name: `${cardName} Payment`,
      description: 'Monthly bill envelope for scheduling payments',
      icon: <CreditCard className="w-4 h-4 text-sage" />,
      type: 'payment',
    });
  }

  // Debt paydown tracking - for Options B/C
  if (usageType === 'paying_down' || usageType === 'minimum_only') {
    envelopes.push({
      name: `${cardName} Debt`,
      description: stillUsing
        ? 'Tracks your legacy debt separate from new spending'
        : 'Tracks your debt payoff progress',
      icon: <TrendingDown className="w-4 h-4 text-blue" />,
      initialAmount: startingDebtAmount || 0,
      type: 'debt',
    });

    // Minimum payment envelope for paying_down and minimum_only
    envelopes.push({
      name: `${cardName} Payment`,
      description: 'Ensures minimum payments are always covered',
      icon: <CreditCard className="w-4 h-4 text-sage" />,
      type: 'payment',
    });
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
        <CreditCard className="w-4 h-4" />
        <span>Envelopes to be created</span>
      </div>

      <div className="space-y-2">
        {envelopes.map((envelope, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                envelope.type === 'holding'
                  ? 'bg-blue-light/50'
                  : envelope.type === 'debt'
                    ? 'bg-blue-light/30'
                    : 'bg-sage-light/50'
              }`}>
                {envelope.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-text-dark">{envelope.name}</p>
                <p className="text-xs text-text-light">{envelope.description}</p>
              </div>
            </div>
            {envelope.initialAmount !== undefined && envelope.initialAmount > 0 && (
              <div className="text-right">
                <p className="text-sm font-medium text-text-dark">
                  {formatCurrency(envelope.initialAmount)}
                </p>
                <p className="text-xs text-text-light">starting</p>
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
              Your holding envelope will be pre-funded with your current statement balance
              ({formatCurrency(currentOutstanding || 0)}). New purchases will automatically
              add to this envelope.
            </>
          )}
          {usageType === 'paying_down' && stillUsing && (
            <>
              New purchases will be tracked separately from your {formatCurrency(startingDebtAmount || 0)} starting
              debt. This lets you see your true payoff progress.
            </>
          )}
          {usageType === 'paying_down' && !stillUsing && (
            <>
              Your {formatCurrency(startingDebtAmount || 0)} debt will be tracked as you pay it down.
              Watch your progress toward being debt-free!
            </>
          )}
          {usageType === 'minimum_only' && (
            <>
              We'll ensure your minimum payments are always budgeted. When you're ready
              to pay off faster, you can upgrade to active paydown mode.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
