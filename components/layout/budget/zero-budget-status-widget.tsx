"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
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
    <Card className={`${status.bgColor} ${status.borderColor} border ${className}`}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-base md:text-sm font-medium flex items-center gap-2 ${status.color}`}>
            <status.icon className="h-5 w-5 md:h-4 md:w-4" />
            Budget Status
          </CardTitle>
          <Badge className={`${status.badgeColor} text-sm md:text-xs px-2 py-1`}>
            {status.badge}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-2 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-base md:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Income</span>
            <span className="font-medium text-green-600">${totalIncome.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Expenses</span>
            <span className="font-medium text-red-600">${totalExpenses.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Difference</span>
            <span
              className={`font-medium ${surplus >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {surplus >= 0 ? "+" : ""}${surplus.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <Progress
            value={budgetProgress}
            className={`h-4 ${
              isOverspent
                ? "[&>div]:bg-red-500"
                : isZeroBudget
                  ? "[&>div]:bg-green-500"
                  : "[&>div]:bg-yellow-500"
            }`}
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>{budgetProgress.toFixed(1)}% utilised</span>
            <span>{status.badge}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
