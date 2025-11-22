"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CreditCardHoldingStatus {
  hasHoldingAccount: boolean;
  holdingAccount: {
    id: string;
    name: string;
    balance: number;
  } | null;
  creditCardAccounts: Array<{
    id: string;
    name: string;
    balance: number;
    debt: number;
  }>;
  totalCreditCardDebt: number;
  holdingBalance: number;
  isFullyCovered: boolean;
  shortfall: number;
  coveragePercentage: number;
  allocations: any[];
}

export function CreditCardHoldingWidget() {
  const { data, isLoading, error } = useQuery<CreditCardHoldingStatus>({
    queryKey: ["/api/credit-card-holding"],
    queryFn: async () => {
      const response = await fetch("/api/credit-card-holding", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch credit card status");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleCreateHoldingAccount = async () => {
    try {
      const response = await fetch("/api/credit-card-holding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createNew: true }),
      });

      if (!response.ok) throw new Error("Failed to create holding account");

      toast.success("Credit card holding account created");
      // Refetch data
      window.location.reload();
    } catch (error) {
      console.error("Create holding account error:", error);
      toast.error("Failed to create holding account");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Card Holding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Card Holding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load credit card status
          </p>
        </CardContent>
      </Card>
    );
  }

  // No holding account setup
  if (!data?.hasHoldingAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Card Holding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Set up a holding account to track money set aside for credit card
            payments
          </p>
          <Button
            onClick={handleCreateHoldingAccount}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Holding Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  const {
    holdingAccount,
    creditCardAccounts,
    totalCreditCardDebt,
    holdingBalance,
    isFullyCovered,
    shortfall,
    coveragePercentage,
  } = data;

  return (
    <Card className={isFullyCovered ? "border-green-200" : "border-orange-200"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Card Holding
          </CardTitle>
          {isFullyCovered ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Covered
            </Badge>
          ) : (
            <Badge variant="default" className="bg-orange-100 text-orange-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Shortfall
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actual Balance */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Account Balance</span>
            <span className="font-semibold text-blue-600">
              ${holdingBalance.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Available in {holdingAccount?.name}
          </p>
        </div>

        {/* Credit Card Debt */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              Total CC Debt ({creditCardAccounts.length})
            </span>
            <span className="font-semibold text-red-600">
              ${totalCreditCardDebt.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Next payment due amount
          </p>
        </div>

        {/* Coverage Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Coverage</span>
            <span className="font-medium">{coveragePercentage.toFixed(0)}%</span>
          </div>
          <Progress
            value={Math.min(coveragePercentage, 100)}
            className={`h-2 ${
              isFullyCovered ? "[&>*]:bg-green-500" : "[&>*]:bg-orange-500"
            }`}
          />
        </div>

        {/* Shortfall Alert */}
        {!isFullyCovered && shortfall > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <p className="text-xs text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Shortfall: <span className="font-semibold">${shortfall.toFixed(2)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add more funds to the holding account to cover all credit card debt
            </p>
          </div>
        )}

        {/* Success Message */}
        {isFullyCovered && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p className="text-xs text-green-800 dark:text-green-200">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              All credit card debt is fully covered!
            </p>
          </div>
        )}

        {/* Individual Credit Cards */}
        {creditCardAccounts.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium mb-2">Credit Cards:</p>
            <div className="space-y-1">
              {creditCardAccounts.map((cc) => (
                <div
                  key={cc.id}
                  className="flex justify-between text-xs text-muted-foreground"
                >
                  <span className="truncate mr-2">{cc.name}</span>
                  <span className="font-medium">${cc.debt.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to detailed view */}
        <div className="border-t pt-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/accounts">Manage Accounts</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
