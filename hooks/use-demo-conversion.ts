"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DemoStats {
  isDemo: boolean;
  daysInDemo?: number;
  startedAt?: string;
  achievementsEarned?: number;
  envelopesCreated?: number;
  transactionsTracked?: number;
  goalsCreated?: number;
  dismissalCount?: number;
  lastDismissalAt?: string | null;
}

/**
 * Hook to manage demo conversion state and actions
 */
export function useDemoConversion() {
  const router = useRouter();
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDemoStats();
  }, []);

  const fetchDemoStats = async () => {
    try {
      const response = await fetch('/api/demo/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch demo stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = () => {
    // Redirect to data choice page with conversion context
    router.push('/settings?convert=true');
  };

  const handleDismiss = async () => {
    try {
      await fetch('/api/demo/dismiss-conversion', {
        method: 'POST',
      });

      // Update local stats
      setStats(prev => prev ? {
        ...prev,
        dismissalCount: (prev.dismissalCount || 0) + 1,
        lastDismissalAt: new Date().toISOString(),
      } : null);
    } catch (error) {
      console.error('Failed to track dismissal:', error);
    }
  };

  // Determine if banner should show
  const shouldShowBanner = stats?.isDemo && stats.daysInDemo && stats.daysInDemo >= 3;

  // Determine variant based on urgency
  const getVariant = (): 'banner' | 'card' | 'modal' => {
    if (!stats?.daysInDemo) return 'banner';

    const dismissals = stats.dismissalCount || 0;

    if (stats.daysInDemo >= 14 && dismissals < 5) {
      // High urgency - show modal occasionally
      return dismissals % 3 === 0 ? 'modal' : 'card';
    } else if (stats.daysInDemo >= 7) {
      // Medium urgency - card in sidebar
      return 'card';
    } else {
      // Low urgency - gentle banner
      return 'banner';
    }
  };

  return {
    stats,
    isLoading,
    isDemo: stats?.isDemo || false,
    shouldShowBanner,
    variant: getVariant(),
    handleConvert,
    handleDismiss,
  };
}
