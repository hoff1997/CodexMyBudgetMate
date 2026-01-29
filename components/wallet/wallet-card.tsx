"use client";

import { useState } from "react";
import { Wallet, Plus, Minus, History, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WalletTransactionDialog } from "./wallet-transaction-dialog";
import { formatWalletTransaction } from "@/lib/types/wallet";
import type { WalletSummary, WalletTransaction } from "@/lib/types/wallet";

interface WalletCardProps {
  walletSummary: WalletSummary | null;
  isLoading?: boolean;
  onTransactionComplete?: () => void;
}

export function WalletCard({
  walletSummary,
  isLoading = false,
  onTransactionComplete,
}: WalletCardProps) {
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

  // No wallet state
  if (!isLoading && (!walletSummary || !walletSummary.hasWallet)) {
    return (
      <Card className="border-dashed border-silver-light">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-light mb-3">
            Track your cash on hand for ATM withdrawals, gifts, and spending.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              // This would trigger creating the wallet
              // For now, they can add it via suggested envelopes
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Set Up Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-sage" />
        </CardContent>
      </Card>
    );
  }

  const balance = walletSummary?.balance || 0;
  const recentTransactions = walletSummary?.recentTransactions || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-medium flex items-center gap-2">
            <span className="text-lg">💵</span>
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance */}
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-text-dark">
              ${balance.toFixed(2)}
            </p>
            <p className="text-xs text-text-light">Cash on Hand</p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-sage border-sage hover:bg-sage-very-light"
              onClick={handleAddCash}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-text-medium border-silver-light hover:bg-silver-very-light"
              onClick={handleSpendCash}
            >
              <Minus className="h-4 w-4 mr-1" />
              Spend
            </Button>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="border-t border-silver-light pt-3">
              <div className="flex items-center gap-1 text-xs text-text-light mb-2">
                <History className="h-3 w-3" />
                Recent
              </div>
              <ul className="space-y-1">
                {recentTransactions.slice(0, 3).map((tx: WalletTransaction) => {
                  const { amountDisplay, isDeposit, sourceLabel } = formatWalletTransaction(tx);
                  return (
                    <li
                      key={tx.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-text-medium truncate">
                        {tx.description || sourceLabel}
                      </span>
                      <span
                        className={`font-medium ${
                          isDeposit ? "text-sage" : "text-text-dark"
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
      <WalletTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactionType={transactionType}
        walletAccountId={walletSummary?.account?.id}
        onComplete={handleTransactionComplete}
      />
    </>
  );
}
