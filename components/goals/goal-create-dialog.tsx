"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GOAL_ICONS, GOAL_TYPE_LABELS } from "@/lib/types/goals";
import type { GoalType } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { toast } from "sonner";
import { calculateRequiredContribution } from "@/lib/planner/calculations";

type CategoryOption = { id: string; name: string };

type FormState = {
  name: string;
  icon: string;
  goalType: GoalType;
  targetAmount: string;
  targetDate: string;
  categoryId: string;
  frequency: string;
  payCycleAmount: string;
  openingBalance: string;
  notes: string;
  interestRate: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  icon: GOAL_ICONS[0],
  goalType: "savings",
  targetAmount: "0.00",
  targetDate: "",
  categoryId: "",
  frequency: "monthly",
  payCycleAmount: "0.00",
  openingBalance: "0.00",
  interestRate: "0.00",
  notes: "",
};

export function GoalCreateDialog({
  open,
  onOpenChange,
  categories = [],
  onCreated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  categories?: CategoryOption[];
  onCreated?: () => void;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const iconOptions = useMemo(() => {
    if (!form.icon) return GOAL_ICONS;
    if (GOAL_ICONS.includes(form.icon)) {
      return GOAL_ICONS;
    }
    return [form.icon, ...GOAL_ICONS.filter((icon) => icon !== form.icon)];
  }, [form.icon]);

  const targetAmountNumber = parseFloat(form.targetAmount || "0") || 0;
  const openingBalanceNumber = parseFloat(form.openingBalance || "0") || 0;
  const remainingAmount = Math.max(0, targetAmountNumber - openingBalanceNumber);

  // Calculate suggested contribution if target date is set
  let suggestedContribution = 0;
  if (form.targetDate && remainingAmount > 0) {
    const today = new Date();
    const targetDate = new Date(form.targetDate);
    const monthsRemaining = Math.max(
      1,
      Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    const monthlyNeeded = remainingAmount / monthsRemaining;
    suggestedContribution = calculateRequiredContribution(monthlyNeeded * 12, "monthly");
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Goal name is required");
      return;
    }

    if (targetAmountNumber <= 0) {
      toast.error("Target amount must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const payCycleAmount = parseFloat(form.payCycleAmount || "0") || 0;

      const response = await fetch("/api/envelopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          categoryId: form.categoryId || undefined,
          targetAmount: targetAmountNumber,
          payCycleAmount,
          frequency: form.frequency,
          openingBalance: openingBalanceNumber,
          notes: form.notes.trim() || undefined,
          icon: form.icon,
          // Goal-specific fields
          isGoal: true,
          goalType: form.goalType,
          goalTargetDate: form.targetDate || undefined,
          interestRate: form.goalType === "debt_payoff" ? parseFloat(form.interestRate) || undefined : undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to create goal" }));
        throw new Error(payload.error ?? "Unable to create goal");
      }

      toast.success("Goal created");
      onCreated?.();
      onOpenChange(false);
      setForm(DEFAULT_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create goal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setForm(DEFAULT_FORM);
    }
    onOpenChange(value);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl border border-border/60 bg-background shadow-2xl focus:outline-none">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-6 py-5">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-secondary">Create New Goal</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Set up a savings goal to track your progress and stay motivated.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/50 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-name" className="text-sm font-medium text-secondary">
                    Goal Name
                  </Label>
                  <Input
                    id="goal-name"
                    placeholder="e.g., Emergency Fund, New Car, Vacation"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-secondary">Icon</Label>
                  <div className="grid grid-cols-10 gap-2">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition",
                          form.icon === icon
                            ? "border-sky-600 bg-sky-50 text-sky-600 shadow-sm"
                            : "border-border bg-background hover:border-sky-400 hover:bg-sky-50",
                        )}
                        onClick={() => setForm((prev) => ({ ...prev, icon }))}
                        aria-label={`Select ${icon}`}
                      >
                        <span>{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-type" className="text-sm font-medium text-secondary">
                    Goal Type
                  </Label>
                  <select
                    id="goal-type"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={form.goalType}
                    onChange={(event) => setForm((prev) => ({ ...prev, goalType: event.target.value as GoalType }))}
                    required
                  >
                    {Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-category" className="text-sm font-medium text-secondary">
                    Category (Optional)
                  </Label>
                  <select
                    id="goal-category"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={form.categoryId}
                    onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  >
                    <option value="">Select a category (optional)</option>
                    {categories.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="target-amount" className="text-sm font-medium text-secondary">
                    Target Amount
                  </Label>
                  <Input
                    id="target-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.targetAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
                    required
                  />
                </div>

                {form.goalType === "debt_payoff" && (
                  <div className="space-y-2">
                    <Label htmlFor="interest-rate" className="text-sm font-medium text-secondary">
                      Interest Rate (APR %)
                    </Label>
                    <Input
                      id="interest-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      value={form.interestRate}
                      onChange={(event) => setForm((prev) => ({ ...prev, interestRate: event.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the annual percentage rate (e.g., 19.95 for 19.95%)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="target-date" className="text-sm font-medium text-secondary">
                    Target Date (Optional)
                  </Label>
                  <Input
                    id="target-date"
                    type="date"
                    value={form.targetDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetDate: event.target.value }))}
                  />
                  {suggestedContribution > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Suggested contribution: ${suggestedContribution.toFixed(2)} per pay cycle
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opening-balance" className="text-sm font-medium text-secondary">
                    Starting Balance
                  </Label>
                  <Input
                    id="opening-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.openingBalance}
                    onChange={(event) => setForm((prev) => ({ ...prev, openingBalance: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-cycle-amount" className="text-sm font-medium text-secondary">
                    Pay Cycle Contribution
                  </Label>
                  <Input
                    id="pay-cycle-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.payCycleAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, payCycleAmount: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-sm font-medium text-secondary">
                    Contribution Frequency
                  </Label>
                  <select
                    id="frequency"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={form.frequency}
                    onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value }))}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-notes" className="text-sm font-medium text-secondary">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="goal-notes"
                    placeholder="Add any notes or motivation for this goal..."
                    rows={3}
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={submitting} className="bg-[#7A9E9A] hover:bg-[#5A7E7A]">
                {submitting ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
