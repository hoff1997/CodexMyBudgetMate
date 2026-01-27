'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { Crown } from 'lucide-react';
import Link from 'next/link';

export function TrialBanner() {
  const { trialInfo, isBetaMode, isLoading } = useSubscription();

  // Don't show during beta mode, while loading, or if not trialing
  if (isBetaMode || isLoading || !trialInfo.isTrialing) {
    return null;
  }

  return (
    <div className="bg-gold-light border-b border-gold px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Crown className="w-4 h-4 text-gold-dark" />
          <span className="text-gold-dark font-medium">
            {trialInfo.daysRemaining === 0
              ? 'Your free trial ends today'
              : `${trialInfo.daysRemaining} day${trialInfo.daysRemaining === 1 ? '' : 's'} left in your free trial`}
          </span>
        </div>
        <Link
          href="/settings#subscription"
          className="text-sm font-medium text-gold-dark hover:underline whitespace-nowrap"
        >
          Upgrade now
        </Link>
      </div>
    </div>
  );
}
