"use client";

import { AlertCircle, Info, TrendingDown, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DebtEducationBannerProps {
  hasDebt: boolean;
  totalDebt: number;
  paymentStrategy?: string;
  dismissible?: boolean;
  variant?: "warning" | "info" | "tip";
}

export function DebtEducationBanner({
  hasDebt,
  totalDebt,
  paymentStrategy,
  dismissible = true,
  variant = "warning",
}: DebtEducationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !hasDebt) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          className: "border-amber-200 bg-amber-50 dark:bg-amber-900/20",
          icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
          titleClass: "text-amber-800 dark:text-amber-200",
          descClass: "text-amber-700 dark:text-amber-300",
        };
      case "info":
        return {
          className: "border-blue-200 bg-blue-50 dark:bg-blue-900/20",
          icon: <Info className="h-5 w-5 text-blue-600" />,
          titleClass: "text-blue-800 dark:text-blue-200",
          descClass: "text-blue-700 dark:text-blue-300",
        };
      case "tip":
        return {
          className: "border-green-200 bg-green-50 dark:bg-green-900/20",
          icon: <TrendingDown className="h-5 w-5 text-green-600" />,
          titleClass: "text-green-800 dark:text-green-200",
          descClass: "text-green-700 dark:text-green-300",
        };
    }
  };

  const styles = getVariantStyles();

  const getMessage = () => {
    if (paymentStrategy === "pay_off") {
      return {
        title: "Great financial habit!",
        description:
          "Paying off your credit card in full each month avoids interest charges. Keep using your card only for budgeted expenses.",
        variant: "tip" as const,
      };
    }

    if (totalDebt > 0) {
      return {
        title: "Managing credit card debt",
        description:
          "While paying down debt, consider switching to debit or cash for daily expenses. Use credit cards only for budgeted items, not as loans from the bank. This helps prevent the balance from growing while you pay it down.",
        variant: "warning" as const,
      };
    }

    return {
      title: "Credit card tips",
      description:
        "Use credit cards wisely by only charging what you've budgeted and can pay off in full. This builds credit while avoiding interest charges.",
      variant: "info" as const,
    };
  };

  const message = getMessage();
  const finalStyles = getVariantStyles();

  return (
    <Alert className={`relative ${finalStyles.className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{finalStyles.icon}</div>
        <div className="flex-1">
          <AlertTitle className={finalStyles.titleClass}>{message.title}</AlertTitle>
          <AlertDescription className={`${finalStyles.descClass} mt-2`}>
            {message.description}
          </AlertDescription>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-6 w-6 -mt-1 -mr-2 hover:bg-transparent"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </Alert>
  );
}

interface PaymentStrategyEducationProps {
  strategy: string;
  projectedMonths?: number | null;
  totalInterest?: number | null;
}

export function PaymentStrategyEducation({
  strategy,
  projectedMonths,
  totalInterest,
}: PaymentStrategyEducationProps) {
  const getStrategyInfo = () => {
    switch (strategy) {
      case "avalanche":
        return {
          title: "Avalanche Method",
          description:
            "You're using the avalanche method, which pays off the card with the highest interest rate first. This saves you the most money on interest in the long run.",
          tip: "Keep making minimum payments on all cards, then put any extra toward the highest APR card.",
        };
      case "snowball":
        return {
          title: "Snowball Method",
          description:
            "You're using the snowball method, which pays off the smallest balance first. This builds momentum with quick wins and keeps you motivated.",
          tip: "As you pay off each card, roll that payment into the next smallest balance for faster progress.",
        };
      case "minimum_only":
        return {
          title: "Minimum Payments",
          description:
            "You're currently making minimum payments only. This preserves cash flow but results in paying more interest over time.",
          tip: "When possible, try to pay more than the minimum to reduce your total interest paid and pay off debt faster.",
        };
      case "pay_off":
        return {
          title: "Full Payment Strategy",
          description:
            "You're paying your credit cards in full each month. This is the best way to use credit cards - you build credit without paying any interest.",
          tip: "Continue this habit and only charge what you've already budgeted for.",
        };
      default:
        return null;
    }
  };

  const info = getStrategyInfo();
  if (!info) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">{info.title}</h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">{info.description}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 italic">{info.tip}</p>

          {projectedMonths !== null && projectedMonths !== undefined && projectedMonths > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Projected payoff:</strong> {projectedMonths} months
                {totalInterest !== null && totalInterest !== undefined && (
                  <> (${totalInterest.toFixed(2)} in interest)</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
