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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { IncomeSource } from "@/lib/types/unified-envelope";

interface EndIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeSource: IncomeSource;
  onEndCompletely: (incomeSourceId: string, endDate: string) => Promise<void>;
  onReplace: (incomeSourceId: string, endDate: string) => Promise<void>;
}

export function EndIncomeDialog({
  open,
  onOpenChange,
  incomeSource,
  onEndCompletely,
  onReplace,
}: EndIncomeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"replace" | "end">("replace");
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const handleConfirm = async () => {
    if (!endDate) {
      toast.error("Please select an end date");
      return;
    }

    setIsLoading(true);
    try {
      if (selectedAction === "replace") {
        await onReplace(incomeSource.id, endDate);
        toast.success("Income source ended - add your new income source");
      } else {
        await onEndCompletely(incomeSource.id, endDate);
        toast.success("Income source ended");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error ending income source:", error);
      toast.error("Failed to end income source");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            End Income Stream: {incomeSource.name}
          </DialogTitle>
          <DialogDescription>
            Configure how this income stream should end.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">When does this income end?</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">What&apos;s happening?</Label>
            <RadioGroup
              value={selectedAction}
              onValueChange={(value) => setSelectedAction(value as "replace" | "end")}
              className="space-y-2"
            >
              {/* Replace Option */}
              <div
                className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedAction === "replace"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSelectedAction("replace")}
              >
                <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="replace" className="cursor-pointer font-medium">
                    I&apos;m replacing it with a new income
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create new income source (allocations can be transferred)
                  </p>
                </div>
              </div>

              {/* End Completely Option */}
              <div
                className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedAction === "end"
                    ? "border-amber-500 bg-amber-50"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSelectedAction("end")}
              >
                <RadioGroupItem value="end" id="end" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="end" className="cursor-pointer font-medium">
                    This income is ending completely
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You&apos;ll need to rebalance your budget
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Warning for ending completely */}
          {selectedAction === "end" && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Warning:</strong> Ending this income without a replacement will create a
                budget shortfall of ${incomeSource.amount.toFixed(2)} per cycle. You&apos;ll need
                to rebalance your envelope allocations in the Budget Manager.
              </AlertDescription>
            </Alert>
          )}

          {/* Info for replacing */}
          {selectedAction === "replace" && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <ArrowRight className="h-4 w-4" />
                <span>
                  After clicking &quot;End Income&quot;, you&apos;ll be prompted to add your new
                  income source.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={selectedAction === "end" ? "destructive" : "default"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            End Income
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
