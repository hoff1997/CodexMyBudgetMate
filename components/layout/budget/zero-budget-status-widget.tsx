"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EnvelopeRow } from "@/lib/auth/types";

interface User {
  id: string;
  pay_cycle?: string;
  [key: string]: any;
}

interface EnvelopeCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface ZeroBudgetStatusWidgetProps {
  className?: string;
}

export function ZeroBudgetStatusWidget({ className }: ZeroBudgetStatusWidgetProps) {
  const { data: user } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  const { data: envelopesData } = useQuery<{ envelopes: EnvelopeRow[] }>({
    queryKey: ["envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const { data: categoriesData } = useQuery<{ categories: EnvelopeCategory[] }>({
    queryKey: ["envelope-categories"],
    queryFn: async () => {
      const response = await fetch("/api/envelope-categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const envelopes = envelopesData?.envelopes ?? [];
  const categories = categoriesData?.categories ?? [];

  // Calculate budget status
  const incomeEnvelopes = envelopes.filter((env) =>
    categories.find((cat) => cat.id === env.category_id)?.name === "Income"
  );

  const expenseEnvelopes = envelopes.filter(
    (env) => categories.find((cat) => cat.id === env.category_id)?.name !== "Income"
  );

  const totalIncome = incomeEnvelopes.reduce(
    (sum, env) => sum + Number(env.target_amount ?? 0),
    0
  );

  const totalExpenses = expenseEnvelopes.reduce(
    (sum, env) => sum + Number(env.target_amount ?? 0),
    0
  );

  const surplus = totalIncome - totalExpenses;
  const isZeroBudget = Math.abs(surplus) < 0.01;
  const isOverspent = surplus < -0.01;

  const payCycle = user?.pay_cycle || "fortnightly";

  const getPayCycleDescription = () => {
    switch (payCycle) {
      case "weekly":
        return "per week";
      case "fortnightly":
        return "per fortnight";
      case "monthly":
        return "per month";
      case "quarterly":
        return "per quarter";
      case "annual":
        return "per year";
      default:
        return "per fortnight";
    }
  };

  const getStatusDisplay = () => {
    if (isZeroBudget) {
      return {
        icon: CheckCircle,
        title: "Zero Budget Achieved!",
        message: "Perfect balance between income and expenses",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        badge: "On Track",
        badgeColor: "bg-green-100 text-green-800",
      };
    }
    if (isOverspent) {
      return {
        icon: AlertTriangle,
        title: "Budget Overspent",
        message: `Need to reduce expenses by $${Math.abs(surplus).toFixed(2)} ${getPayCycleDescription()}`,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        badge: "Overspent",
        badgeColor: "bg-red-100 text-red-800",
      };
    }
    return {
      icon: TrendingUp,
      title: "Surplus Available",
      message: `$${surplus.toFixed(2)} ${getPayCycleDescription()} to allocate`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      badge: "Surplus",
      badgeColor: "bg-blue-100 text-blue-800",
    };
  };

  const status = getStatusDisplay();
  const budgetProgress =
    totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0;

  return (
    <div className={`rounded-xl border border-sage-light overflow-hidden shadow-sm ${className}`}>
      {/* Header - matching My Budget Way style */}
      <div className="bg-sage-very-light border-b border-sage-light px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <status.icon className="h-5 w-5 md:h-4 md:w-4 text-sage-dark" />
            <h3 className="text-base md:text-sm font-bold text-text-dark uppercase tracking-wide">
              Budget Status
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded-full text-sage hover:text-sage-dark hover:bg-sage-light/50 transition-colors"
                    aria-label="About Budget Status"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs bg-sage-very-light border-sage-light text-sage-dark"
                >
                  <p className="text-sm">
                    Your budget status shows whether your income covers all your planned expenses.
                    A zero budget means every dollar is allocated - the goal of envelope budgeting.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge className={`${status.badgeColor} text-sm md:text-xs px-2 py-1`}>
            {status.badge}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-base md:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Income</span>
            <span className="font-medium text-sage">${totalIncome.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Expenses</span>
            <span className="font-medium text-blue">${totalExpenses.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Difference</span>
            <span
              className={`font-medium ${surplus >= 0 ? "text-sage" : "text-blue"}`}
            >
              {surplus >= 0 ? "+" : ""}${surplus.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 bg-sage-very-light rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${budgetProgress}%`,
                backgroundColor: isOverspent ? '#6B9ECE' : isZeroBudget ? '#7A9E9A' : '#D4A853'
              }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>{budgetProgress.toFixed(1)}% utilised</span>
            <span>{status.badge}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
