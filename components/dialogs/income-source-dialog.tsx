"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { IncomeSource } from "@/lib/types/unified-envelope";

interface IncomeSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  incomeSource?: IncomeSource;
  onSuccess: (source: IncomeSource) => void;
}

type FrequencyOption = "weekly" | "fortnightly" | "monthly";

export function IncomeSourceDialog({
  open,
  onOpenChange,
  mode,
  incomeSource,
  onSuccess,
}: IncomeSourceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<FrequencyOption>("fortnightly");
  const [nextPayDate, setNextPayDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens or incomeSource changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && incomeSource) {
        setName(incomeSource.name);
        setAmount(incomeSource.rawAmount?.toString() || incomeSource.amount.toString());
        setFrequency(incomeSource.frequency as FrequencyOption);
        setNextPayDate(incomeSource.nextPayDate || "");
        setIsActive(incomeSource.isActive !== false);
      } else {
        // Reset for add mode
        setName("");
        setAmount("");
        setFrequency("fortnightly");
        setNextPayDate("");
        setIsActive(true);
      }
    }
  }, [open, mode, incomeSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error("Please enter an income source name");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === "edit" && incomeSource
        ? `/api/income-sources/${incomeSource.id}`
        : "/api/income-sources";

      const method = mode === "edit" ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: name.trim(),
        typical_amount: parsedAmount,
        pay_cycle: frequency,
        is_active: isActive,
      };

      // Only include next_pay_date if provided
      if (nextPayDate) {
        body.next_pay_date = nextPayDate;
      }

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${mode} income source`);
      }

      const savedSource = await response.json();

      toast.success(
        mode === "edit"
          ? "Income source updated"
          : "Income source added"
      );

      // Construct IncomeSource object for callback
      const resultSource: IncomeSource = {
        id: savedSource.id,
        name: savedSource.name,
        amount: parsedAmount, // Will be normalized by parent
        rawAmount: parsedAmount,
        frequency: savedSource.pay_cycle,
        nextPayDate: savedSource.next_pay_date || undefined,
        startDate: savedSource.start_date || undefined,
        endDate: savedSource.end_date || undefined,
        isActive: savedSource.is_active !== false,
      };

      onSuccess(resultSource);
      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${mode}ing income source:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} income source`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit Income Source" : "Add Income Source"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update the details for this income source."
                : "Add a new income source to track in your budget."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="income-name">Name</Label>
              <Input
                id="income-name"
                placeholder="e.g., Primary Job, Side Hustle"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="income-amount">Amount per Pay</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="income-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="income-frequency">Pay Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value) => setFrequency(value as FrequencyOption)}
                disabled={isLoading}
              >
                <SelectTrigger id="income-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next Pay Date */}
            <div className="space-y-2">
              <Label htmlFor="income-next-date">Next Pay Date (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="income-next-date"
                  type="date"
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                  disabled={isLoading}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When you expect to receive this income next
              </p>
            </div>

            {/* Active Toggle (only in edit mode) */}
            {mode === "edit" && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="income-active" className="cursor-pointer">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive income sources won&apos;t appear in allocations
                  </p>
                </div>
                <input
                  id="income-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 cursor-pointer"
                />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save Changes" : "Add Income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
