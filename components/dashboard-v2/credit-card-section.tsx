"use client";

/**
 * Credit Card Section
 *
 * Wrapper for the existing credit card components.
 * Shows credit card summary with total debt, holding coverage,
 * and individual card status.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  ChevronRight,
  TrendingDown,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import type { CreditCardUsageType } from "@/lib/types/credit-card-onboarding";

interface CreditCardData {
  id: string;
  name: string;
  current_balance: number;
  cc_usage_type: CreditCardUsageType;
  cc_still_using: boolean;
  cc_starting_debt_amount: number;
  payment_due_day: number | null;
  holding_envelope?: {
    id: string;
    name: string;
    current_amount: number;
  } | null;
}

interface CreditCardSectionProps {
  cards?: CreditCardData[];
  totalDebt?: number;
  totalHolding?: number;
}

export function CreditCardSection({
  cards: initialCards,
  totalDebt: initialTotalDebt,
  totalHolding: initialTotalHolding,
}: CreditCardSectionProps) {
  const [cards, setCards] = useState<CreditCardData[]>(initialCards || []);
  const [isLoading, setIsLoading] = useState(!initialCards);
  const [error, setError] = useState<string | null>(null);

  // Fetch cards if not provided via props
  useEffect(() => {
    if (initialCards) return;

    async function fetchCards() {
      try {
        const response = await fetch("/api/credit-cards");
        if (!response.ok) throw new Error("Failed to fetch credit cards");
        const data = await response.json();
        setCards(data.creditCards || []);
      } catch (err) {
        console.error("Error fetching credit cards:", err);
        setError("Failed to load credit cards");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCards();
  }, [initialCards]);

  // Calculate totals
  const totalDebt = initialTotalDebt ?? cards.reduce(
    (sum, card) => sum + Math.abs(card.current_balance),
    0
  );

  const totalHolding = initialTotalHolding ?? cards.reduce(
    (sum, card) => sum + (card.holding_envelope?.current_amount || 0),
    0
  );

  const coveragePercent = totalDebt > 0
    ? Math.min(100, (totalHolding / totalDebt) * 100)
    : 100;

  // Calculate days until nearest payment due
  const nearestDueDay = cards.reduce((nearest, card) => {
    if (!card.payment_due_day) return nearest;
    const today = new Date().getDate();
    const dueDay = card.payment_due_day;
    const daysUntil = dueDay >= today ? dueDay - today : 30 - today + dueDay;
    return nearest === null || daysUntil < nearest ? daysUntil : nearest;
  }, null as number | null);

  // If no credit cards, don't show the section
  if (!isLoading && cards.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-text-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue" />
            <span>Credit Cards</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/accounts">
              Manage <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-light" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-blue py-4">
            <AlertCircle className="h-5 w-5" />
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
                  {formatCurrency(totalDebt)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-text-light mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Holding Balance</span>
                </div>
                <p className="text-xl font-bold text-sage">
                  {formatCurrency(totalHolding)}
                </p>
              </div>
            </div>

            {/* Coverage Progress */}
            {totalDebt > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-medium">Coverage</span>
                  <span className={cn(
                    "font-medium",
                    coveragePercent >= 100 ? "text-sage" :
                    coveragePercent >= 50 ? "text-sage-dark" : "text-blue"
                  )}>
                    {coveragePercent.toFixed(0)}%
                  </span>
                </div>
                <Progress value={coveragePercent} className="h-2" />
                {nearestDueDay !== null && (
                  <p className="text-xs text-text-light">
                    Next payment due in {nearestDueDay} day{nearestDueDay !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {/* Individual Cards (compact view) */}
            <div className="space-y-2">
              {cards.slice(0, 3).map((card) => {
                const cardDebt = Math.abs(card.current_balance);
                const cardHolding = card.holding_envelope?.current_amount || 0;
                const cardCoverage = cardDebt > 0
                  ? Math.min(100, (cardHolding / cardDebt) * 100)
                  : 100;

                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        card.cc_usage_type === "pay_in_full" ? "bg-sage-light/30" :
                        card.cc_usage_type === "paying_down" ? "bg-blue-light/30" :
                        "bg-silver-light/50"
                      )}>
                        <CreditCard className={cn(
                          "h-4 w-4",
                          card.cc_usage_type === "pay_in_full" ? "text-sage" :
                          card.cc_usage_type === "paying_down" ? "text-blue" :
                          "text-text-medium"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-dark">{card.name}</p>
                        <p className="text-xs text-text-light">
                          {card.cc_usage_type === "pay_in_full" ? "Pay in Full" :
                           card.cc_usage_type === "paying_down" ? "Paying Down" :
                           "Minimum Only"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-dark">
                        {formatCurrency(cardDebt)}
                      </p>
                      <p className={cn(
                        "text-xs",
                        cardCoverage >= 100 ? "text-sage" :
                        cardCoverage >= 50 ? "text-sage-dark" : "text-blue"
                      )}>
                        {cardCoverage.toFixed(0)}% covered
                      </p>
                    </div>
                  </div>
                );
              })}

              {cards.length > 3 && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/accounts">
                    View {cards.length - 3} more cards
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
