"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Wallet, CreditCard, Sparkles, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
import { AllocationStrategySelector } from "@/components/onboarding/allocation-strategy-selector";
import { CreditCardHoldingSection } from "@/components/onboarding/credit-card-holding-section";
import { WaterfallProgressCard } from "@/components/onboarding/waterfall-progress-card";
import {
  calculateWaterfallAllocation,
  calculateAvailableFunds,
  getRecommendedStrategy,
  type AllocationStrategy,
  type EnvelopeForAllocation,
} from "@/lib/utils/waterfall-allocator";
import type { EnvelopeData, IncomeSource, BankAccount } from "@/app/(app)/onboarding/unified-onboarding-client";

interface OpeningBalanceStepProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  bankAccounts: BankAccount[];
  envelopeAllocations: { [envelopeId: string]: { [incomeId: string]: number } };
  onOpeningBalancesChange: (balances: { [envelopeId: string]: number }) => void;
  onCreditCardAllocationChange?: (amount: number) => void;
}

export function OpeningBalanceStep({
  envelopes,
  incomeSources,
  bankAccounts,
  envelopeAllocations,
  onOpeningBalancesChange,
  onCreditCardAllocationChange,
}: OpeningBalanceStepProps) {
  const [openingBalances, setOpeningBalances] = useState<{ [envelopeId: string]: number }>({});
  const [strategy, setStrategy] = useState<AllocationStrategy>("envelopes_only");
  const [hybridAmount, setHybridAmount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    essential: true,
    important: true,
    flexible: true,
  });

  // Calculate available funds
  const totalBankBalance = bankAccounts
    .filter(acc => acc.type !== 'credit_card')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalCreditCardDebt = bankAccounts
    .filter(acc => acc.type === 'credit_card')
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);

  // Get primary income for frequency calculations
  const primaryIncome = incomeSources[0];
  const userPayCycle = (primaryIncome?.frequency || 'fortnightly') as 'weekly' | 'fortnightly' | 'monthly';

  // Get recommended strategy
  const recommendation = useMemo(() => {
    return getRecommendedStrategy(totalBankBalance, totalCreditCardDebt);
  }, [totalBankBalance, totalCreditCardDebt]);

  // Initialize strategy and hybrid amount
  useEffect(() => {
    setStrategy(recommendation.strategy);
    if (recommendation.suggestedHybridAmount) {
      setHybridAmount(recommendation.suggestedHybridAmount);
    }
  }, [recommendation]);

  // Calculate available funds based on strategy
  const { availableForEnvelopes, creditCardAllocation } = useMemo(() => {
    return calculateAvailableFunds(
      totalBankBalance,
      totalCreditCardDebt,
      strategy,
      hybridAmount
    );
  }, [totalBankBalance, totalCreditCardDebt, strategy, hybridAmount]);

  // Notify parent of CC allocation changes
  useEffect(() => {
    onCreditCardAllocationChange?.(creditCardAllocation);
  }, [creditCardAllocation, onCreditCardAllocationChange]);

  // Convert envelopes to allocation format with per-pay amounts
  const envelopesForAllocation: EnvelopeForAllocation[] = useMemo(() => {
    return envelopes.map(env => {
      // Calculate total per-pay allocation from all income sources
      const envAllocations = envelopeAllocations[env.id] || {};
      const totalPerPay = Object.values(envAllocations).reduce((sum, amt) => sum + (amt || 0), 0);

      return {
        id: env.id,
        name: env.name,
        icon: env.icon,
        priority: env.priority as 'essential' | 'important' | 'discretionary',
        subtype: env.type as 'bill' | 'spending' | 'savings' | 'goal' | 'tracking',
        targetAmount: env.billAmount || env.savingsAmount || 0,
        frequency: env.frequency,
        dueDate: env.dueDate,
        perPayAllocation: totalPerPay, // Pass the user's actual per-pay budget
      };
    });
  }, [envelopes, envelopeAllocations]);

  // Calculate waterfall allocation
  const waterfallResult = useMemo(() => {
    return calculateWaterfallAllocation(
      availableForEnvelopes,
      envelopesForAllocation,
      userPayCycle
    );
  }, [availableForEnvelopes, envelopesForAllocation, userPayCycle]);

  // Calculate totals
  const totalAllocated = Object.values(openingBalances).reduce((sum, val) => sum + (val || 0), 0);
  const remaining = availableForEnvelopes - totalAllocated;
  const hasInsufficientFunds = remaining < 0;

  // Group envelopes by priority
  const groupedEnvelopes = useMemo(() => {
    const groups: Record<string, EnvelopeData[]> = {
      essential: [],
      important: [],
      flexible: [],
    };

    envelopes.forEach(env => {
      const priority = env.priority || 'discretionary';
      if (priority === 'essential') {
        groups.essential.push(env);
      } else if (priority === 'important') {
        groups.important.push(env);
      } else {
        groups.flexible.push(env);
      }
    });

    // Sort within each group by due date, then name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dueDateA = a.dueDate || 32;
        const dueDateB = b.dueDate || 32;
        if (dueDateA !== dueDateB) return dueDateA - dueDateB;
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [envelopes]);

  // Handle balance change
  const handleBalanceChange = (envelopeId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = {
      ...openingBalances,
      [envelopeId]: numValue,
    };
    setOpeningBalances(updated);
    onOpeningBalancesChange(updated);
  };

  // Auto-fill using waterfall algorithm
  const handleAutoFill = () => {
    const newBalances: Record<string, number> = {};
    waterfallResult.results.forEach(result => {
      newBalances[result.envelopeId] = result.allocated;
    });
    setOpeningBalances(newBalances);
    onOpeningBalancesChange(newBalances);
  };

  // Reset all allocations
  const handleReset = () => {
    setOpeningBalances({});
    onOpeningBalancesChange({});
  };

  // Toggle group expansion
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Get suggested amount for an envelope from waterfall result
  const getSuggestedAmount = (envelopeId: string): number => {
    const result = waterfallResult.results.find(r => r.envelopeId === envelopeId);
    return result?.suggested || 0;
  };

  // Render envelope group
  const renderEnvelopeGroup = (
    groupKey: string,
    groupTitle: string,
    groupEnvelopes: EnvelopeData[],
    dotColor: string,
    bgColor: string
  ) => {
    if (groupEnvelopes.length === 0) return null;

    const isExpanded = expandedGroups[groupKey];
    const groupTotal = groupEnvelopes.reduce(
      (sum, env) => sum + (openingBalances[env.id] || 0),
      0
    );

    return (
      <div key={groupKey} className={`rounded-lg border ${bgColor}`}>
        {/* Group Header */}
        <button
          type="button"
          onClick={() => toggleGroup(groupKey)}
          className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${dotColor}`} />
            <span className="font-semibold text-sm text-text-dark">{groupTitle}</span>
            <span className="text-xs text-text-medium">({groupEnvelopes.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-text-dark">
              ${groupTotal.toLocaleString()}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-medium" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-medium" />
            )}
          </div>
        </button>

        {/* Group Envelopes */}
        {isExpanded && (
          <div className="border-t border-silver-light overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-semibold text-text-medium border-b border-silver-light">
                  <th className="w-8 px-2 py-2"></th>
                  <th className="text-left px-2 py-2">Envelope</th>
                  <th className="text-center px-2 py-2 w-16">Type</th>
                  <th className="text-right px-2 py-2 w-20">Target</th>
                  <th className="text-center px-2 py-2 w-16">Freq</th>
                  <th className="text-center px-2 py-2 w-16">Due</th>
                  <th className="text-right px-2 py-2 w-20">Suggested</th>
                  <th className="text-right px-2 py-2 w-24">Opening</th>
                </tr>
              </thead>
              <tbody>
                {groupEnvelopes.map((envelope) => {
                  const suggested = getSuggestedAmount(envelope.id);
                  const current = openingBalances[envelope.id] || 0;
                  const isFullyFunded = current >= suggested;

                  return (
                    <tr
                      key={envelope.id}
                      className="border-b border-silver-very-light hover:bg-white/50"
                    >
                      <td className="px-2 py-2 text-center">
                        <span className="text-lg">{envelope.icon}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-medium text-sm text-text-dark">
                          {envelope.name}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-xs text-text-medium capitalize">
                          {envelope.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="text-sm text-text-dark">
                          {envelope.billAmount || envelope.savingsAmount
                            ? `$${(envelope.billAmount || envelope.savingsAmount || 0).toLocaleString()}`
                            : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-xs text-text-medium capitalize">
                          {envelope.frequency?.substring(0, 3) || '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-xs text-text-medium">
                          {envelope.dueDate ? `${envelope.dueDate}${getDaySuffix(envelope.dueDate)}` : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="text-sm text-text-medium">
                          ${suggested.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-medium">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={current || ''}
                            onChange={(e) => handleBalanceChange(envelope.id, e.target.value)}
                            placeholder="0"
                            className={`h-8 text-right text-sm pl-5 pr-2 ${
                              isFullyFunded
                                ? 'border-sage focus:ring-sage'
                                : current > 0
                                ? 'border-gold focus:ring-gold'
                                : ''
                            }`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-text-dark">Set your starting point</h2>
        <p className="text-text-medium">
          How much is in your accounts right now?
        </p>
      </div>

      {/* Remy's Tip */}
      <RemyTip pose="thinking">
        Let's set your starting balances. This tells us where you're at right
        now - no judgment, just reality. The more accurate you are here, the
        better your budget works from day one.
      </RemyTip>

      {/* Available Funds Summary */}
      <Card className="p-4 bg-gradient-to-br from-sage-very-light to-blue-light border-sage-light">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-sage" />
              <div>
                <div className="text-xs text-text-medium">Bank Balance</div>
                <div className="text-lg font-bold text-sage">
                  ${totalBankBalance.toLocaleString()}
                </div>
              </div>
            </div>

            {totalCreditCardDebt > 0 && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue" />
                <div>
                  <div className="text-xs text-text-medium">Credit Card Debt</div>
                  <div className="text-lg font-bold text-blue">
                    ${totalCreditCardDebt.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-text-medium">Available for Envelopes</div>
            <div className="text-2xl font-bold text-text-dark">
              ${availableForEnvelopes.toLocaleString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Allocation Strategy Selector (only if CC debt exists) */}
      {totalCreditCardDebt > 0 && (
        <AllocationStrategySelector
          strategy={strategy}
          onChange={setStrategy}
          bankBalance={totalBankBalance}
          creditCardDebt={totalCreditCardDebt}
          hybridAmount={hybridAmount}
          onHybridAmountChange={setHybridAmount}
          recommendation={recommendation.strategy}
        />
      )}

      {/* Credit Card Holding Section (only if CC debt exists) */}
      {totalCreditCardDebt > 0 && (
        <CreditCardHoldingSection
          totalDebt={totalCreditCardDebt}
          allocatedAmount={creditCardAllocation}
          strategy={strategy}
          bankBalance={totalBankBalance}
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAutoFill}
            className="bg-sage hover:bg-sage-dark text-white gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Auto-Fill by Priority
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="text-right">
          <div className="text-xs text-text-medium">Remaining to Allocate</div>
          <div className={`text-xl font-bold ${
            remaining < 0
              ? 'text-red-500'
              : remaining > 0
              ? 'text-sage'
              : 'text-text-medium'
          }`}>
            ${remaining.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Envelope Groups */}
      <div className="space-y-3">
        {renderEnvelopeGroup(
          'essential',
          'Essential',
          groupedEnvelopes.essential,
          'bg-sage-dark',
          'bg-sage-very-light border-sage-light'
        )}
        {renderEnvelopeGroup(
          'important',
          'Important',
          groupedEnvelopes.important,
          'bg-silver',
          'bg-silver-very-light border-silver-light'
        )}
        {renderEnvelopeGroup(
          'flexible',
          'Flexible',
          groupedEnvelopes.flexible,
          'bg-blue',
          'bg-blue-light border-blue'
        )}
      </div>

      {/* Waterfall Progress Card */}
      <WaterfallProgressCard
        totalAvailable={availableForEnvelopes}
        creditCardAllocated={creditCardAllocation}
        essentialAllocated={groupedEnvelopes.essential.reduce(
          (sum, env) => sum + (openingBalances[env.id] || 0),
          0
        )}
        importantAllocated={groupedEnvelopes.important.reduce(
          (sum, env) => sum + (openingBalances[env.id] || 0),
          0
        )}
        flexibleAllocated={groupedEnvelopes.flexible.reduce(
          (sum, env) => sum + (openingBalances[env.id] || 0),
          0
        )}
        remaining={Math.max(0, remaining)}
      />

      {/* Warning for insufficient funds */}
      {hasInsufficientFunds && (
        <Alert className="border-gold bg-gold-light">
          <AlertTriangle className="h-5 w-5 text-gold" />
          <AlertTitle className="text-text-dark">Over Budget</AlertTitle>
          <AlertDescription className="text-sm text-text-dark">
            You&apos;re allocating <strong>${Math.abs(remaining).toLocaleString()}</strong> more
            than available. You can still continue, but you&apos;ll need to add funds or
            adjust allocations when your next income arrives.
          </AlertDescription>
        </Alert>
      )}

      {/* Continue hint */}
      <div className="text-center text-sm text-text-medium">
        Click &quot;Continue&quot; to proceed to budget review
      </div>
    </div>
  );
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
