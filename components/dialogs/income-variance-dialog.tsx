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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { IncomeVariance } from "@/lib/services/income-variance-detector";
import { formatVarianceForDisplay, getSuggestedActions } from "@/lib/services/income-variance-detector";

interface IncomeVarianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variance: IncomeVariance;
  onOneTimeBonus: (variance: IncomeVariance) => Promise<void>;
  onPermanentChange: (variance: IncomeVariance) => Promise<void>;
}

export function IncomeVarianceDialog({
  open,
  onOpenChange,
  variance,
  onOneTimeBonus,
  onPermanentChange,
}: IncomeVarianceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("one_time_bonus");

  const display = formatVarianceForDisplay(variance);
  const actions = getSuggestedActions(variance);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const action = actions.find((a) => a.id === selectedAction);
      if (!action) return;

      if (action.action === "one_time") {
        await onOneTimeBonus(variance);
        toast.success(`$${variance.difference.toFixed(2)} added to Surplus envelope`);
      } else {
        await onPermanentChange(variance);
        toast.success("Income updated - redirecting to Budget Manager");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error handling income variance:", error);
      toast.error("Failed to process income variance");
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent dismissal - user must make a choice
  const handleInteractOutside = (e: Event) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            {display.title}
          </DialogTitle>
          <DialogDescription>
            {display.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Variance Summary */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Expected</div>
                <div className="text-lg font-semibold">{display.expectedFormatted}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Received</div>
                <div className="text-lg font-semibold text-emerald-600">{display.actualFormatted}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Difference</div>
                <div className="text-lg font-bold text-emerald-700">
                  {display.differenceFormatted}
                  <span className="text-xs font-normal ml-1">({display.percentageFormatted})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              How should we handle this extra ${variance.difference.toFixed(2)}?
            </Label>
            <RadioGroup
              value={selectedAction}
              onValueChange={setSelectedAction}
              className="space-y-2"
            >
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedAction === action.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedAction(action.id)}
                >
                  <RadioGroupItem value={action.id} id={action.id} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={action.id} className="cursor-pointer font-medium">
                      {action.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
