"use client";

/**
 * Multi-Account Reconciliation Widget
 *
 * Dashboard widget showing reconciliation status across all accounts.
 * Shows breakdown of bank accounts, envelope totals, and any discrepancy.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  Inbox,
  CreditCard,
  ArrowRightLeft,
} from "lucide-react";
import type { MultiAccountReconciliation } from "@/lib/types/transfer";

interface ReconciliationWidgetProps {
  /** Initial reconciliation data (optional, will fetch if not provided) */
  initialData?: MultiAccountReconciliation;
  /** Callback when transfers need attention */
  onViewTransfers?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function ReconciliationWidget({
  initialData,
  onViewTransfers,
  compact = false,
}: ReconciliationWidgetProps) {
  const [data, setData] = useState<MultiAccountReconciliation | null>(initialData || null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [error, setError] = useState<string | null>(null);

  const fetchReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reconciliation");
      if (!response.ok) {
        throw new Error("Failed to fetch reconciliation");
      }
      const result = await response.json();
      setData(result.reconciliation);
      setPendingCount(result.transfers?.pendingCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchReconciliation();
    }
  }, [initialData]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 2,
    }).format(amount);

  // Status indicators
  const getStatusIcon = () => {
    if (!data) return null;
    if (data.isBalanced) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (Math.abs(data.discrepancy) < 10) {
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (!data) return "bg-gray-100";
    if (data.isBalanced) return "bg-green-50 border-green-200";
    if (Math.abs(data.discrepancy) < 10) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading reconciliation...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
            <Button variant="ghost" size="sm" onClick={fetchReconciliation}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className={`${getStatusColor()} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Reconciliation
            {getStatusIcon()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReconciliation}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Summary row - always visible */}
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Bank Accounts</span>
          <span className="font-medium">{formatCurrency(data.totalBankBalance)}</span>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <>
            {/* Individual accounts */}
            {data.accounts.length > 1 && (
              <div className="pl-4 py-2 space-y-1 border-b">
                {data.accounts.map((account) => (
                  <div
                    key={account.accountId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{account.displayName}</span>
                    <span>{formatCurrency(account.currentBalance)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Envelopes */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Inbox className="h-3 w-3" />
                Envelopes
              </span>
              <span className="font-medium">{formatCurrency(data.totalEnvelopeBalance)}</span>
            </div>

            {/* CC Holding */}
            {data.ccHoldingBalance > 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  CC Holding
                </span>
                <span className="text-red-600">
                  ({formatCurrency(data.ccHoldingBalance)})
                </span>
              </div>
            )}

            {/* Surplus */}
            {Math.abs(data.surplus) > 0.01 && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  {data.surplus >= 0 ? "Surplus" : "Deficit"}
                </span>
                <span className={data.surplus >= 0 ? "text-green-600" : "text-red-600"}>
                  {data.surplus >= 0 ? "+" : ""}
                  {formatCurrency(data.surplus)}
                </span>
              </div>
            )}
          </>
        )}

        {/* Result row */}
        <div
          className={`flex items-center justify-between py-2 mt-2 rounded-lg px-3 ${
            data.isBalanced
              ? "bg-green-100"
              : Math.abs(data.discrepancy) < 10
              ? "bg-amber-100"
              : "bg-red-100"
          }`}
        >
          <span className="text-sm font-medium">
            {data.isBalanced ? "Balanced" : "Discrepancy"}
          </span>
          <span
            className={`font-bold ${
              data.isBalanced
                ? "text-green-700"
                : Math.abs(data.discrepancy) < 10
                ? "text-amber-700"
                : "text-red-700"
            }`}
          >
            {data.isBalanced ? "✓" : formatCurrency(data.discrepancy)}
          </span>
        </div>

        {/* Explanation */}
        <p className="text-xs text-muted-foreground mt-2">{data.explanation}</p>

        {/* Pending transfers notice */}
        {pendingCount > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-700 flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" />
                {pendingCount} pending transfer{pendingCount !== 1 ? "s" : ""}
              </span>
              {onViewTransfers && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewTransfers}
                  className="h-6 text-xs text-amber-700 hover:text-amber-800"
                >
                  Review
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
