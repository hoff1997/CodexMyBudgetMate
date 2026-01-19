'use client';

/**
 * Usage Type Selector
 *
 * Radio card selector for choosing how the user uses their credit card:
 * - Option A: Pay in full each month
 * - Option B: Carrying a balance to pay down
 * - Option C: Just tracking minimum payments
 */

import { CreditCard, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreditCardUsageType } from '@/lib/types/credit-card-onboarding';

interface UsageTypeSelectorProps {
  value: CreditCardUsageType | null;
  onChange: (value: CreditCardUsageType) => void;
  cardName: string;
  currentBalance: number;
}

interface UsageOption {
  type: CreditCardUsageType;
  title: string;
  description: string;
  icon: typeof CreditCard;
  details: string;
}

const usageOptions: UsageOption[] = [
  {
    type: 'pay_in_full',
    title: 'I pay this off in full each month',
    description: 'You clear the balance every statement',
    icon: CreditCard,
    details: "We'll move money to your credit card holding account each time you reconcile a transaction that used your credit card, ready for when the bill is due. You're in control of making sure it stays there until payment day.",
  },
  {
    type: 'paying_down',
    title: "I'm carrying a balance I'd like to pay down",
    description: 'You have debt you want to reduce',
    icon: TrendingDown,
    details: "We'll help you track your progress and project when you'll be debt-free.",
  },
  {
    type: 'minimum_only',
    title: 'I just want to track minimum payments',
    description: 'Focus on the payment obligation',
    icon: DollarSign,
    details: "We'll track your minimum payment as a bill so you can budget for it.",
  },
];

export function UsageTypeSelector({
  value,
  onChange,
  cardName,
  currentBalance,
}: UsageTypeSelectorProps) {
  // Format balance for display
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(currentBalance));

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-text-dark">{cardName}</h3>
        <p className="text-sm text-text-medium">
          Current balance: <span className="font-medium text-blue">{formattedBalance}</span>
        </p>
      </div>

      <div className="space-y-3">
        {usageOptions.map((option) => {
          const isSelected = value === option.type;
          const Icon = option.icon;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onChange(option.type)}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all',
                'hover:border-sage hover:bg-sage-very-light/50',
                'focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2',
                isSelected
                  ? 'border-sage bg-sage-very-light'
                  : 'border-silver-light bg-white'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-sage text-white' : 'bg-silver-very-light text-text-medium'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-medium',
                        isSelected ? 'text-sage-dark' : 'text-text-dark'
                      )}
                    >
                      {option.title}
                    </span>
                    {isSelected && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sage flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-medium mt-0.5">{option.description}</p>
                  {isSelected && (
                    <p className="text-xs text-sage-dark mt-2 bg-sage-very-light/50 p-2 rounded-lg">
                      {option.details}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
