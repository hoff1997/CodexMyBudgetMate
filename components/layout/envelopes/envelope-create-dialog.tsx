"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlannerFrequency, calculateAnnualFromTarget, calculateRequiredContribution, frequencyOptions } from "@/lib/planner/calculations";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { CalendarIcon, RefreshCcw, X } from "lucide-react";
import { add } from "date-fns";
import { toast } from "sonner";

const ICONS = [
  "💰",
  "🏠",
  "🚗",
  "🛒",
  "⚡️",
  "🍔",
  "🧺",
  "🎓",
  "💳",
  "🛠️",
  "📦",
  "✈️",
  "🧾",
  "🎁",
  "🪙",
  "🧸",
  "🏖️",
  "🛡️",
  "🌟",
  "📚",
] as const;

type CategoryOption = { id: string; name: string };

type FormState = {
  name: string;
  icon: string;
  categoryId: string;
  openingBalance: string;
  notes: string;
  isSpending: boolean;
  dueAmount: string;
  dueFrequency: PlannerFrequency;
  dueDate: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  icon: ICONS[0],
  categoryId: "",
  openingBalance: "0.00",
  notes: "",
  isSpending: false,
  dueAmount: "0.00",
  dueFrequency: "monthly",
  dueDate: "",
};

function calculateNextDue(frequency: PlannerFrequency, base?: string) {
  const ref = base ? new Date(base) : new Date();
  switch (frequency) {
    case "weekly":
      return add(ref, { days: 7 });
    case "fortnightly":
      return add(ref, { days: 14 });
    case "monthly":
      return add(ref, { months: 1 });
    case "quarterly":
      return add(ref, { months: 3 });
    case "annually":
      return add(ref, { years: 1 });
    case "none":
    default:
      return ref;
  }
}

export function EnvelopeCreateDialog({
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
    if (!form.icon) return ICONS;
    if (ICONS.includes(form.icon as (typeof ICONS)[number])) {
      return ICONS;
    }
    return [form.icon, ...ICONS.filter((icon) => icon !== form.icon)];
  }, [form.icon]);

  const dueAmountNumber = parseFloat(form.dueAmount || "0") || 0;
  const annualAmount = calculateAnnualFromTarget(dueAmountNumber, form.dueFrequency);
  const perPayAmount = calculateRequiredContribution(annualAmount, form.dueFrequency);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Envelope name is required");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/envelopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          categoryId: form.categoryId || undefined,
          targetAmount: dueAmountNumber,
          payCycleAmount: perPayAmount,
          frequency: form.dueFrequency,
          nextDue: form.dueDate || undefined,
          openingBalance: parseFloat(form.openingBalance || "0") || 0,
          notes: form.notes.trim() || undefined,
          icon: form.icon,
          isSpending: form.isSpending,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to create envelope" }));
        throw new Error(payload.error ?? "Unable to create envelope");
      }

      toast.success("Envelope created");
      onCreated?.();
      onOpenChange(false);
      setForm(DEFAULT_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create envelope");
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border/60 bg-background p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-secondary">Add New Envelope</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Configure the envelope details so it aligns with your pay cycle calculations.
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

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="envelope-name" className="text-sm font-medium text-secondary">
                  Name
                </Label>
                <Input
                  id="envelope-name"
                  placeholder="Envelope name"
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
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
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
                <Label htmlFor="envelope-category" className="text-sm font-medium text-secondary">
                  Category
                </Label>
                <select
                  id="envelope-category"
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opening-balance" className="text-sm font-medium text-secondary">
                  Opening Balance
                </Label>
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.openingBalance}
                  onChange={(event) => setForm((prev) => ({ ...prev, openingBalance: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-amount" className="text-sm font-medium text-secondary">
                  Due Amount
                </Label>
                <Input
                  id="due-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.dueAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, dueAmount: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="due-frequency" className="text-sm font-medium text-secondary">
                  Due Frequency
                </Label>
                <select
                  id="due-frequency"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={form.dueFrequency}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dueFrequency: event.target.value as PlannerFrequency,
                    }))
                  }
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-sm font-medium text-secondary">
                  Due Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium",
                        !form.dueDate && "text-muted-foreground",
                      )}
                    >
                      {form.dueDate ? form.dueDate : "Pick a date"}
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" sideOffset={8}>
                    <Calendar
                      mode="single"
                      selected={form.dueDate ? new Date(form.dueDate) : undefined}
                      onSelect={(date) =>
                        setForm((prev) => ({ ...prev, dueDate: date ? date.toISOString().slice(0, 10) : "" }))
                      }
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      const next = calculateNextDue(form.dueFrequency, form.dueDate).toISOString().slice(0, 10);
                      setForm((prev) => ({ ...prev, dueDate: next }));
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <span className="text-xs">Use refresh to auto-calculate the next payment date.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="envelope-notes" className="text-sm font-medium text-secondary">
                Notes (Optional)
              </Label>
              <Textarea
                id="envelope-notes"
                rows={3}
                placeholder="Add any notes about this envelope..."
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <label className="flex items-start gap-3 text-sm text-secondary">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border border-border"
                  checked={form.isSpending}
                  onChange={(event) => setForm((prev) => ({ ...prev, isSpending: event.target.checked }))}
                />
                <span>
                  <span className="font-medium">Spending Account</span>{" "}
                  <span className="text-muted-foreground">(No predicted spend budget)</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-muted-foreground opacity-60">
                <input type="checkbox" className="mt-1 h-4 w-4" disabled />
                <span>
                  <span className="font-medium text-secondary">Monitor on Dashboard</span>
                  <span className="block text-xs">Show this envelope in the dashboard monitoring widget.</span>
                </span>
              </label>
            </div>

            <div className="grid gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground md:grid-cols-2">
              <div>
                <p className="uppercase tracking-wide text-xs text-muted-foreground">Required per pay</p>
                <p className="text-lg font-semibold text-secondary">
                  {formatCurrency(perPayAmount)} / {form.dueFrequency}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-xs text-muted-foreground">Annual funding</p>
                <p className="text-lg font-semibold text-secondary">{formatCurrency(annualAmount)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={submitting}>
                {submitting && <span className="h-2 w-2 animate-ping rounded-full bg-primary-foreground" />}
                Create Envelope
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

