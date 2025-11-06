"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  Scale,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Target,
  DollarSign,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import OverspentAnalysisDialog from "@/components/envelopes/overspent-analysis-dialog";

interface StatsCardsProps {
  showReconciliation?: boolean;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Envelope {
  id: string;
  name: string;
  current_amount: number;
  budgeted_amount: number;
}

export default function StatsCards({
  showReconciliation = false,
}: StatsCardsProps) {
  const [showOverspentAnalysis, setShowOverspentAnalysis] = useState(false);

  const navigateToReconciliation = () => {
    window.location.href = "/reconcile";
  };

  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  const { data: envelopesData } = useQuery<{ envelopes: Envelope[] }>({
    queryKey: ["/api/envelopes"],
    queryFn: async () => {
      const response = await fetch("/api/envelopes");
      if (!response.ok) throw new Error("Failed to fetch envelopes");
      return response.json();
    },
  });

  const accounts = accountsData?.accounts ?? [];
  const envelopes = envelopesData?.envelopes ?? [];

  // Calculate reconciliation data
  const getReconciliationData = () => {
    if (!accounts.length || !envelopes.length) return null;

    const totalBankBalance = accounts
      .filter((acc) => acc.type !== "credit")
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalEnvelopeBalance = envelopes.reduce(
      (sum, env) => sum + env.current_amount,
      0,
    );
    const difference = totalBankBalance - totalEnvelopeBalance;
    const isReconciled = Math.abs(difference) < 0.01;

    return { totalBankBalance, totalEnvelopeBalance, difference, isReconciled };
  };

  // Calculate envelope status
  const getEnvelopeStats = () => {
    if (!envelopes.length)
      return { onTrack: 0, overspent: 0, totalOverspent: 0 };

    let onTrack = 0;
    let overspent = 0;
    let totalOverspent = 0;

    envelopes.forEach((envelope) => {
      const balance = envelope.current_amount;
      if (balance < 0) {
        overspent++;
        totalOverspent += Math.abs(balance);
      } else {
        onTrack++;
      }
    });

    return { onTrack, overspent, totalOverspent };
  };

  // Get credit card holding account data
  const getCreditCardHoldingData = () => {
    const ccHoldingAccount = accounts.find(
      (account) => account.name === "Credit Card Holding",
    );
    const creditCardAccount = accounts.find(
      (account) => account.type === "credit",
    );

    return {
      holdingBalance: ccHoldingAccount ? ccHoldingAccount.balance : 0,
      creditCardDebt: creditCardAccount
        ? Math.abs(creditCardAccount.balance)
        : 0,
      isFullyCovered: function () {
        return this.holdingBalance >= this.creditCardDebt;
      },
    };
  };

  const reconciliation = getReconciliationData();
  const envelopeStats = getEnvelopeStats();
  const ccHoldingData = getCreditCardHoldingData();

  if (!accounts.length || !envelopes.length) {
    return (
      <div className="space-y-4">
        {/* First Row - Envelope Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`envelope-${i}`}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-2 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Second Row - Balance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`balance-${i}`}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-2 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* First Row - Envelope Management Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Envelopes */}
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Total Envelopes</span>
                  <span className="sm:hidden">Envelopes</span>
                </p>
                <div className="w-7 h-7 md:w-6 md:h-6 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 md:h-3 md:w-3 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-xl md:text-lg font-semibold text-foreground">
                  {envelopes.length}
                </p>
              </div>
              <div>
                <p className="text-sm md:text-xs text-muted-foreground">
                  Active budget categories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* On Track Envelopes */}
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-xs text-muted-foreground">
                  On Track
                </p>
                <div className="w-7 h-7 md:w-6 md:h-6 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 md:h-3 md:w-3 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xl md:text-lg font-semibold text-green-600">
                  {envelopeStats.onTrack}
                </p>
              </div>
              <div>
                <p className="text-sm md:text-xs text-muted-foreground">
                  $
                  {envelopes
                    .filter((env) => env.current_amount >= 0)
                    .reduce((sum, env) => sum + env.current_amount, 0)
                    .toFixed(2)}{" "}
                  available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overspent Envelopes */}
        <Card
          className={`${envelopeStats.overspent > 0 ? "cursor-pointer hover:shadow-md transition-all duration-200" : ""}`}
          onClick={() =>
            envelopeStats.overspent > 0 && setShowOverspentAnalysis(true)
          }
        >
          <CardContent className="pt-2 pb-2 px-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Overspent</p>
                <div className="w-6 h-6 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600">
                  {envelopeStats.overspent}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  ${envelopeStats.totalOverspent.toFixed(2)} needed
                  {envelopeStats.overspent > 0 && (
                    <span className="text-blue-600 ml-1">
                      → Click for details
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Balance Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Envelope Balance */}
        <Card>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="space-y-1">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">
                  <div className="hidden sm:block">Total Envelope</div>
                  <div className="hidden sm:block">Balance</div>
                  <div className="sm:hidden">Envelope Balance</div>
                </div>
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Wallet className="h-3 w-3 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  $
                  {envelopes
                    .reduce((sum, env) => sum + env.current_amount, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  All envelopes combined
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Card Holding */}
        <Card>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="space-y-1">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">
                  <div>Credit Card</div>
                  <div>Holding</div>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    ccHoldingData.isFullyCovered()
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-yellow-100 dark:bg-yellow-900/20"
                  }`}
                >
                  <CreditCard
                    className={`h-3 w-3 ${
                      ccHoldingData.isFullyCovered()
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  />
                </div>
              </div>
              <div>
                <p
                  className={`text-lg font-semibold ${ccHoldingData.isFullyCovered() ? "text-green-600" : "text-yellow-600"}`}
                >
                  ${ccHoldingData.holdingBalance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {ccHoldingData.creditCardDebt > 0 ? (
                    ccHoldingData.isFullyCovered() ? (
                      "Payment ready"
                    ) : (
                      `$${(ccHoldingData.creditCardDebt - ccHoldingData.holdingBalance).toFixed(2)} more needed`
                    )
                  ) : (
                    "No credit card debt"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Balance */}
        <Card>
          <CardContent className="pt-2 pb-2 px-3">
            <div className="space-y-1">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">
                  <div className="hidden sm:block">Total Bank</div>
                  <div className="hidden sm:block">Balance</div>
                  <div className="sm:hidden">Bank Balance</div>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    reconciliation && reconciliation.isReconciled
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-yellow-100 dark:bg-yellow-900/20"
                  }`}
                >
                  <DollarSign
                    className={`h-3 w-3 ${
                      reconciliation && reconciliation.isReconciled
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  $
                  {reconciliation
                    ? reconciliation.totalBankBalance.toFixed(2)
                    : "0.00"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {reconciliation ? (
                    reconciliation.isReconciled ? (
                      "Fully reconciled"
                    ) : (
                      `$${Math.abs(reconciliation.difference).toFixed(2)} difference vs envelopes`
                    )
                  ) : (
                    "Loading balance data..."
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Status - Optional alert when unbalanced */}
      {showReconciliation &&
        reconciliation &&
        !reconciliation.isReconciled && (
          <div className="w-full">
            <Card
              className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={navigateToReconciliation}
            >
              <CardContent className="py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Reconciliation Alert
                    </span>
                    <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                      ${Math.abs(reconciliation.difference).toFixed(2)}{" "}
                      {reconciliation.difference > 0 ? "Over" : "Under"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-yellow-700 dark:text-yellow-300">
                      Bank vs Envelope difference → Click to reconcile
                    </span>
                    <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                      <Scale className="h-3 w-3 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      <OverspentAnalysisDialog
        open={showOverspentAnalysis}
        onOpenChange={setShowOverspentAnalysis}
      />
    </div>
  );
}
