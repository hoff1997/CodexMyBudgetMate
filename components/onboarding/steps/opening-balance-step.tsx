"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/finance";
import { EnvelopeIcon } from "@/components/shared/envelope-icon";
import {
  AlertTriangle,
  Wallet,
  CreditCard,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  Thermometer,
  Gift,
  Pencil,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { RemyTip } from "@/components/onboarding/remy-tip";
import { AllocationStrategySelector } from "@/components/onboarding/allocation-strategy-selector";
import { CreditCardHoldingSection } from "@/components/onboarding/credit-card-holding-section";
import { WaterfallProgressCard } from "@/components/onboarding/waterfall-progress-card";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type BuiltInCategory,
} from "@/lib/onboarding/master-envelope-list";
import {
  calculateWaterfallAllocation,
  calculateAvailableFunds,
  getRecommendedStrategy,
  type AllocationStrategy,
  type EnvelopeForAllocation,
} from "@/lib/utils/waterfall-allocator";
import { detectSeasonalBill } from "@/lib/utils/seasonal-bills";
// Note: Celebration detection is now category-based (env.category === 'celebrations')
import type { EnvelopeData, IncomeSource, BankAccount } from "@/app/(app)/onboarding/unified-onboarding-client";

interface OpeningBalanceStepProps {
  envelopes: EnvelopeData[];
  incomeSources: IncomeSource[];
  bankAccounts: BankAccount[];
  envelopeAllocations: { [envelopeId: string]: { [incomeId: string]: number } };
  onOpeningBalancesChange: (balances: { [envelopeId: string]: number }) => void;
  onCreditCardAllocationChange?: (amount: number) => void;
}

// Priority types
type Priority = 'essential' | 'important' | 'discretionary';

// Priority configuration - matches envelope-allocation-step exactly
const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  dotColor: string;
  bgColor: string;
}> = {
  essential: {
    label: 'Essential',
    dotColor: 'bg-[#6B9ECE]', // blue
    bgColor: 'bg-[#DDEAF5]',
  },
  important: {
    label: 'Important',
    dotColor: 'bg-[#5A7E7A]', // sage-dark/green
    bgColor: 'bg-[#E2EEEC]',
  },
  discretionary: {
    label: 'Flexible',
    dotColor: 'bg-[#9CA3AF]', // silver
    bgColor: 'bg-[#F3F4F6]',
  },
};

// Type labels
const TYPE_LABELS: Record<string, string> = {
  bill: 'Bill',
  spending: 'Spending',
  savings: 'Savings',
  goal: 'Goal',
  tracking: 'Tracking',
  debt: 'Debt',
};

