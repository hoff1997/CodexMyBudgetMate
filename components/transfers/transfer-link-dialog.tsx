"use client";

/**
 * Transfer Link Dialog
 *
 * Dialog for confirming a transfer link between two transactions.
 * Shows confidence score, account details, and preview of the transfer.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import type { TransferMatch, TransactionForMatching } from "@/lib/types/transfer";
import { getConfidenceLabel, getConfidenceColorClass } from "@/lib/utils/transfer-detection";

interface TransferLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTransaction: TransactionForMatching;
  sourceAccountName: string;
  potentialMatches: TransferMatch[];
  onConfirm: (matchedTransactionId: string) => Promise<void>;
  onDismiss?: () => void;
  onMarkPending?: () => Promise<void>;
}

export function TransferLinkDialog({
  open,
  onOpenChange,
  sourceTransaction,
  sourceAccountName,
  potentialMatches,
  onConfirm,
  onDismiss,
  onMarkPending,
}: TransferLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    potentialMatches[0]?.transaction.id || null
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
    }).format(Math.abs(amount));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleConfirm = async () => {
    if (!selectedMatchId) return;
    setIsLoading(true);
    try {
      await onConfirm(selectedMatchId);
      onOpenChange(false);
    } catch (error) {
      console.error("Error linking transfer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPending = async () => {
    if (!onMarkPending) return;
    setIsLoading(true);
    try {
      await onMarkPending();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking as pending:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMatch = potentialMatches.find(
    (m) => m.transaction.id === selectedMatchId
  );

  // Determine which side is outgoing and incoming
  const isOutgoing = sourceTransaction.amount < 0;
  const outgoingAccount = isOutgoing ? sourceAccountName : selectedMatch?.accountName || "?";
  const incomingAccount = isOutgoing ? selectedMatch?.accountName || "?" : sourceAccountName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            Link as Transfer?
          </DialogTitle>
          <DialogDescription>
            We detected this might be a transfer between your accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Transaction */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">
              {isOutgoing ? "Outgoing from" : "Incoming to"} {sourceAccountName}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">
                  {sourceTransaction.merchant_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(sourceTransaction.occurred_at)}
                </div>
              </div>
              <div
                className={`text-lg font-semibold ${
                  sourceTransaction.amount < 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {sourceTransaction.amount < 0 ? "-" : "+"}
                {formatCurrency(sourceTransaction.amount)}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Potential Matches */}
          {potentialMatches.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {potentialMatches.length === 1
                  ? "Matching transaction:"
                  : "Select matching transaction:"}
              </div>
              {potentialMatches.map((match) => (
                <button
                  key={match.transaction.id}
                  onClick={() => setSelectedMatchId(match.transaction.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedMatchId === match.transaction.id
                      ? "border-blue-500 bg-blue-50"
                      : "hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceColorClass(
                          match.confidence.score
                        )}`}
                      >
                        {Math.round(match.confidence.score)}%{" "}
                        {getConfidenceLabel(match.confidence.score)}
                      </span>
                    </div>
                    {selectedMatchId === match.transaction.id && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">
                        {match.accountNickname || match.accountName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {match.transaction.merchant_name} •{" "}
                        {formatDate(match.transaction.occurred_at)}
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        match.transaction.amount < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {match.transaction.amount < 0 ? "-" : "+"}
                      {formatCurrency(match.transaction.amount)}
                    </div>
                  </div>
                  {match.amountDifference > 0 && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Amount difference: {formatCurrency(match.amountDifference)}{" "}
                      (possible bank fee)
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-800">
                    No matching transaction found
                  </div>
                  <div className="text-sm text-amber-700 mt-1">
                    The other side of this transfer may not have imported yet.
                    You can mark it as "pending" and we'll match it when it
                    appears.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Preview */}
          {selectedMatch && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="text-xs text-blue-700 font-medium mb-2">
                Transfer Preview
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="font-medium">{outgoingAccount}</span>
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{incomingAccount}</span>
              </div>
              <div className="text-center text-lg font-bold text-blue-900 mt-1">
                {formatCurrency(Math.abs(sourceTransaction.amount))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onMarkPending && potentialMatches.length === 0 && (
            <Button
              variant="outline"
              onClick={handleMarkPending}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Mark as Pending Transfer
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              onClick={() => {
                onDismiss();
                onOpenChange(false);
              }}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Not a Transfer
            </Button>
          )}
          {potentialMatches.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !selectedMatchId}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="mr-2 h-4 w-4" />
              )}
              Link as Transfer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
