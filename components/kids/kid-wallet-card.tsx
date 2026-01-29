"use client";

import { useState } from "react";
import { Plus, Minus, History, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KidWalletTransactionDialog } from "./kid-wallet-transaction-dialog";
import { formatWalletTransaction } from "@/lib/types/wallet";
import type { KidWalletSummary, KidWalletTransaction } from "@/lib/types/wallet";

interface KidWalletCardProps {
  childId: string;
  childName: string;
  walletSummary: KidWalletSummary | null;
  isLoading?: boolean;
  onTransactionComplete?: () => void;
}

export function KidWalletCard({
  childId,
  childName,
  walletSummary,
  isLoading = false,
  onTransactionComplete,
}: KidWalletCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");

  const handleAddCash = () => {
    setTransactionType("deposit");
    setDialogOpen(true);
  };

  const handleSpendCash = () => {
    setTransactionType("withdrawal");
    setDialogOpen(true);
  };

  const handleTransactionComplete = () => {
    setDialogOpen(false);
    onTransactionComplete?.();
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
            <span className="text-lg">💵</span>
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-green-600" />
        </CardContent>
      </Card>
    );
  }

  const balance = walletSummary?.balance || 0;
  const recentTransactions = walletSummary?.recentTransactions || [];

  return (
    <>
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
            <span className="text-lg">💵</span>
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance */}
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-green-900">
              ${balance.toFixed(2)}
            </p>
            <p className="text-xs text-green-700">Cash on Hand</p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-green-700 border-green-300 hover:bg-green-100"
              onClick={handleAddCash}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-green-700 border-green-300 hover:bg-green-100"
              onClick={handleSpendCash}
            >
              <Minus className="h-4 w-4 mr-1" />
              Spend
            </Button>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="border-t border-green-200 pt-3">
              <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                <History className="h-3 w-3" />
                Recent
              </div>
              <ul className="space-y-1">
                {recentTransactions.slice(0, 3).map((tx: KidWalletTransaction) => {
                  const { amountDisplay, isDeposit, sourceLabel } = formatWalletTransaction(tx);
                  return (
                    <li
                      key={tx.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-green-800 truncate">
                        {tx.description || sourceLabel}
                      </span>
                      <span
                        className={`font-medium ${
                          isDeposit ? "text-green-600" : "text-green-900"
                        }`}
                      >
                        {amountDisplay}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <KidWalletTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        childId={childId}
        childName={childName}
        transactionType={transactionType}
        onComplete={handleTransactionComplete}
      />
    </>
  );
}
