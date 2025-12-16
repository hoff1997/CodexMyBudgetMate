'use client';

import { useState, useEffect, useCallback } from 'react';
import { Subscription, SubscriptionPlan, Feature } from '@/lib/types/subscription';

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  currentPlan: SubscriptionPlan | null;
  isActive: boolean;
  isBetaMode: boolean;
  isLoading: boolean;
  error: string | null;
  hasFeature: (feature: Feature) => boolean;
  isWithinLimit: (limitType: 'envelopes' | 'accounts' | 'income_sources', count: number) => boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isBetaMode, setIsBetaMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/subscription');

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();

      setSubscription(data.subscription);
      setCurrentPlan(data.currentPlan);
      setIsActive(data.isActive);
      setIsBetaMode(data.isBetaMode);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasFeature = useCallback((feature: Feature): boolean => {
    // Beta mode = all features
    if (isBetaMode) return true;

    // Check plan features
    const features = currentPlan?.features || [];
    return features.includes(feature);
  }, [isBetaMode, currentPlan]);

  const isWithinLimit = useCallback((
    limitType: 'envelopes' | 'accounts' | 'income_sources',
    count: number
  ): boolean => {
    // Beta mode = no limits
    if (isBetaMode) return true;

    const limits = currentPlan?.limits || { envelopes: 10, accounts: 2, income_sources: 1 };
    const limit = limits[limitType];

    // -1 = unlimited
    if (limit === -1) return true;

    return count < limit;
  }, [isBetaMode, currentPlan]);

  return {
    subscription,
    currentPlan,
    isActive,
    isBetaMode,
    isLoading,
    error,
    hasFeature,
    isWithinLimit,
    refresh: fetchSubscription,
  };
}
