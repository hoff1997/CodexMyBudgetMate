"use client";

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
import { CheckCircle, Loader2 } from "lucide-react";

interface AllocateSurplusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surplusAmount: number;
  incomeSources: Array<{
    id: string;
    name: string;
    amount: number; // Unallocated amount from this source
  }>;
  onConfirm: () => Promise<void>;
}

export function AllocateSurplusDialog({
  open,
  onOpenChange,
  surplusAmount,
  incomeSources,
  onConfirm,
}: AllocateSurplusDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error allocating surplus:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Allocate Surplus to Savings
          </DialogTitle>
          <DialogDescription>
            You have unallocated funds in your budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <div className="text-sm text-emerald-700 font-medium">
              Total Unallocated
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              ${surplusAmount.toFixed(2)}
            </div>
          </div>

          {incomeSources.length > 1 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Breakdown by Income Source:</div>
              <div className="space-y-1">
                {incomeSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>{source.name}</span>
                    <span className="font-medium">${source.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            This will allocate ${surplusAmount.toFixed(2)} to your <strong>Surplus</strong> envelope.
            You can always adjust this allocation later.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Allocate to Surplus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
