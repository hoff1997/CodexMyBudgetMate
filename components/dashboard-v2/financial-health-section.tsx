"use client";

/**
 * Financial Health Section
 *
 * 6-card grid showing key financial metrics:
 * 1. Bank Balance (total of checking + savings)
 * 2. Envelope Balance (sum of all envelope current_amounts)
 * 3. Credit Card Debt (from credit card accounts)
 * 4. Holding Balance (credit card holding envelope)
 * 5. Unallocated (bank balance - envelope balance)
 * 6. Funding Gap (total target - total current)
 */

import { useMemo } from "react";
import {
  Wallet,
  Inbox,
  CreditCard,
  Shield,
  HelpCircle,
  Target,
} from "lucide-react";
import { FinancialHealthCard, type HealthCardVariant } from "./financial-health-card";
import { formatCurrency } from "@/lib/finance";

export interface FinancialHealthData {
  bankBalance: number;
  envelopeBalance: number;
  creditCardDebt: number;
  holdingBalance: number;
  totalTarget: number;
  totalCurrent: number;
}

interface FinancialHealthSectionProps {
  data: FinancialHealthData;
  onCardClick?: (cardId: string) => void;
}

export function FinancialHealthSection({
  data,
  onCardClick,
}: FinancialHealthSectionProps) {
  const metrics = useMemo(() => {
    const unallocated = data.bankBalance - data.envelopeBalance;
    const fundingGap = Math.max(0, data.totalTarget - data.totalCurrent);
    const coverageRatio = data.creditCardDebt > 0
      ? (data.holdingBalance / data.creditCardDebt) * 100
      : 100;

    return {
      unallocated,
      fundingGap,
      coverageRatio,
    };
  }, [data]);

  // Determine variants based on values
  const getUnallocatedVariant = (): HealthCardVariant => {
    // Near zero = zero-based budget achieved (positive)
    if (Math.abs(metrics.unallocated) < 1) return "positive";
    // Negative = over-allocated / shortfall (blue)
    if (metrics.unallocated < 0) return "negative";
    // Positive = surplus available (neutral - not a problem)
    return "neutral";
  };

  const getFundingGapVariant = (): HealthCardVariant => {
    if (metrics.fundingGap === 0) return "positive"; // Fully funded
    // Any funding gap uses blue (negative) since it indicates shortfall
    return "negative";
  };

  const getHoldingVariant = (): HealthCardVariant => {
    if (data.creditCardDebt === 0) return "neutral"; // No debt
    if (metrics.coverageRatio >= 100) return "positive"; // Fully covered
    // Under-covered uses blue (negative)
    return "negative";
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-text-medium uppercase tracking-wide">
        Financial Health
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Bank Balance */}
        <FinancialHealthCard
          title="Bank Balance"
          value={formatCurrency(data.bankBalance)}
          subtitle="All accounts"
          icon={Wallet}
          variant="neutral"
          onClick={() => onCardClick?.("bank-balance")}
        />

        {/* Envelope Balance */}
        <FinancialHealthCard
          title="Envelope Balance"
          value={formatCurrency(data.envelopeBalance)}
          subtitle={`${data.totalCurrent > 0 ? "Allocated funds" : "No allocations yet"}`}
          icon={Inbox}
          variant={data.envelopeBalance > 0 ? "positive" : "neutral"}
          onClick={() => onCardClick?.("envelope-balance")}
        />

        {/* Credit Card Debt */}
        <FinancialHealthCard
          title="Credit Card Debt"
          value={formatCurrency(data.creditCardDebt)}
          subtitle={data.creditCardDebt === 0 ? "Debt free" : "Outstanding balance"}
          icon={CreditCard}
          variant={data.creditCardDebt === 0 ? "positive" : "negative"}
          onClick={() => onCardClick?.("credit-card-debt")}
        />

        {/* Holding Balance */}
        <FinancialHealthCard
          title="CC Holding"
          value={formatCurrency(data.holdingBalance)}
          subtitle={
            data.creditCardDebt > 0
              ? `${metrics.coverageRatio.toFixed(0)}% coverage`
              : "Ready for spending"
          }
          icon={Shield}
          variant={getHoldingVariant()}
          onClick={() => onCardClick?.("holding-balance")}
        />

        {/* Unallocated */}
        <FinancialHealthCard
          title="Unallocated"
          value={formatCurrency(Math.abs(metrics.unallocated))}
          subtitle={
            Math.abs(metrics.unallocated) < 1
              ? "Zero-based budget ✓"
              : metrics.unallocated < 0
              ? "Shortfall"
              : "Surplus available"
          }
          icon={HelpCircle}
          variant={getUnallocatedVariant()}
          onClick={() => onCardClick?.("unallocated")}
        />

        {/* Funding Gap */}
        <FinancialHealthCard
          title="Funding Gap"
          value={formatCurrency(metrics.fundingGap)}
          subtitle={
            metrics.fundingGap === 0
              ? "All targets met"
              : "To hit all targets"
          }
          icon={Target}
          variant={getFundingGapVariant()}
          onClick={() => onCardClick?.("funding-gap")}
        />
      </div>
    </section>
  );
}
