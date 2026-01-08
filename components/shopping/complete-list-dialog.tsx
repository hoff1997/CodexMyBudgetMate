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
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle, Wallet, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils/format";

interface CompleteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
  estimatedTotal: number;
  linkedEnvelopeId: string | null;
  linkedEnvelopeName: string | null;
  onCompleted: () => void;
}

export function CompleteListDialog({
  open,
  onOpenChange,
  listId,
  listName,
  estimatedTotal,
  linkedEnvelopeId,
  linkedEnvelopeName,
  onCompleted,
}: CompleteListDialogProps) {
  const [completing, setCompleting] = useState(false);
  const [actualTotal, setActualTotal] = useState<string>(estimatedTotal.toFixed(2));
  const [recordToEnvelope, setRecordToEnvelope] = useState(!!linkedEnvelopeId);
  const [result, setResult] = useState<{
    success: boolean;
    totalSpent: number;
    envelopeUpdate: {
      envelope_name: string;
      amount_deducted: number;
      new_balance: number;
    } | null;
  } | null>(null);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/shopping/lists/${listId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_total: parseFloat(actualTotal) || 0,
          record_to_envelope: recordToEnvelope,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete list");
      }

      const data = await res.json();
      setResult({
        success: true,
        totalSpent: data.list.total_spent,
        envelopeUpdate: data.envelope_update,
      });
      toast.success("Shopping list completed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete list");
    } finally {
      setCompleting(false);
    }
  };

  const handleClose = () => {
    if (result) {
      onCompleted();
    }
    onOpenChange(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-sage" />
            Complete Shopping List
          </DialogTitle>
          <DialogDescription>
            Mark &quot;{listName}&quot; as complete and record your spending.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Success state
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-sage-very-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-sage" />
            </div>
            <h3 className="text-lg font-semibold text-text-dark mb-2">
              Shopping Complete!
            </h3>
            <p className="text-text-medium mb-4">
              Total spent: <span className="font-medium">{formatMoney(result.totalSpent)}</span>
            </p>
            {result.envelopeUpdate && (
              <div className="bg-sage-very-light rounded-lg p-4 text-left mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-sage" />
                  <span className="font-medium text-sage-dark">
                    {result.envelopeUpdate.envelope_name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-text-medium">Deducted:</div>
                  <div className="text-right font-medium text-red-600">
                    -{formatMoney(result.envelopeUpdate.amount_deducted)}
                  </div>
                  <div className="text-text-medium">New Balance:</div>
                  <div className="text-right font-medium">
                    {formatMoney(result.envelopeUpdate.new_balance)}
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleClose} className="bg-sage hover:bg-sage-dark">
              Done
            </Button>
          </div>
        ) : (
          // Form state
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="actual-total">Total Spent</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="actual-total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualTotal}
                  onChange={(e) => setActualTotal(e.target.value)}
                  className="pl-7"
                />
              </div>
              {estimatedTotal > 0 && (
                <p className="text-sm text-text-light">
                  Estimated: {formatMoney(estimatedTotal)}
                </p>
              )}
            </div>

            {linkedEnvelopeId && (
              <div className="flex items-center justify-between p-3 bg-silver-very-light rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-sage" />
                  <div>
                    <p className="text-sm font-medium">{linkedEnvelopeName}</p>
                    <p className="text-xs text-text-light">
                      Deduct from envelope balance
                    </p>
                  </div>
                </div>
                <Switch
                  checked={recordToEnvelope}
                  onCheckedChange={setRecordToEnvelope}
                />
              </div>
            )}

            {!linkedEnvelopeId && (
              <div className="bg-blue-light/30 rounded-lg p-3">
                <p className="text-sm text-blue">
                  Tip: Link this list to a budget envelope to automatically track your grocery spending.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completing || !actualTotal}
                className="bg-sage hover:bg-sage-dark"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Complete Shopping
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
