"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign, ShoppingBag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface RecordSpendingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  availableBalance: number;
  dailyLimit: number | null;
  dailySpent: number;
  onRecorded: () => void;
}

const CATEGORIES = [
  { value: "snacks", label: "Snacks & Treats", icon: "🍿" },
  { value: "toys", label: "Toys", icon: "🧸" },
  { value: "games", label: "Games", icon: "🎮" },
  { value: "clothes", label: "Clothes", icon: "👕" },
  { value: "books", label: "Books", icon: "📚" },
  { value: "other", label: "Other", icon: "📦" },
];

export function RecordSpendingDialog({
  open,
  onOpenChange,
  childId,
  childName,
  availableBalance,
  dailyLimit,
  dailySpent,
  onRecorded,
}: RecordSpendingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [merchant, setMerchant] = useState("");

  const numAmount = parseFloat(amount) || 0;
  const exceedsBalance = numAmount > availableBalance;
  const exceedsDailyLimit = dailyLimit !== null && (dailySpent + numAmount) > dailyLimit;
  const dailyRemaining = dailyLimit !== null ? dailyLimit - dailySpent : null;

  const handleSubmit = async () => {
    if (!amount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (exceedsBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/kids/${childId}/spending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          description: description.trim() || null,
          category,
          merchant_name: merchant.trim() || null,
          from_envelope_type: "spend",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record spending");
      }

      const data = await res.json();

      if (data.requires_approval) {
        toast.info("Spending request submitted for approval", {
          description: data.approval_reason,
        });
      } else {
        toast.success(`Recorded $${numAmount.toFixed(2)} spending for ${childName}`);
      }

      onRecorded();
      onOpenChange(false);

      // Reset form
      setAmount("");
      setDescription("");
      setCategory("other");
      setMerchant("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record spending");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-sage" />
            Record Spending
          </DialogTitle>
          <DialogDescription>
            Record a purchase for {childName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Balance Info */}
          <div className="bg-sage-very-light rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-text-medium">Available Balance</span>
            <span className="font-bold text-sage-dark">
              ${availableBalance.toFixed(2)}
            </span>
          </div>

          {/* Daily Limit Warning */}
          {dailyLimit !== null && (
            <div className={`rounded-lg p-3 flex items-center justify-between ${
              exceedsDailyLimit ? "bg-gold-light" : "bg-silver-very-light"
            }`}>
              <span className="text-sm text-text-medium">Daily Remaining</span>
              <span className={`font-medium ${exceedsDailyLimit ? "text-gold-dark" : "text-text-dark"}`}>
                ${dailyRemaining?.toFixed(2)} of ${dailyLimit.toFixed(2)}
              </span>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-text-light" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
              />
            </div>
            {exceedsBalance && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Exceeds available balance
              </p>
            )}
            {exceedsDailyLimit && !exceedsBalance && (
              <p className="text-xs text-gold-dark flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Exceeds daily limit - will require approval
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What was purchased?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Merchant */}
          <div className="space-y-2">
            <Label htmlFor="merchant">Store/Merchant (optional)</Label>
            <Input
              id="merchant"
              placeholder="Where was it purchased?"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !amount || numAmount <= 0 || exceedsBalance}
              className="bg-sage hover:bg-sage-dark"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Record Spending
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
