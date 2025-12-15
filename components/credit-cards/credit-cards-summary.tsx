'use client';

/**
 * Credit Cards Summary
 *
 * Dashboard widget showing overview of all credit cards.
 * - Total debt across all cards
 * - Total holding balance
 * - Quick view of each card
 */

import { useState, useEffect } from 'react';
import { CreditCard, TrendingDown, Wallet, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCardDashboardCard } from './credit-card-dashboard-card';
import type { CreditCardUsageType } from '@/lib/types/credit-card-onboarding';

interface CreditCardData {
  id: string;
  name: string;
  current_balance: number;
  cc_usage_type: CreditCardUsageType;
  cc_still_using: boolean;
  cc_starting_debt_amount: number;
  cc_current_outstanding: number;
  apr: number | null;
  statement_close_day: number | null;
  payment_due_day: number | null;
  holding_envelope?: {
    id: string;
    name: string;
    current_amount: number;
  } | null;
  current_cycle?: {
    cycle_identifier: string;
    current_holding_amount: number;
    new_spending_total: number;
  } | null;
  payoff_projection?: {
    starting_balance: number;
    current_balance: number;
    months_to_payoff: number;
    payoff_date: string;
    total_interest: number;
  } | null;
}

interface CreditCardsSummaryProps {
  onViewAllCards?: () => void;
  onRecordPayment?: (cardId: string) => void;
}

export function CreditCardsSummary({
  onViewAllCards,
  onRecordPayment,
}: CreditCardsSummaryProps) {
  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit cards data
  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch('/api/credit-cards');
        if (!response.ok) {
          throw new Error('Failed to fetch credit cards');
        }
        const data = await response.json();
        setCards(data.creditCards || []);
      } catch (err) {
        console.error('Error fetching credit cards:', err);
        setError('Failed to load credit cards');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCards();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  // Calculate totals
  const totals = cards.reduce(
    (acc, card) => {
      acc.totalDebt += Math.abs(card.current_balance);
      acc.totalHolding += card.holding_envelope?.current_amount || 0;
      return acc;
    },
    { totalDebt: 0, totalHolding: 0 }
  );

  // If no credit cards, don't show the widget
  if (!isLoading && cards.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue" />
            <CardTitle className="text-lg font-semibold text-text-dark">
              Credit Cards
            </CardTitle>
          </div>
          {onViewAllCards && cards.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAllCards}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-light" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-500 py-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-silver-light/30 rounded-xl">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-text-light mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Total Debt</span>
                </div>
                <p className="text-xl font-bold text-blue">
                  {formatCurrency(totals.totalDebt)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-text-light mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Total Holding</span>
                </div>
                <p className="text-xl font-bold text-sage">
                  {formatCurrency(totals.totalHolding)}
                </p>
              </div>
            </div>

            {/* Coverage Indicator */}
            {totals.totalDebt > 0 && (
              <div className="flex items-center justify-between p-2 bg-background rounded-lg border border-border text-sm">
                <span className="text-text-medium">Coverage</span>
                <span className={`font-medium ${
                  totals.totalHolding >= totals.totalDebt
                    ? 'text-sage'
                    : totals.totalHolding >= totals.totalDebt * 0.5
                      ? 'text-amber-500'
                      : 'text-blue'
                }`}>
                  {((totals.totalHolding / totals.totalDebt) * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Individual Cards (show max 3) */}
            <div className="space-y-3">
              {cards.slice(0, 3).map((card) => (
                <CreditCardDashboardCard
                  key={card.id}
                  card={card}
                  onRecordPayment={onRecordPayment ? () => onRecordPayment(card.id) : undefined}
                />
              ))}
            </div>

            {/* Show more indicator */}
            {cards.length > 3 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onViewAllCards}
              >
                View {cards.length - 3} more cards
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
