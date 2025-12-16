'use client';

import { useState, useEffect } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { SubscriptionPlan } from '@/lib/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';

export function PricingPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const { currentPlan, isActive, isBetaMode } = useSubscription();

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/stripe/plans');
        const data = await response.json();
        setPlans(data.plans || []);
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlans();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
      </div>
    );
  }

  const featureLabels: Record<string, string> = {
    basic_budgeting: 'Envelope budgeting',
    bank_connection: 'Bank connection (Akahu)',
    transactions: 'Transaction categorisation',
    unlimited_envelopes: 'Unlimited envelopes',
    unlimited_accounts: 'Unlimited bank accounts',
    unlimited_income: 'Unlimited income sources',
    net_worth: 'Net worth tracking',
    reports: 'Advanced reports',
    data_export: 'Data export',
    priority_support: 'Priority support',
  };

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-sage-very-light rounded-lg p-1 inline-flex">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${billingInterval === 'monthly'
                ? 'bg-white text-text-dark shadow-sm'
                : 'text-muted-foreground'
              }
            `}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${billingInterval === 'yearly'
                ? 'bg-white text-text-dark shadow-sm'
                : 'text-muted-foreground'
              }
            `}
          >
            Yearly
            <span className="ml-1 text-xs text-sage-dark">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.slug === plan.slug;
          const isPro = plan.slug === 'pro';
          const price = billingInterval === 'yearly'
            ? plan.price_yearly
            : plan.price_monthly;

          return (
            <div
              key={plan.id}
              className={`
                rounded-xl border-2 overflow-hidden
                ${isPro
                  ? 'border-sage bg-white'
                  : 'border-sage-light bg-white'
                }
              `}
            >
              {/* Header */}
              <div className={`
                px-6 py-4
                ${isPro ? 'bg-sage-very-light' : 'bg-sage-very-light'}
              `}>
                <div className="flex items-center gap-2">
                  {isPro && <Crown className="w-5 h-5 text-sage-dark" />}
                  <h3 className="font-semibold text-text-dark">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="px-6 py-4 border-b border-sage-light">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-text-dark">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground">
                      /{billingInterval === 'yearly' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                {price === 0 && (
                  <p className="text-sm text-muted-foreground">Free forever</p>
                )}
              </div>

              {/* Features */}
              <div className="px-6 py-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {featureLabels[feature] || feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="px-6 py-4 border-t border-sage-light">
                {isBetaMode ? (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    Included in beta
                  </div>
                ) : isCurrentPlan && isActive ? (
                  <div className="text-center py-2 text-sm font-medium text-sage-dark">
                    Current plan
                  </div>
                ) : isPro ? (
                  <UpgradePlanButton
                    priceId={billingInterval === 'yearly'
                      ? plan.stripe_price_id_yearly
                      : plan.stripe_price_id_monthly
                    }
                    interval={billingInterval}
                  />
                ) : (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    Free plan
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpgradePlanButton({
  priceId,
  interval
}: {
  priceId: string | null;
  interval: 'monthly' | 'yearly';
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!priceId) return;

    try {
      setIsLoading(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || !priceId}
      className="w-full py-2.5 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
      ) : (
        'Upgrade to Pro'
      )}
    </button>
  );
}
