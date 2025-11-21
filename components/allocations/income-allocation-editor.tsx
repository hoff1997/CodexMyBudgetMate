"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { Check, X, AlertCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AllocationItem = {
  id?: string;
  envelopeId: string;
  envelopeName: string;
  envelopeIcon: string;
  amount: number;
};

type IncomeAllocationEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionAmount: number;
  allocationPlanId: string;
  initialAllocations: AllocationItem[];
  onSaved: () => void;
};

export function IncomeAllocationEditor({
  open,
  onOpenChange,
  transactionId,
  transactionAmount,
  allocationPlanId,
  initialAllocations,
  onSaved,
}: IncomeAllocationEditorProps) {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [saveMode, setSaveMode] = useState<"one-off" | "update-plan">("one-off");
  const [saving, setSaving] = useState(false);
  const [showUnbalancedWarning, setShowUnbalancedWarning] = useState(false);

  // Initialize allocations when dialog opens
  useEffect(() => {
    if (open) {
      setAllocations(initialAllocations.map(a => ({ ...a })));
      setSaveMode("one-off");
      setShowUnbalancedWarning(false);
    }
  }, [open, initialAllocations]);

  // Calculate totals and balance
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const difference = totalAllocated - transactionAmount;
  const isBalanced = Math.abs(difference) < 0.01; // Allow 1 cent tolerance

  // Update allocation amount
  function updateAllocation(index: number, newAmount: string) {
    const amount = newAmount === '' ? 0 : parseFloat(newAmount);
    if (isNaN(amount)) return;

    const updated = [...allocations];
    updated[index] = { ...updated[index], amount };
    setAllocations(updated);
    setShowUnbalancedWarning(false);
  }

  // Remove allocation
  function removeAllocation(index: number) {
    setAllocations(allocations.filter((_, i) => i !== index));
  }

  // Handle save
  async function handleSave() {
    if (!isBalanced) {
      setShowUnbalancedWarning(true);
      return;
    }

    // If updating plan and not balanced, warn
    if (saveMode === "update-plan") {
      if (!confirm(
        "This will update your recurring income plan. All future income transactions will use these allocations. Continue?"
      )) {
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/allocations/plans/${allocationPlanId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allocations: allocations.map(a => ({
              envelopeId: a.envelopeId,
              amount: a.amount,
            })),
            saveMode,
          }),
        }
      );

      if (response.ok) {
        toast.success(
          saveMode === "one-off"
            ? "Allocation updated for this transaction"
            : "Allocation updated and saved to recurring income plan"
        );
        onSaved();
        onOpenChange(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update allocation");
      }
    } catch (error) {
      console.error("Failed to update allocation:", error);
      toast.error("Failed to update allocation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Income Allocation</DialogTitle>
          <DialogDescription>
            Adjust how this income is allocated across your envelopes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transaction Info */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transaction Amount</span>
              <span className="text-lg font-bold text-secondary">
                {formatCurrency(transactionAmount)}
              </span>
            </div>
          </div>

          {/* Allocations */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Envelope Allocations</Label>
            {allocations.map((allocation, index) => (
              <div
                key={allocation.envelopeId}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <span className="text-2xl">{allocation.envelopeIcon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary">
                    {allocation.envelopeName}
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    value={allocation.amount || ''}
                    onChange={(e) => updateAllocation(index, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAllocation(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Balance Status */}
          <div className="space-y-3">
            <div className={`rounded-lg border p-4 ${
              isBalanced
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBalanced ? (
                    <>
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900">Balanced</span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-900">
                        {difference > 0 ? "Over" : "Under"} by {formatCurrency(Math.abs(difference))}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Allocated</p>
                  <p className={`text-lg font-bold ${
                    isBalanced ? "text-green-900" : "text-red-900"
                  }`}>
                    {formatCurrency(totalAllocated)}
                  </p>
                </div>
              </div>
            </div>

            {showUnbalancedWarning && !isBalanced && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You cannot save until the allocations match the transaction amount exactly.
                  Please adjust the amounts to balance.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Save Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Apply Changes</Label>
            <div className="space-y-2">
              <label
                className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  saveMode === "one-off"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="save-mode"
                  value="one-off"
                  checked={saveMode === "one-off"}
                  onChange={(e) => setSaveMode(e.target.value as any)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-secondary">This transaction only</p>
                  <p className="text-sm text-muted-foreground">
                    Update only this transaction without changing your recurring income plan
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  saveMode === "update-plan"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="save-mode"
                  value="update-plan"
                  checked={saveMode === "update-plan"}
                  onChange={(e) => setSaveMode(e.target.value as any)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-secondary">Update recurring income plan</p>
                  <p className="text-sm text-muted-foreground">
                    Save these allocations to your recurring income plan for all future income
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isBalanced}
            className="gap-2"
          >
            {saving && (
              <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />
            )}
            Save Allocation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
