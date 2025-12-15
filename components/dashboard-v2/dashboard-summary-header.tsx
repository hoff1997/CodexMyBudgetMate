"use client";

/**
 * Dashboard Summary Header
 *
 * Hero section at the top of the dashboard showing:
 * - Greeting with user name
 * - Available balance (total spendable)
 * - Income this month
 * - Days until next payday
 */

import { useMemo } from "react";
import { Calendar, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/cn";

interface DashboardSummaryHeaderProps {
  userName?: string;
  availableBalance: number;
  incomeThisMonth: number;
  nextPayday?: Date | null;
  budgetHealthStatus: "healthy" | "attention" | "critical";
}

export function DashboardSummaryHeader({
  userName,
  availableBalance,
  incomeThisMonth,
  nextPayday,
  budgetHealthStatus,
}: DashboardSummaryHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const daysUntilPayday = useMemo(() => {
    if (!nextPayday) return null;
    const days = differenceInDays(nextPayday, new Date());
    return days >= 0 ? days : null;
  }, [nextPayday]);

  const statusStyles = {
    healthy: "bg-sage-light/30 border-sage/40 text-sage",
    attention: "bg-blue-light/30 border-blue/40 text-blue",
    critical: "bg-blue-light/30 border-blue/40 text-blue",
  };

  const statusMessages = {
    healthy: "Budget on track",
    attention: "Needs attention",
    critical: "Review recommended",
  };

  return (
    <header className="rounded-xl bg-gradient-to-br from-silver-light/50 to-white border border-silver/30 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Greeting and main balance */}
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold text-text-dark">
            {greeting}{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-sm text-text-medium">
            Here&apos;s your financial snapshot
          </p>

          {/* Status Badge */}
          <div className="pt-2">
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
              statusStyles[budgetHealthStatus]
            )}>
              {statusMessages[budgetHealthStatus]}
            </span>
          </div>
        </div>

        {/* Right: Key metrics */}
        <div className="flex flex-wrap gap-4 md:gap-6">
          {/* Available Balance */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sage-light/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-sage" />
            </div>
            <div>
              <p className="text-xs text-text-medium uppercase tracking-wide">Available</p>
              <p className="text-lg font-bold text-text-dark">
                {formatCurrency(availableBalance)}
              </p>
            </div>
          </div>

          {/* Income This Month */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-light/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue" />
            </div>
            <div>
              <p className="text-xs text-text-medium uppercase tracking-wide">Income</p>
              <p className="text-lg font-bold text-text-dark">
                {formatCurrency(incomeThisMonth)}
              </p>
            </div>
          </div>

          {/* Days Until Payday */}
          {daysUntilPayday !== null && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-light/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-text-medium uppercase tracking-wide">Next Pay</p>
                <p className="text-lg font-bold text-text-dark">
                  {daysUntilPayday === 0 ? (
                    "Today!"
                  ) : daysUntilPayday === 1 ? (
                    "Tomorrow"
                  ) : (
                    `${daysUntilPayday} days`
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
