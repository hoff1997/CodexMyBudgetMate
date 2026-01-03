"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface TransactionData {
  id: string;
  merchant_name: string;
  description?: string | null;
  amount: string | number | null;
  occurred_at: string;
  envelope_name?: string | null;
  account_name?: string | null;
  status?: string | null;
  bank_reference?: string | null;
  bank_memo?: string | null;
}

interface EditTransactionDialogProps {
  transaction: TransactionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: EditTransactionDialogProps) {
  const [merchantName, setMerchantName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (transaction) {
      setMerchantName(transaction.merchant_name || "");
      setDescription(transaction.description || "");
      setAmount(Math.abs(Number(transaction.amount)).toFixed(2));
      setOccurredAt(transaction.occurred_at?.split("T")[0] || "");
      setShowDeleteConfirm(false);
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;

    setIsSaving(true);
    try {
      const originalAmount = Number(transaction.amount);
      const newAmount = Number(amount);
      const finalAmount = originalAmount < 0 ? -Math.abs(newAmount) : Math.abs(newAmount);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_name: merchantName,
          description: description || null,
          amount: finalAmount,
          occurred_at: occurredAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update transaction");
      }

      toast.success("Transaction updated");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update transaction");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete transaction");
      }

      toast.success("Transaction deleted");
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!transaction) return null;

  const isExpense = Number(transaction.amount) < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#3D3D3D]">Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="merchant" className="text-[#6B6B6B]">Merchant</Label>
            <Input
              id="merchant"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="border-[#E5E7EB] focus:border-[#7A9E9A]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#6B6B6B]">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="border-[#E5E7EB] focus:border-[#7A9E9A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-[#6B6B6B]">
                Amount {isExpense ? "(Expense)" : "(Income)"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-[#E5E7EB] focus:border-[#7A9E9A] pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-[#6B6B6B]">Date</Label>
              <Input
                id="date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="border-[#E5E7EB] focus:border-[#7A9E9A]"
              />
            </div>
          </div>

          <div className="rounded-lg bg-[#F3F4F6] p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Envelope:</span>
              <span className="text-[#6B6B6B]">{transaction.envelope_name || "Unassigned"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Account:</span>
              <span className="text-[#6B6B6B]">{transaction.account_name || "—"}</span>
            </div>
            {transaction.bank_reference && (
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Bank Ref:</span>
                <span className="text-[#6B6B6B] truncate max-w-[200px]">{transaction.bank_reference}</span>
              </div>
            )}
          </div>
        </div>

        {!showDeleteConfirm ? (
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#E5E7EB] text-[#6B6B6B]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !merchantName.trim()}
                className="bg-[#7A9E9A] hover:bg-[#5A7E7A] text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#6B6B6B]">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-[#E5E7EB] text-[#6B6B6B]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Transaction
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
