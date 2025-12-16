'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Crown, Loader2, ExternalLink } from 'lucide-react';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function SubscriptionCard() {
  const { subscription, currentPlan, isActive, isBetaMode, isLoading } = useSubscription();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsRedirecting(true);
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-sage-light rounded-xl p-6 animate-pulse">
        <div className="h-6 w-32 bg-sage-very-light rounded mb-4" />
        <div className="h-4 w-48 bg-sage-very-light rounded" />
      </div>
    );
  }

  // Beta mode display
  if (isBetaMode) {
    return (
      <div className="bg-gold-light border border-gold rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-gold-dark" />
          <h3 className="font-semibold text-gold-dark">Beta Access</h3>
        </div>
        <p className="text-sm text-gold-dark">
          You have full access to all features during the beta period. Enjoy!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-sage-light rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-sage-light flex items-center justify-between">
        <h2 className="font-semibold text-text-dark">Subscription</h2>
        {isActive && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sage-very-light text-sage-dark">
            Active
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Current plan */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${currentPlan?.slug === 'pro'
              ? 'bg-gold-light text-gold'
              : 'bg-sage-very-light text-muted-foreground'
            }
          `}>
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-text-dark">{currentPlan?.name} Plan</p>
            <p className="text-sm text-muted-foreground">
              {currentPlan?.slug === 'pro'
                ? `$${currentPlan.price_monthly}/month`
                : 'Free forever'
              }
            </p>
          </div>
        </div>

        {/* Billing info for active subscriptions */}
        {isActive && subscription?.current_period_end && (
          <div className="bg-sage-very-light rounded-lg p-3 mb-4">
            <p className="text-sm text-muted-foreground">
              {subscription.cancel_at_period_end ? (
                <>Cancels on {formatDate(subscription.current_period_end)}</>
              ) : (
                <>Next billing date: {formatDate(subscription.current_period_end)}</>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        {isActive ? (
          <button
            onClick={handleManageSubscription}
            disabled={isRedirecting}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-sage-light text-muted-foreground rounded-lg hover:bg-sage-very-light transition-colors disabled:opacity-50"
          >
            {isRedirecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Manage Subscription
              </>
            )}
          </button>
        ) : (
          <UpgradeButton />
        )}
      </div>
    </div>
  );
}

function UpgradeButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (interval: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);

      const priceId = interval === 'yearly'
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY;

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, interval }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => handleUpgrade('monthly')}
        disabled={isLoading}
        className="w-full py-2.5 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        ) : (
          'Upgrade to Pro - $9.99/month'
        )}
      </button>
      <button
        onClick={() => handleUpgrade('yearly')}
        disabled={isLoading}
        className="w-full py-2.5 border border-sage text-sage-dark font-medium rounded-lg hover:bg-sage-very-light transition-colors disabled:opacity-50"
      >
        Yearly - $99/year (save 17%)
      </button>
    </div>
  );
}
