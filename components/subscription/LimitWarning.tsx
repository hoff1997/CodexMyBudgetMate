'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface LimitWarningProps {
  limitType: 'envelopes' | 'accounts' | 'income_sources';
  currentCount: number;
  itemName?: string;
}

export function LimitWarning({ limitType, currentCount, itemName }: LimitWarningProps) {
  const { currentPlan, isWithinLimit, isBetaMode } = useSubscription();

  // No warning needed in beta mode or if within limits
  if (isBetaMode || isWithinLimit(limitType, currentCount)) {
    return null;
  }

  const limits = currentPlan?.limits || { envelopes: 10, accounts: 2, income_sources: 1 };
  const limit = limits[limitType];

  const names: Record<string, string> = {
    envelopes: 'envelopes',
    accounts: 'accounts',
    income_sources: 'income sources',
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-blue-light border border-blue rounded-xl">
      <AlertTriangle className="w-5 h-5 text-blue flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-blue font-medium">
          {itemName || names[limitType]} limit reached
        </p>
        <p className="text-sm text-blue mt-1">
          You&apos;ve used all {limit} {names[limitType]} on the Free plan.{' '}
          <Link href="/settings#subscription" className="underline font-medium">
            Upgrade to Pro
          </Link>
          {' '}for unlimited {names[limitType]}.
        </p>
      </div>
    </div>
  );
}
