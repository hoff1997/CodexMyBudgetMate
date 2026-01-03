"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, TrendingUp } from "lucide-react";

type ValidationDialogType = 'overspent' | 'surplus' | 'navigation';

interface BudgetValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ValidationDialogType;
  amount: number;
  onConfirm?: () => void;
  onAllocateSurplus?: () => void;
  confirmLabel?: string;
}

export function BudgetValidationDialog({
  open,
  onOpenChange,
  type,
  amount,
  onConfirm,
  onAllocateSurplus,
  confirmLabel = "Continue Anyway",
}: BudgetValidationDialogProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleAllocateSurplus = () => {
    onAllocateSurplus?.();
    onOpenChange(false);
  };

  if (type === 'overspent') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Budget Overspent
            </DialogTitle>
            <DialogDescription>
              Your budget needs adjustment before you can save.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="text-sm text-red-700 font-medium">
                Overspent Amount
              </div>
              <div className="text-2xl font-bold text-red-900">
                ${Math.abs(amount).toFixed(2)}
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Your allocations exceed your income by <strong>${Math.abs(amount).toFixed(2)}</strong>.
              </p>
              <p>
                Please adjust your envelope allocations to balance your budget before saving.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Adjust Allocations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === 'surplus') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
              Unallocated Funds
            </DialogTitle>
            <DialogDescription>
              You have funds that aren't allocated to any envelope.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="text-sm text-blue-700 font-medium">
                Unallocated Amount
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${amount.toFixed(2)}
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                You have <strong>${amount.toFixed(2)}</strong> that isn't allocated to any envelope.
              </p>
              <p>
                You can allocate this to your Surplus envelope or continue with unallocated funds.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
            {onAllocateSurplus && (
              <Button onClick={handleAllocateSurplus} className="bg-blue-600 hover:bg-blue-700">
                Allocate to Surplus
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === 'navigation') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved allocation changes.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to leave? Your changes will be lost.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Stay on Page
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Leave Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