// Frequency labels
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  annually: 'Annual',
  custom: 'Custom',
};

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([...CATEGORY_ORDER, 'other']));

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
        perPayAllocation: totalPerPay,
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

  // Group envelopes by category (matching envelope-allocation-step)
  const envelopesByCategory = useMemo(() => {
    const grouped: Record<string, EnvelopeData[]> = {};

    // Initialize all category groups
    CATEGORY_ORDER.forEach(cat => {
      grouped[cat] = [];
    });
    grouped['other'] = [];

    envelopes.forEach(env => {
      const category = env.category || 'other';
      if (grouped[category]) {
        grouped[category].push(env);
      } else {
        grouped['other'].push(env);
      }
    });

    return grouped;
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

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get suggested amount for an envelope from waterfall result
  const getSuggestedAmount = (envelopeId: string): number => {
    const result = waterfallResult.results.find(r => r.envelopeId === envelopeId);
    return result?.suggested || 0;
  };

  // Sum opening balances in category
  const sumOpeningInCategory = (category: string): number => {
    const categoryEnvelopes = envelopesByCategory[category] || [];
    return categoryEnvelopes.reduce((sum, env) => sum + (openingBalances[env.id] || 0), 0);
  };

  // Count envelopes in category
  const countInCategory = (category: string): number => {
    return (envelopesByCategory[category] || []).length;
  };

  // Format date for display
  const formatDueDate = (dueDate: string | number | undefined): string => {
    if (!dueDate) return '—';
    if (typeof dueDate === 'number') {
      return `${dueDate.toString().padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
    }
    return new Date(dueDate).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Render envelope row - matches envelope-allocation-step exactly with Opening column added
  const renderEnvelopeRow = (env: EnvelopeData, index: number) => {
    const priority = (env.priority || 'discretionary') as Priority;
    const config = PRIORITY_CONFIG[priority];
    const suggested = getSuggestedAmount(env.id);
    const current = openingBalances[env.id] || 0;
    const isFullyFunded = current >= suggested && suggested > 0;

    // Check for celebration/seasonal indicators (category-based, not keyword-based)
    const isCelebrationCategory = env.category === 'celebrations';
    const seasonalDetection = isCelebrationCategory ? null : detectSeasonalBill(env.name);

    return (
      <tr key={env.id} className="border-b last:border-0 hover:bg-muted/20 group">
        {/* Priority */}
        <td className="px-1 py-2 text-center">
          <button
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bgColor}`}
            title={config.label}
          >
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          </button>
        </td>

        {/* Envelope Name */}
        <td className="px-2 py-2">
          <div className="flex items-center gap-2">
            <EnvelopeIcon icon={env.icon || "wallet"} size={18} />
            <div className="flex items-center gap-1">
              <span className="font-medium text-text-dark">
                {env.name}
              </span>
              {/* Celebration indicator */}
              {env.isCelebration && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold-light text-gold text-[10px]">
                        🎁
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Celebration envelope</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Leveled indicator */}
              {env.isLeveled && !env.isCelebration && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-light text-blue text-[10px]">
                        {env.seasonalPattern === 'winter-peak' ? '❄️' : '☀️'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Leveled ({env.seasonalPattern === 'winter-peak' ? 'Winter Peak' : 'Summer Peak'})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </td>

        {/* Type */}
        <td className="px-1 py-2 text-center hidden md:table-cell">
          <span className="text-xs text-muted-foreground">
            {TYPE_LABELS[env.type] || env.type}
          </span>
        </td>

        {/* Target */}
        <td className="px-1 py-2 text-right">
          <span className="text-text-medium">
            {formatCurrency(env.billAmount || env.savingsAmount || env.monthlyBudget || 0)}
          </span>
        </td>

        {/* Frequency */}
        <td className="px-1 py-2 text-center hidden sm:table-cell">
          <span className="text-muted-foreground text-xs">
            {FREQUENCY_LABELS[env.frequency || 'monthly'] || 'Monthly'}
          </span>
        </td>

        {/* Due Date */}
        <td className="px-1 py-2 text-center hidden lg:table-cell">
          <span className="text-muted-foreground text-xs flex items-center gap-1 justify-center">
            {env.dueDate ? (
              <>
                <CalendarIcon className="h-3 w-3" />
                {formatDueDate(env.dueDate)}
              </>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </span>
        </td>

        {/* Per Pay */}
        <td className="px-1 py-2 text-right">
          <span className="font-semibold text-[#5A7E7A]">
            {formatCurrency(env.payCycleAmount || 0)}
          </span>
        </td>

        {/* Suggested Opening */}
        <td className="px-1 py-2 text-right hidden lg:table-cell">
          <span className="text-muted-foreground text-xs">
            {formatCurrency(suggested)}
          </span>
        </td>

        {/* Opening Balance - editable */}
        <td className="px-1 py-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-medium">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={current || ''}
              onChange={(e) => handleBalanceChange(env.id, e.target.value)}
              placeholder="0"
              className={`h-7 w-24 text-right text-sm pl-5 pr-2 ${
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
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-text-dark">Set your starting point</h2>
        <p className="text-muted-foreground">
          How much is in your accounts right now? Let's distribute it across your envelopes.
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
                  {formatCurrency(totalBankBalance)}
                </div>
              </div>
            </div>

            {totalCreditCardDebt > 0 && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue" />
                <div>
                  <div className="text-xs text-text-medium">Credit Card Debt</div>
                  <div className="text-lg font-bold text-blue">
                    {formatCurrency(totalCreditCardDebt)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-text-medium">Available for Envelopes</div>
            <div className="text-2xl font-bold text-text-dark">
              {formatCurrency(availableForEnvelopes)}
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
            {formatCurrency(remaining)}
          </div>
        </div>
      </div>

      {/* Allocation Table by Category - matches envelope-allocation-step */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map((category) => {
          const categoryInfo = CATEGORY_LABELS[category as BuiltInCategory];
          if (!categoryInfo) return null;

          const categoryEnvelopes = envelopesByCategory[category] || [];
          if (categoryEnvelopes.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const categoryTotal = sumOpeningInCategory(category);

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F3F4F6] border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-lg">{categoryInfo.icon}</span>
                  <span className="font-semibold text-gray-700">{categoryInfo.label}</span>
                  <span className="text-sm text-muted-foreground">
                    ({countInCategory(category)})
                  </span>
                </div>
                <span className="font-semibold text-[#5A7E7A]">
                  {formatCurrency(categoryTotal)}
                </span>
              </button>

              {/* Category Content - Table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground w-10">Pri</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Envelope</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden md:table-cell w-16">Type</th>
                        <th className="text-right px-1 py-2 font-medium text-muted-foreground w-20">Target</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden sm:table-cell w-20">Freq</th>
                        <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-24">Due</th>
                        <th className="text-right px-1 py-2 font-medium text-[#5A7E7A] w-20">Per Pay</th>
                        <th className="text-right px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-20">Suggested</th>
                        <th className="text-right px-1 py-2 font-medium text-sage w-24">Opening</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryEnvelopes.map((env, idx) => renderEnvelopeRow(env, idx))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* Other/Uncategorized */}
        {envelopesByCategory['other']?.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('other')}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F3F4F6] border-b border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedCategories.has('other') ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-lg">📦</span>
                <span className="font-semibold text-gray-700">Other</span>
                <span className="text-sm text-muted-foreground">
                  ({envelopesByCategory['other'].length})
                </span>
              </div>
              <span className="font-semibold text-[#5A7E7A]">
                {formatCurrency(sumOpeningInCategory('other'))}
              </span>
            </button>

            {expandedCategories.has('other') && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground w-10">Pri</th>
                      <th className="text-left px-2 py-2 font-medium text-muted-foreground">Envelope</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden md:table-cell w-16">Type</th>
                      <th className="text-right px-1 py-2 font-medium text-muted-foreground w-20">Target</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden sm:table-cell w-20">Freq</th>
                      <th className="text-center px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-24">Due</th>
                      <th className="text-right px-1 py-2 font-medium text-[#5A7E7A] w-20">Per Pay</th>
                      <th className="text-right px-1 py-2 font-medium text-muted-foreground hidden lg:table-cell w-20">Suggested</th>
                      <th className="text-right px-1 py-2 font-medium text-sage w-24">Opening</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envelopesByCategory['other'].map((env, idx) => renderEnvelopeRow(env, idx))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Waterfall Progress Card */}
      <WaterfallProgressCard
        totalAvailable={availableForEnvelopes}
        creditCardAllocated={creditCardAllocation}
        essentialAllocated={envelopes
          .filter(env => env.priority === 'essential')
          .reduce((sum, env) => sum + (openingBalances[env.id] || 0), 0)}
        importantAllocated={envelopes
          .filter(env => env.priority === 'important')
          .reduce((sum, env) => sum + (openingBalances[env.id] || 0), 0)}
        flexibleAllocated={envelopes
          .filter(env => env.priority === 'discretionary' || !env.priority)
          .reduce((sum, env) => sum + (openingBalances[env.id] || 0), 0)}
        remaining={Math.max(0, remaining)}
      />

      {/* Warning for insufficient funds */}
      {hasInsufficientFunds && (
        <Alert className="border-gold bg-gold-light">
          <AlertTriangle className="h-5 w-5 text-gold" />
          <AlertTitle className="text-text-dark">Over Budget</AlertTitle>
          <AlertDescription className="text-sm text-text-dark">
            You&apos;re allocating <strong>{formatCurrency(Math.abs(remaining))}</strong> more
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
