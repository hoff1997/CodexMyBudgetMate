"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, X, Clock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface PendingTransaction {
  id: string;
  child_profile_id: string;
  child_name: string;
  child_avatar: string;
  amount: number;
  description: string | null;
  category: string | null;
  merchant_name: string | null;
  from_envelope_type: string | null;
  created_at: string;
  approval_reason: string | null;
}

interface SpendingApprovalQueueProps {
  transactions: PendingTransaction[];
  onApprove: (transactionId: string) => void;
  onDeny: (transactionId: string, reason: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  snacks: "🍿",
  toys: "🧸",
  games: "🎮",
  clothes: "👕",
  books: "📚",
  other: "📦",
};

export function SpendingApprovalQueue({
  transactions,
  onApprove,
  onDeny,
}: SpendingApprovalQueueProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const handleApprove = async (transaction: PendingTransaction) => {
    setProcessingId(transaction.id);
    try {
      await fetch(
        `/api/kids/${transaction.child_profile_id}/spending/${transaction.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      );
      toast.success(`Approved $${transaction.amount.toFixed(2)} for ${transaction.child_name}`);
      onApprove(transaction.id);
    } catch (error) {
      toast.error("Failed to approve transaction");
    } finally {
      setProcessingId(null);
    }
  };

  const openDenyDialog = (transaction: PendingTransaction) => {
    setSelectedTransaction(transaction);
    setDenyReason("");
    setShowDenyDialog(true);
  };

  const handleDeny = async () => {
    if (!selectedTransaction) return;

    setProcessingId(selectedTransaction.id);
    try {
      await fetch(
        `/api/kids/${selectedTransaction.child_profile_id}/spending/${selectedTransaction.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deny",
            denial_reason: denyReason.trim() || "Not approved",
          }),
        }
      );
      toast.success(`Denied spending request for ${selectedTransaction.child_name}`);
      onDeny(selectedTransaction.id, denyReason);
      setShowDenyDialog(false);
    } catch (error) {
      toast.error("Failed to deny transaction");
    } finally {
      setProcessingId(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-10 w-10 text-text-light mx-auto mb-3" />
          <p className="text-text-medium">No pending spending requests</p>
          <p className="text-sm text-text-light mt-1">
            You'll be notified when your children request to spend money
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gold" />
            Pending Approvals
            <Badge variant="outline" className="ml-2 bg-gold-light text-gold-dark">
              {transactions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-3 p-3 bg-gold-light/30 rounded-lg border border-gold-light"
            >
              {/* Child Avatar */}
              <div className="w-10 h-10 rounded-full bg-sage-very-light flex items-center justify-center text-lg border-2 border-sage-light">
                {transaction.child_avatar || "👤"}
              </div>

              {/* Transaction Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-dark">
                    {transaction.child_name}
                  </span>
                  <span className="text-text-medium">wants to spend</span>
                  <span className="font-bold text-text-dark">
                    ${transaction.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-sm text-text-light">
                  <span className="text-lg">
                    {CATEGORY_ICONS[transaction.category || "other"]}
                  </span>
                  <span>{transaction.description || "General spending"}</span>
                </div>
                {transaction.approval_reason && (
                  <p className="text-xs text-gold-dark mt-1 bg-gold-light/50 rounded px-2 py-1">
                    Reason: {transaction.approval_reason}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDenyDialog(transaction)}
                  disabled={processingId === transaction.id}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(transaction)}
                  disabled={processingId === transaction.id}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {processingId === transaction.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deny Dialog */}
      <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Spending Request</DialogTitle>
            <DialogDescription>
              Let {selectedTransaction?.child_name} know why this spending isn't
              approved right now.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-silver-very-light rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {CATEGORY_ICONS[selectedTransaction?.category || "other"]}
                </span>
                <span className="font-medium">
                  ${selectedTransaction?.amount.toFixed(2)}
                </span>
                <span className="text-text-medium">-</span>
                <span className="text-text-medium">
                  {selectedTransaction?.description || "General spending"}
                </span>
              </div>
            </div>

            <Textarea
              placeholder="Reason for denying (optional)..."
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDenyDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeny}
                disabled={processingId === selectedTransaction?.id}
                className="bg-red-600 hover:bg-red-700"
              >
                {processingId === selectedTransaction?.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Deny Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
