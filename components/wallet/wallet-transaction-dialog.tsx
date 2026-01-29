"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  WALLET_SOURCE_LABELS,
  type WalletTransactionSource,
} from "@/lib/types/wallet";

interface WalletTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionType: "deposit" | "withdrawal";
  walletAccountId?: string;
  onComplete?: () => void;
  // For ATM withdrawals from reconciliation
  prefillAmount?: number;
  prefillSource?: WalletTransactionSource;
  prefillDescription?: string;
  linkedTransactionId?: string;
}

// Sources applicable to deposits
const DEPOSIT_SOURCES: WalletTransactionSource[] = [
  "manual",
  "atm_withdrawal",
  "gift",
  "transfer",
];

// Sources applicable to withdrawals (spending)
const WITHDRAWAL_SOURCES: WalletTransactionSource[] = ["manual", "spending", "transfer"];

export function WalletTransactionDialog({
  open,
  onOpenChange,
  transactionType,
  walletAccountId,
  onComplete,
  prefillAmount,
  prefillSource,
  prefillDescription,
  linkedTransactionId,
}: WalletTransactionDialogProps) {
  const [amount, setAmount] = useState<string>(prefillAmount?.toString() || "");
  const [source, setSource] = useState<WalletTransactionSource>(
    prefillSource || (transactionType === "deposit" ? "manual" : "spending")
  );
  const [description, setDescription] = useState(prefillDescription || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeposit = transactionType === "deposit";
  const availableSources = isDeposit ? DEPOSIT_SOURCES : WITHDRAWAL_SOURCES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      // Amount is positive for deposits, negative for withdrawals
      const finalAmount = isDeposit ? numAmount : -numAmount;

      const response = await fetch("/api/wallet/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          source,
          description: description.trim() || null,
          linked_bank_transaction_id: linkedTransactionId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save transaction");
      }

      // Reset form
      setAmount("");
      setDescription("");
      setSource(isDeposit ? "manual" : "spending");

      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount("");
      setDescription("");
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            {isDeposit ? "Add Cash to Wallet" : "Record Cash Spent"}
          </DialogTitle>
          <DialogDescription>
            {isDeposit
              ? "Record cash you've received or withdrawn from the bank."
              : "Record cash you've spent from your wallet."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={source}
              onValueChange={(value) => setSource(value as WalletTransactionSource)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {availableSources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {WALLET_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-text-light">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder={
                isDeposit
                  ? "e.g., Birthday gift from Grandma"
                  : "e.g., Coffee at the market"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-blue bg-blue-light px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount}
              className={isDeposit ? "bg-sage hover:bg-sage-dark" : ""}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isDeposit ? (
                "Add Cash"
              ) : (
                "Record Spending"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
