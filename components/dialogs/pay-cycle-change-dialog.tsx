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
import { AlertTriangle, Loader2 } from "lucide-react";

type PayCycle = 'weekly' | 'fortnightly' | 'monthly';

interface PayCycleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPayCycle: PayCycle;
  newPayCycle: PayCycle;
  envelopeCount: number;
  totalAllocated: number;
  onConfirm: () => Promise<void>;
}

export function PayCycleChangeDialog({
  open,
  onOpenChange,
  currentPayCycle,
  newPayCycle,
  envelopeCount,
  totalAllocated,
  onConfirm,
}: PayCycleChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error changing pay cycle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate conversion factor
  const getConversionFactor = (from: PayCycle, to: PayCycle): number => {
    const factors: Record<PayCycle, number> = {
      weekly: 52,
      fortnightly: 26,
      monthly: 12,
    };
    return factors[from] / factors[to];
  };

  const conversionFactor = getConversionFactor(currentPayCycle, newPayCycle);
  const newTotalAllocated = totalAllocated * conversionFactor;

  const getPayCycleLabel = (cycle: PayCycle): string => {
    if (cycle === 'fortnightly') return 'fortnight';
    return cycle;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Change Pay Cycle
          </DialogTitle>
          <DialogDescription>
            This will recalculate all envelope allocations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700 font-medium">Current Pay Cycle:</span>
              <span className="font-semibold capitalize">{currentPayCycle}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700 font-medium">New Pay Cycle:</span>
              <span className="font-semibold capitalize">{newPayCycle}</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Impact on your budget:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>{envelopeCount}</strong> envelope{envelopeCount !== 1 ? 's' : ''} will be recalculated
              </li>
              <li>
                Total allocations will change from{' '}
                <strong>${totalAllocated.toFixed(2)}</strong> per {getPayCycleLabel(currentPayCycle)} to{' '}
                <strong>${newTotalAllocated.toFixed(2)}</strong> per {getPayCycleLabel(newPayCycle)}
              </li>
              <li>
                All envelope amounts will be automatically adjusted to match the new pay cycle
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Annual amounts remain the same. Only per-pay-cycle amounts will change.
            </p>
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
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
