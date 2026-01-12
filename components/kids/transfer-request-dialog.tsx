"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, PiggyBank, TrendingUp, Heart, ArrowRight, Wallet } from "lucide-react";
import type { TransferEnvelope } from "@/lib/types/kids-invoice";

interface TransferRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  envelopeBalances: {
    save: number;
    invest: number;
    give: number;
    spend: number;
  };
}

const ENVELOPE_CONFIG: Record<TransferEnvelope, { label: string; icon: typeof PiggyBank; color: string }> = {
  save: { label: "Save", icon: PiggyBank, color: "text-blue-600" },
  invest: { label: "Invest", icon: TrendingUp, color: "text-green-600" },
  give: { label: "Give", icon: Heart, color: "text-pink-600" },
};

export function TransferRequestDialog({
  open,
  onOpenChange,
  childId,
  childName,
  envelopeBalances,
}: TransferRequestDialogProps) {
  const router = useRouter();
  const [fromEnvelope, setFromEnvelope] = useState<TransferEnvelope | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromEnvelope) {
      toast.error("Please select an envelope to transfer from");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const balance = envelopeBalances[fromEnvelope];
    if (amountNum > balance) {
      toast.error(`Not enough in ${ENVELOPE_CONFIG[fromEnvelope].label}. Balance: $${balance.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/kids/${childId}/transfer-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_envelope: fromEnvelope,
          amount: amountNum,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      toast.success("Transfer request submitted! A parent will review it soon.");
      onOpenChange(false);
      router.refresh();

      // Reset form
      setFromEnvelope(null);
      setAmount("");
      setReason("");
    } catch (error) {
      console.error("Transfer request error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBalance = fromEnvelope ? envelopeBalances[fromEnvelope] : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Transfer to Spend</DialogTitle>
          <DialogDescription>
            Ask a parent to move money to your Spend envelope
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Envelope Selection */}
          <div className="space-y-3">
            <Label>Transfer from</Label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(ENVELOPE_CONFIG) as [TransferEnvelope, typeof ENVELOPE_CONFIG.save][]).map(
                ([key, config]) => {
                  const Icon = config.icon;
                  const balance = envelopeBalances[key];
                  const isSelected = fromEnvelope === key;
                  const hasBalance = balance > 0;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!hasBalance}
                      onClick={() => setFromEnvelope(key)}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all text-center
                        ${isSelected
                          ? "border-sage bg-sage-very-light"
                          : hasBalance
                            ? "border-border hover:border-sage-light"
                            : "border-border bg-muted opacity-50 cursor-not-allowed"
                        }
                      `}
                    >
                      <Icon className={`h-6 w-6 mx-auto mb-1 ${config.color}`} />
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        ${balance.toFixed(2)}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Transfer Visualization */}
          {fromEnvelope && (
            <div className="flex items-center justify-center gap-3 py-2 bg-muted/50 rounded-lg">
              {(() => {
                const config = ENVELOPE_CONFIG[fromEnvelope];
                const Icon = config.icon;
                return (
                  <>
                    <div className="text-center">
                      <Icon className={`h-5 w-5 mx-auto ${config.color}`} />
                      <p className="text-xs">{config.label}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-center">
                      <Wallet className="h-5 w-5 mx-auto text-amber-600" />
                      <p className="text-xs">Spend</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedBalance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
            {fromEnvelope && (
              <p className="text-xs text-muted-foreground">
                Available: ${selectedBalance.toFixed(2)}
                {selectedBalance > 0 && (
                  <button
                    type="button"
                    className="ml-2 text-sage hover:underline"
                    onClick={() => setAmount(selectedBalance.toString())}
                  >
                    Use all
                  </button>
                )}
              </p>
            )}
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Tell your parents what you need the money for..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!fromEnvelope || !amount || isSubmitting}
              className="flex-1 bg-sage hover:bg-sage-dark"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
