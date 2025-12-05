"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { IncomeVariance } from "@/lib/services/income-variance-detector";
import {
  formatVarianceForDisplay,
  getSuggestedActions,
  groupEnvelopesByPriority,
} from "@/lib/services/income-variance-detector";

interface EnvelopeWithAllocation {
  id: string;
  name: string;
  priority?: string;
  incomeAllocations?: Record<string, number>;
}

interface IncomeShortfallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variance: IncomeVariance;
  envelopes: EnvelopeWithAllocation[];
  onOneTimeReduction: (
    variance: IncomeVariance,
    reductions: Array<{ envelopeId: string; amount: number }>
  ) => Promise<void>;
  onPermanentChange: (variance: IncomeVariance) => Promise<void>;
}

export function IncomeShortfallDialog({
  open,
  onOpenChange,
  variance,
  envelopes,
  onOneTimeReduction,
  onPermanentChange,
}: IncomeShortfallDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("one_time_reduction");
  const [reductions, setReductions] = useState<Record<string, number>>({});

  const shortfallAmount = Math.abs(variance.difference);
  const display = formatVarianceForDisplay(variance);
  const actions = getSuggestedActions(variance);

  // Group envelopes by priority for the reduction selector
  const groupedEnvelopes = useMemo(
    () => groupEnvelopesByPriority(envelopes, variance.incomeSourceId),
    [envelopes, variance.incomeSourceId]
  );

  // Calculate total reductions entered
  const totalReductions = useMemo(
    () => Object.values(reductions).reduce((sum, amt) => sum + (amt || 0), 0),
    [reductions]
  );

  const remainingToAllocate = shortfallAmount - totalReductions;
  const isFullyAllocated = Math.abs(remainingToAllocate) < 0.01;

  const handleReductionChange = (envelopeId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setReductions((prev) => ({
      ...prev,
      [envelopeId]: Math.max(0, amount),
    }));
  };

  const handleConfirm = async () => {
    if (selectedAction === "one_time_reduction" && !isFullyAllocated) {
      toast.error(`Please allocate exactly $${shortfallAmount.toFixed(2)} in reductions`);
      return;
    }

    setIsLoading(true);
    try {
      const action = actions.find((a) => a.id === selectedAction);
      if (!action) return;

      if (action.action === "one_time") {
        // Convert reductions to array format
        const reductionArray = Object.entries(reductions)
          .filter(([_, amount]) => amount > 0)
          .map(([envelopeId, amount]) => ({ envelopeId, amount }));

        await onOneTimeReduction(variance, reductionArray);
        toast.success("Envelope allocations reduced for this cycle");
      } else {
        await onPermanentChange(variance);
        toast.success("Income updated - redirecting to Budget Manager");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error handling income shortfall:", error);
      toast.error("Failed to process income shortfall");
    } finally {
      setIsLoading(false);
    }
  };

  const priorityEmoji: Record<string, string> = {
    discretionary: "🟢",
    important: "🟡",
    essential: "🔴",
  };

  // Prevent dismissal - user must make a choice
  const handleInteractOutside = (e: Event) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {display.title}
          </DialogTitle>
          <DialogDescription>
            {display.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Variance Summary */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Expected</div>
                <div className="text-lg font-semibold">{display.expectedFormatted}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Received</div>
                <div className="text-lg font-semibold text-amber-600">{display.actualFormatted}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Shortfall</div>
                <div className="text-lg font-bold text-red-600">
                  -${shortfallAmount.toFixed(2)}
                  <span className="text-xs font-normal ml-1">({display.percentageFormatted})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Your budget is short ${shortfallAmount.toFixed(2)} this cycle.
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
                      ? "border-amber-500 bg-amber-50"
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

          {/* Envelope Reduction Selector - Only show for one_time_reduction */}
          {selectedAction === "one_time_reduction" && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Select envelopes to reduce by ${shortfallAmount.toFixed(2)} total
                </Label>
                <div
                  className={`text-sm font-semibold ${
                    isFullyAllocated
                      ? "text-emerald-600"
                      : remainingToAllocate > 0
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {isFullyAllocated
                    ? "Fully allocated"
                    : remainingToAllocate > 0
                    ? `$${remainingToAllocate.toFixed(2)} remaining`
                    : `$${Math.abs(remainingToAllocate).toFixed(2)} over`}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Suggested: Reduce discretionary envelopes first
              </p>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {groupedEnvelopes.map((group) => (
                  <div key={group.priority} className="space-y-2">
                    <div className={`text-xs font-semibold ${group.color}`}>
                      {priorityEmoji[group.priority]} {group.label}
                    </div>
                    <div className="space-y-1.5">
                      {group.envelopes.map((envelope) => (
                        <div
                          key={envelope.id}
                          className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{envelope.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ${envelope.allocationFromSource.toFixed(2)} allocated
                            </div>
                          </div>
                          <div className="flex items-center gap-1 w-24">
                            <span className="text-xs text-muted-foreground">-$</span>
                            <Input
                              type="number"
                              min="0"
                              max={envelope.allocationFromSource}
                              step="0.01"
                              value={reductions[envelope.id] || ""}
                              onChange={(e) => handleReductionChange(envelope.id, e.target.value)}
                              placeholder="0.00"
                              className="h-7 text-xs text-right px-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {groupedEnvelopes.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No envelopes are allocated from this income source.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (selectedAction === "one_time_reduction" && !isFullyAllocated)}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
