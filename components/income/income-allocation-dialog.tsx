"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IncomeAllocationPreview } from "./income-allocation-preview";

interface IncomeAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  onComplete?: () => void;
}

export function IncomeAllocationDialog({
  open,
  onOpenChange,
  transactionId,
  transactionDescription,
  transactionAmount,
  onComplete,
}: IncomeAllocationDialogProps) {
  function handleApprove() {
    onOpenChange(false);
    if (onComplete) {
      onComplete();
    }
  }

  function handleSkip() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auto-Allocate Income</DialogTitle>
        </DialogHeader>
        <IncomeAllocationPreview
          transactionId={transactionId}
          transactionDescription={transactionDescription}
          transactionAmount={transactionAmount}
          onApprove={handleApprove}
          onSkip={handleSkip}
        />
      </DialogContent>
    </Dialog>
  );
}
