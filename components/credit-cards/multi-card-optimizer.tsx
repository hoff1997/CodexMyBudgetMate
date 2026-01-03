'use client';

/**
 * Multi-Card Optimizer
 *
 * Displays payment optimization strategies for multiple credit cards:
 * - Avalanche (highest APR first)
 * - Snowball (lowest balance first)
 * - Comparison view
 */

import { useMemo, useState } from 'react';
import { TrendingDown, Zap, Calculator, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { comparePayoffStrategies, calculateAvalanchePayments, calculateSnowballPayments } from '@/lib/utils/interest-calculator';

interface CardDebt {
  accountId: string;
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

interface MultiCardOptimizerProps {
  cards: CardDebt[];
  extraBudget: number;
}

export function MultiCardOptimizer({
  cards,
  extraBudget,
}: MultiCardOptimizerProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Transform cards to have the accountId format expected by the interest calculator
  const cardsForCalc = useMemo(() => {
    return cards.map(card => ({
      accountId: card.accountId,
      balance: card.balance,
      apr: card.apr,
      minimumPayment: card.minimumPayment,
    }));
  }, [cards]);

  // Compare strategies using the utility function
  const comparison = useMemo(() => {
    if (cards.length === 0) return null;
    const totalBudget = cards.reduce((sum, c) => sum + c.minimumPayment, 0) + extraBudget;
    return comparePayoffStrategies(cardsForCalc, totalBudget);
  }, [cardsForCalc, cards, extraBudget]);

  // Get avalanche payments
  const avalanchePayments = useMemo(() => {
    if (cards.length === 0) return new Map<string, number>();
    const totalBudget = cards.reduce((sum, c) => sum + c.minimumPayment, 0) + extraBudget;
    return calculateAvalanchePayments(cardsForCalc, totalBudget);
  }, [cardsForCalc, cards, extraBudget]);

  // Get snowball payments
  const snowballPayments = useMemo(() => {
    if (cards.length === 0) return new Map<string, number>();
    const totalBudget = cards.reduce((sum, c) => sum + c.minimumPayment, 0) + extraBudget;
    return calculateSnowballPayments(cardsForCalc, totalBudget);
  }, [cardsForCalc, cards, extraBudget]);

  // Sort cards by strategy
  const avalancheOrder = useMemo(() => {
    return [...cards].sort((a, b) => b.apr - a.apr);
  }, [cards]);

  const snowballOrder = useMemo(() => {
    return [...cards].sort((a, b) => a.balance - b.balance);
  }, [cards]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format months as date
  const formatMonthsAsDate = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (cards.length < 2) {
    return null; // Only show for multiple cards
  }

  const totalDebt = cards.reduce((sum, card) => sum + card.balance, 0);
  const totalMinimum = cards.reduce((sum, card) => sum + card.minimumPayment, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-4 h-4 text-blue" />
            Debt Payoff Strategy
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-text-light cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  <strong>Avalanche:</strong> Pay highest APR first to minimize total interest.
                  <br /><br />
                  <strong>Snowball:</strong> Pay lowest balance first for quick wins and motivation.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-silver-light/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-text-light">Total Debt</p>
            <p className="text-sm font-bold text-text-dark">{formatCurrency(totalDebt)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-light">Min Payments</p>
            <p className="text-sm font-bold text-text-dark">{formatCurrency(totalMinimum)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-light">Extra Budget</p>
            <p className="text-sm font-bold text-sage">{formatCurrency(extraBudget)}</p>
          </div>
        </div>

        {/* Strategy Tabs */}
        <Tabs defaultValue="avalanche" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avalanche" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Avalanche
            </TabsTrigger>
            <TabsTrigger value="snowball" className="text-xs">
              <TrendingDown className="w-3 h-3 mr-1" />
              Snowball
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avalanche" className="space-y-3 mt-3">
            {comparison && (
              <>
                {/* Strategy Summary */}
                <div className="p-3 bg-blue-light/30 rounded-lg border border-blue/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-dark">Avalanche Strategy</span>
                    <span className="text-xs text-blue font-medium">Lowest Interest</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-text-light text-xs">Debt-free by</p>
                      <p className="font-semibold text-text-dark">
                        {formatMonthsAsDate(comparison.avalanche.monthsToPayoff)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-light text-xs">Total Interest</p>
                      <p className="font-semibold text-blue">
                        {formatCurrency(comparison.avalanche.totalInterest)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Order */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-medium">Payment Priority (Highest APR First)</p>
                  {avalancheOrder.map((card, index) => (
                    <PaymentOrderItem
                      key={card.accountId}
                      card={card}
                      position={index + 1}
                      monthlyPayment={avalanchePayments.get(card.accountId) || card.minimumPayment}
                      isExpanded={expandedCard === card.accountId}
                      onToggle={() => setExpandedCard(expandedCard === card.accountId ? null : card.accountId)}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="snowball" className="space-y-3 mt-3">
            {comparison && (
              <>
                {/* Strategy Summary */}
                <div className="p-3 bg-sage-light/30 rounded-lg border border-sage/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-dark">Snowball Strategy</span>
                    <span className="text-xs text-sage font-medium">Quick Wins</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-text-light text-xs">Debt-free by</p>
                      <p className="font-semibold text-text-dark">
                        {formatMonthsAsDate(comparison.snowball.monthsToPayoff)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-light text-xs">Total Interest</p>
                      <p className="font-semibold text-sage">
                        {formatCurrency(comparison.snowball.totalInterest)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Order */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-medium">Payment Priority (Lowest Balance First)</p>
                  {snowballOrder.map((card, index) => (
                    <PaymentOrderItem
                      key={card.accountId}
                      card={card}
                      position={index + 1}
                      monthlyPayment={snowballPayments.get(card.accountId) || card.minimumPayment}
                      isExpanded={expandedCard === `snowball-${card.accountId}`}
                      onToggle={() => setExpandedCard(expandedCard === `snowball-${card.accountId}` ? null : `snowball-${card.accountId}`)}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Comparison Note */}
        {comparison && comparison.interestDifference > 0 && (
          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs">
            <p className="text-amber-700">
              <strong>Avalanche saves you {formatCurrency(comparison.interestDifference)}</strong> in interest,
              but Snowball pays off your first card sooner for motivation.
            </p>
          </div>
        )}

        {comparison && comparison.interestDifference <= 0 && (
          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs">
            <p className="text-amber-700">
              Both strategies are similar for your current balances. Choose based on your preference!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PaymentOrderItemProps {
  card: CardDebt;
  position: number;
  monthlyPayment: number;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (amount: number) => string;
}

function PaymentOrderItem({
  card,
  position,
  monthlyPayment,
  isExpanded,
  onToggle,
  formatCurrency,
}: PaymentOrderItemProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-2 hover:bg-silver-light/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            position === 1 ? 'bg-blue text-white' : 'bg-silver-light text-text-medium'
          }`}>
            {position}
          </span>
          <span className="text-sm font-medium text-text-dark">{card.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-light">
            {formatCurrency(monthlyPayment)}/mo
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-light" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-light" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-2 pt-0 text-xs space-y-1 border-t border-border/50">
          <div className="flex justify-between">
            <span className="text-text-light">Balance</span>
            <span className="text-text-dark">{formatCurrency(card.balance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-light">APR</span>
            <span className="text-text-dark">{card.apr}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-light">Min Payment</span>
            <span className="text-text-dark">{formatCurrency(card.minimumPayment)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
