'use client';

/**
 * Credit Card Fork Step
 *
 * Main onboarding step for configuring credit cards.
 * Handles the three usage type paths (A/B/C) and collects all necessary
 * configuration for each credit card.
 */

import { useState, useCallback, useMemo } from 'react';
import { CreditCard, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { UsageTypeSelector } from './usage-type-selector';
import { BillingCycleInputs } from './billing-cycle-inputs';
import { PayInFullConfig } from './pay-in-full-config';
import { PayingDownConfig } from './paying-down-config';
import { StillUsingToggle } from './still-using-toggle';
import { EnvelopePreview } from './envelope-preview';
import { PayoffPreview } from './payoff-preview';
import { RemyTip } from '@/components/onboarding/remy-tip';

import type { CreditCardUsageType, CreditCardConfig } from '@/lib/types/credit-card-onboarding';
import { validateCreditCardConfig } from '@/lib/utils/credit-card-onboarding-utils';

interface CreditCardAccount {
  id: string;
  name: string;
  current_balance: number; // Negative for debt
}

interface CreditCardForkStepProps {
  creditCards: CreditCardAccount[];
  onComplete: (configs: CreditCardConfig[]) => void;
  onBack?: () => void;
}

interface CardConfigState {
  usageType: CreditCardUsageType | null;
  statementCloseDay: number | null;
  paymentDueDay: number | null;
  currentOutstanding: number | null;
  expectedMonthlySpending: number | null;
  apr: number | null;
  minimumPayment: number | null;
  stillUsing: boolean;
  startingDebtAmount: number | null;
}

const initialCardState = (balance: number): CardConfigState => ({
  usageType: null,
  statementCloseDay: null,
  paymentDueDay: null,
  currentOutstanding: Math.abs(balance) || null,
  expectedMonthlySpending: null,
  apr: null,
  minimumPayment: null,
  stillUsing: true,
  startingDebtAmount: Math.abs(balance) || null,
});

export function CreditCardForkStep({
  creditCards,
  onComplete,
  onBack,
}: CreditCardForkStepProps) {
  // Track which card we're configuring
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Store configs for all cards
  const [cardConfigs, setCardConfigs] = useState<Map<string, CardConfigState>>(() => {
    const map = new Map();
    creditCards.forEach((card) => {
      map.set(card.id, initialCardState(card.current_balance));
    });
    return map;
  });

  // Track validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Current card and its config
  const currentCard = creditCards[currentCardIndex];
  const currentConfig = cardConfigs.get(currentCard?.id) || initialCardState(0);

  // Update config for current card
  const updateConfig = useCallback((updates: Partial<CardConfigState>) => {
    if (!currentCard) return;
    setCardConfigs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(currentCard.id) || initialCardState(currentCard.current_balance);
      newMap.set(currentCard.id, { ...current, ...updates });
      return newMap;
    });
    // Clear related errors
    setErrors({});
  }, [currentCard]);

  // Validate current card config
  const validateCurrentCard = useCallback((): boolean => {
    if (!currentCard) return false;

    const config = cardConfigs.get(currentCard.id);
    if (!config) return false;

    const newErrors: Record<string, string> = {};

    // Usage type required
    if (!config.usageType) {
      newErrors.usageType = 'Please select how you use this card';
    }

    // Billing cycle required for all types
    if (!config.statementCloseDay) {
      newErrors.statementCloseDay = 'Statement close day is required';
    }
    if (!config.paymentDueDay) {
      newErrors.paymentDueDay = 'Payment due day is required';
    }

    // Type-specific validation
    if (config.usageType === 'pay_in_full') {
      if (config.currentOutstanding !== null && config.currentOutstanding < 0) {
        newErrors.currentOutstanding = 'Current balance cannot be negative';
      }
    } else if (config.usageType === 'paying_down' || config.usageType === 'minimum_only') {
      if (!config.apr || config.apr <= 0) {
        newErrors.apr = 'APR is required for debt tracking';
      }
      if (!config.minimumPayment || config.minimumPayment <= 0) {
        newErrors.minimumPayment = 'Minimum payment is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentCard, cardConfigs]);

  // Handle next card or complete
  const handleNext = useCallback(() => {
    if (!validateCurrentCard()) return;

    if (currentCardIndex < creditCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setErrors({});
    } else {
      // Build final configs and complete
      const finalConfigs: CreditCardConfig[] = [];

      creditCards.forEach((card) => {
        const config = cardConfigs.get(card.id);
        if (!config || !config.usageType) return;

        finalConfigs.push({
          accountId: card.id,
          accountName: card.name,
          usageType: config.usageType,
          billingCycle: {
            statementCloseDay: config.statementCloseDay!,
            paymentDueDay: config.paymentDueDay!,
          },
          currentOutstanding: config.currentOutstanding ?? undefined,
          expectedMonthlySpending: config.expectedMonthlySpending ?? undefined,
          apr: config.apr ?? undefined,
          minimumPayment: config.minimumPayment ?? undefined,
          stillUsing: config.stillUsing,
          startingDebtAmount: config.startingDebtAmount ?? undefined,
          startingDebtDate: new Date().toISOString(),
        });
      });

      onComplete(finalConfigs);
    }
  }, [validateCurrentCard, currentCardIndex, creditCards, cardConfigs, onComplete]);

  // Handle going back
  const handleBack = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setErrors({});
    } else if (onBack) {
      onBack();
    }
  }, [currentCardIndex, onBack]);

  // Skip this card (for future - maybe allow skipping)
  // const handleSkip = useCallback(() => {
  //   if (currentCardIndex < creditCards.length - 1) {
  //     setCurrentCardIndex(currentCardIndex + 1);
  //   }
  // }, [currentCardIndex, creditCards.length]);

  // If no credit cards, show empty state
  if (creditCards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Credit Cards
          </CardTitle>
          <CardDescription>
            No credit cards found in your accounts. You can add them later from the Accounts page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => onComplete([])} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Progress indicator
  const progress = ((currentCardIndex + 1) / creditCards.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar for multiple cards */}
      {creditCards.length > 1 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-text-medium">
            <span>Card {currentCardIndex + 1} of {creditCards.length}</span>
            <span>{currentCard.name}</span>
          </div>
          <div className="h-1.5 bg-silver-light rounded-full overflow-hidden">
            <div
              className="h-full bg-blue transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Remy's encouragement about honesty */}
      <RemyTip pose="encouraging">
        <p className="font-medium mb-1">Being honest with yourself is the first step to financial freedom.</p>
        <p>
          At My Budget Mate, we believe in facing reality head-on - no judgement, just support.
          Your answers here are completely private and help us set you up for success.
          The more honest you are, the better we can help you reach your goals.
        </p>
      </RemyTip>

      {/* Main card configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue" />
            {currentCard.name}
          </CardTitle>
          <CardDescription>
            Current balance: {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(Math.abs(currentCard.current_balance))}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Usage Type Selection */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-text-dark">
              How do you use this card?
            </h3>
            <UsageTypeSelector
              value={currentConfig.usageType}
              onChange={(type) => updateConfig({ usageType: type })}
              cardName={currentCard.name}
              currentBalance={currentCard.current_balance}
            />
            {errors.usageType && (
              <p className="text-xs text-red-500 mt-1">{errors.usageType}</p>
            )}
          </section>

          {/* Step 2: Billing Cycle (shown for all types) */}
          {currentConfig.usageType && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-text-dark">
                Billing cycle
              </h3>
              <BillingCycleInputs
                statementCloseDay={currentConfig.statementCloseDay}
                paymentDueDay={currentConfig.paymentDueDay}
                onStatementCloseDayChange={(day) => updateConfig({ statementCloseDay: day })}
                onPaymentDueDayChange={(day) => updateConfig({ paymentDueDay: day })}
                errors={{
                  statementCloseDay: errors.statementCloseDay,
                  paymentDueDay: errors.paymentDueDay,
                }}
              />
            </section>
          )}

          {/* Step 3A: Pay in Full Config */}
          {currentConfig.usageType === 'pay_in_full' && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-text-dark">
                Card details
              </h3>
              <PayInFullConfig
                currentOutstanding={currentConfig.currentOutstanding}
                expectedMonthlySpending={currentConfig.expectedMonthlySpending}
                onCurrentOutstandingChange={(amount) => updateConfig({ currentOutstanding: amount })}
                onExpectedMonthlySpendingChange={(amount) => updateConfig({ expectedMonthlySpending: amount })}
                cardName={currentCard.name}
              />
            </section>
          )}

          {/* Step 3B/C: Paying Down Config */}
          {(currentConfig.usageType === 'paying_down' || currentConfig.usageType === 'minimum_only') && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-text-dark">
                  Debt details
                </h3>
                <PayingDownConfig
                  apr={currentConfig.apr}
                  minimumPayment={currentConfig.minimumPayment}
                  startingDebtAmount={currentConfig.startingDebtAmount}
                  onAPRChange={(apr) => updateConfig({ apr })}
                  onMinimumPaymentChange={(payment) => updateConfig({ minimumPayment: payment })}
                  cardName={currentCard.name}
                  usageType={currentConfig.usageType}
                  errors={{
                    apr: errors.apr,
                    minimumPayment: errors.minimumPayment,
                  }}
                />
              </section>

              {/* Still using toggle for B/C */}
              <section className="space-y-3">
                <StillUsingToggle
                  value={currentConfig.stillUsing}
                  onChange={(stillUsing) => updateConfig({ stillUsing })}
                  cardName={currentCard.name}
                />
              </section>

              {/* Payoff preview for B */}
              {currentConfig.usageType === 'paying_down' &&
                currentConfig.apr &&
                currentConfig.minimumPayment &&
                currentConfig.startingDebtAmount &&
                currentConfig.startingDebtAmount > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-medium text-text-dark">
                    Your payoff journey
                  </h3>
                  <PayoffPreview
                    balance={currentConfig.startingDebtAmount}
                    apr={currentConfig.apr}
                    minimumPayment={currentConfig.minimumPayment}
                    showComparison={false}
                  />
                </section>
              )}
            </>
          )}

          {/* Envelope Preview (shown when config is sufficient) */}
          {currentConfig.usageType && currentConfig.statementCloseDay && currentConfig.paymentDueDay && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-text-dark">
                What we'll set up
              </h3>
              <EnvelopePreview
                cardName={currentCard.name}
                usageType={currentConfig.usageType}
                stillUsing={currentConfig.stillUsing}
                currentOutstanding={currentConfig.currentOutstanding ?? undefined}
                expectedMonthlySpending={currentConfig.expectedMonthlySpending ?? undefined}
                startingDebtAmount={currentConfig.startingDebtAmount ?? undefined}
              />
            </section>
          )}

          {/* Validation errors summary */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                Please fill in all required fields before continuing.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          className="flex items-center gap-2"
        >
          {currentCardIndex < creditCards.length - 1 ? (
            <>
              Next Card
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Complete
              <Check className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
