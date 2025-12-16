'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { Feature } from '@/lib/types/subscription';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading, isBetaMode } = useSubscription();

  // Show children while loading (avoid flash of locked state)
  if (isLoading || isBetaMode) {
    return <>{children}</>;
  }

  if (!hasFeature(feature)) {
    return fallback || (
      <div className="p-6 bg-sage-very-light rounded-xl text-center">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium text-text-dark mb-1">Pro Feature</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to Pro to unlock this feature
        </p>
        <Link
          href="/settings#subscription"
          className="inline-block px-4 py-2 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
