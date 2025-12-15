'use client';

/**
 * Credit Card Dashboard Card
 *
 * Dashboard widget showing credit card status with:
 * - This Statement vs Next Statement breakdown
 * - Holding balance vs debt balance
 * - Payoff progress for paying_down types
 * - Quick actions
 */

import { useMemo } from 'react';
import { CreditCard, TrendingDown, Calendar, DollarSign, ArrowRight, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { CreditCardUsageType } from '@/lib/types/credit-card-onboarding';

interface CreditCardDashboardCardProps {
  card: {
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
  };
  onViewDetails?: () => void;
  onRecordPayment?: () => void;
}

export function CreditCardDashboardCard({
  card,
  onViewDetails,
  onRecordPayment,
}: CreditCardDashboardCardProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  // Calculate values
  const totalDebt = Math.abs(card.current_balance);
  const holdingBalance = card.holding_envelope?.current_amount || 0;
  const thisStatementSpending = card.current_cycle?.new_spending_total || 0;
  const legacyDebt = card.cc_starting_debt_amount || 0;

  // Progress for paying_down types
  const debtProgress = useMemo(() => {
    if (card.cc_usage_type !== 'paying_down' || !card.cc_starting_debt_amount) {
      return null;
    }
    const startingDebt = card.cc_starting_debt_amount;
    const currentDebt = totalDebt;
    const paidOff = startingDebt - currentDebt;
    const progressPercent = Math.min(100, Math.max(0, (paidOff / startingDebt) * 100));
    return {
      startingDebt,
      currentDebt,
      paidOff,
      progressPercent,
    };
  }, [card.cc_usage_type, card.cc_starting_debt_amount, totalDebt]);

  // Days until payment due
  const daysUntilDue = useMemo(() => {
    if (!card.payment_due_day) return null;
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), card.payment_due_day);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, card.payment_due_day);
    const dueDate = thisMonth > today ? thisMonth : nextMonth;
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [card.payment_due_day]);

  // Determine card style based on usage type
  const cardStyle = useMemo(() => {
    switch (card.cc_usage_type) {
      case 'pay_in_full':
        return {
          borderColor: 'border-sage/30',
          bgColor: 'bg-sage-light/20',
          iconColor: 'text-sage',
          statusText: 'Pay in Full',
          statusColor: 'text-sage',
        };
      case 'paying_down':
        return {
          borderColor: 'border-blue/30',
          bgColor: 'bg-blue-light/20',
          iconColor: 'text-blue',
          statusText: 'Paying Down',
          statusColor: 'text-blue',
        };
      case 'minimum_only':
        return {
          borderColor: 'border-silver/30',
          bgColor: 'bg-silver-light/20',
          iconColor: 'text-text-medium',
          statusText: 'Minimum Only',
          statusColor: 'text-text-medium',
        };
      default:
        return {
          borderColor: 'border-border',
          bgColor: 'bg-background',
          iconColor: 'text-text-medium',
          statusText: 'Credit Card',
          statusColor: 'text-text-medium',
        };
    }
  }, [card.cc_usage_type]);

  return (
    <Card className={`${cardStyle.borderColor} ${cardStyle.bgColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className={`w-5 h-5 ${cardStyle.iconColor}`} />
            <CardTitle className="text-base font-semibold text-text-dark">
              {card.name}
            </CardTitle>
          </div>
          <span className={`text-xs font-medium ${cardStyle.statusColor}`}>
            {cardStyle.statusText}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Balance Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-light">Current Balance</p>
            <p className="text-2xl font-bold text-text-dark">
              {formatCurrency(totalDebt)}
            </p>
          </div>
          {daysUntilDue !== null && (
            <div className="text-right">
              <p className="text-xs text-text-light">Due in</p>
              <p className={`text-lg font-semibold ${
                daysUntilDue <= 3 ? 'text-red-500' : daysUntilDue <= 7 ? 'text-amber-500' : 'text-text-dark'
              }`}>
                {daysUntilDue} days
              </p>
            </div>
          )}
        </div>

        {/* Statement Breakdown (for pay_in_full and hybrid modes) */}
        {(card.cc_usage_type === 'pay_in_full' || card.cc_still_using) && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-border/50">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-light mb-1">
                <Calendar className="w-3 h-3" />
                <span>This Statement</span>
              </div>
              <p className="text-sm font-medium text-text-dark">
                {formatCurrency(thisStatementSpending)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-light mb-1">
                <Wallet className="w-3 h-3" />
                <span>Holding</span>
              </div>
              <p className="text-sm font-medium text-sage">
                {formatCurrency(holdingBalance)}
              </p>
            </div>
          </div>
        )}

        {/* Debt Progress (for paying_down types) */}
        {debtProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-light">Debt Payoff Progress</span>
              <span className="font-medium text-blue">
                {debtProgress.progressPercent.toFixed(1)}%
              </span>
            </div>
            <Progress value={debtProgress.progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-text-medium">
              <span>Paid: {formatCurrency(debtProgress.paidOff)}</span>
              <span>Remaining: {formatCurrency(debtProgress.currentDebt)}</span>
            </div>
          </div>
        )}

        {/* Legacy Debt Indicator (for hybrid mode) */}
        {card.cc_still_using && card.cc_usage_type === 'paying_down' && legacyDebt > 0 && (
          <div className="p-2 bg-blue-light/30 rounded-lg border border-blue/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-blue" />
              <div className="text-xs">
                <span className="text-text-medium">Legacy debt: </span>
                <span className="font-medium text-blue">{formatCurrency(legacyDebt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payoff Projection (if available) */}
        {card.payoff_projection && (
          <div className="p-2 bg-sage-light/30 rounded-lg border border-sage/20 text-xs">
            <p className="text-text-medium">
              Debt-free by{' '}
              <span className="font-medium text-text-dark">
                {new Date(card.payoff_projection.payoff_date).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onRecordPayment && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onRecordPayment}
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Record Payment
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onViewDetails}
            >
              Details
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
