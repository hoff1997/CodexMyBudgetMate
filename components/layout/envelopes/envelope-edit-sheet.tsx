"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PlannerFrequency,
  calculateAnnualFromTarget,
  calculateRequiredContribution,
  frequencyOptions,
} from "@/lib/planner/calculations";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/cn";
import { add } from "date-fns";
import { CalendarIcon, RefreshCcw, X } from "lucide-react";

type CategoryOption = { id: string; name: string };

const DEFAULT_ICON_OPTIONS = [
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

interface Props {
  envelope: SummaryEnvelope | null;
  onClose: () => void;
  onSave: (payload: SummaryEnvelope) => Promise<void> | void;
  categories?: CategoryOption[];
  planPerPay?: number | null;
  planAnnual?: number | null;
  planFrequency?: PlannerFrequency | null;
  iconOptions?: readonly string[];
}

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

const FREQUENCY_FALLBACK: PlannerFrequency = "monthly";

function formatNumericInput(value: unknown, decimals = 2) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return "".padEnd(decimals ? decimals + 2 : 0, "0");
  return numeric.toFixed(decimals);
}

function nextDueDate(frequency: PlannerFrequency, baseDate?: string) {
  const reference = baseDate ? new Date(baseDate) : new Date();
  switch (frequency) {
    case "weekly":
      return add(reference, { days: 7 });
    case "fortnightly":
      return add(reference, { days: 14 });
    case "monthly":
      return add(reference, { months: 1 });
    case "quarterly":
      return add(reference, { months: 3 });
    case "annually":
      return add(reference, { years: 1 });
    case "none":
    default:
      return reference;
  }
}

export function EnvelopeEditSheet({
  envelope,
  onClose,
  onSave,
  categories,
  planPerPay,
  planAnnual,
  planFrequency,
  iconOptions = DEFAULT_ICON_OPTIONS,
}: Props) {
  const [form, setForm] = useState<FormState | null>(null);

  const iconChoices = useMemo(() => {
    if (!form || !form.icon) return iconOptions;
    if (iconOptions.includes(form.icon)) return iconOptions;
    return [form.icon, ...iconOptions.filter((icon) => icon !== form.icon)];
  }, [iconOptions, form]);

  useEffect(() => {
    if (!envelope) {
      setForm(null);
      return;
    }
    setForm({
      name: envelope.name ?? "",
      icon: envelope.icon ?? iconOptions[0] ?? "💰",
      categoryId: envelope.category_id ?? "",
      openingBalance: formatNumericInput(envelope.opening_balance ?? 0),
      notes: envelope.notes ?? "",
      isSpending: Boolean(envelope.is_spending),
      dueAmount: formatNumericInput(envelope.target_amount ?? 0),
      dueFrequency: (envelope.frequency as PlannerFrequency) ?? FREQUENCY_FALLBACK,
      dueDate: (envelope.next_payment_due ?? envelope.due_date ?? "").slice(0, 10),
    });
  }, [envelope, iconOptions]);

  const title = envelope ? "Edit Envelope" : "Add New Envelope";
  const submitLabel = envelope ? "Save Changes" : "Create Envelope";

  const categoryOptions = useMemo(() => {
    if (categories && categories.length) return categories;
    if (envelope?.category_id && envelope?.category_name) {
      return [{ id: envelope.category_id, name: envelope.category_name }];
    }
    return [];
  }, [categories, envelope]);

  const planFrequencyLabel = planFrequency
    ? frequencyOptions.find((option) => option.value === planFrequency)?.label ?? "Pay cycle"
    : null;

  if (!envelope || !form) return null;

  const dueAmountNumber = parseFloat(form.dueAmount || "0") || 0;
  const annualFromTarget = calculateAnnualFromTarget(dueAmountNumber, form.dueFrequency);
  const requiredPerPay = calculateRequiredContribution(annualFromTarget, form.dueFrequency);

  return (
    <Dialog.Root open={Boolean(envelope)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border/60 bg-background p-6 shadow-2xl focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-secondary">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Update envelope details, icons, and scheduling so projections stay accurate.
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

          <form
            className="mt-6 space-y-6"
            onSubmit={async (event) => {
              event.preventDefault();
              const parsedOpening = parseFloat(form.openingBalance || "0") || 0;
              const dueDateValue = form.dueDate ? form.dueDate : null;
              const categoryName =
                categoryOptions.find((option) => option.id === form.categoryId)?.name ?? null;

              const updated: SummaryEnvelope = {
                ...envelope,
                name: form.name.trim(),
                icon: form.icon,
                category_id: form.categoryId || null,
                category_name: categoryName,
                opening_balance: parsedOpening,
                notes: form.notes.trim() ? form.notes : null,
                is_spending: form.isSpending,
                target_amount: dueAmountNumber,
                annual_amount: annualFromTarget,
                frequency: form.dueFrequency,
                next_payment_due: dueDateValue,
                due_date: dueDateValue,
                pay_cycle_amount:
                  typeof envelope.pay_cycle_amount === "number"
                    ? envelope.pay_cycle_amount
                    : Number(envelope.pay_cycle_amount ?? 0),
              };

              await onSave(updated);
              onClose();
            }}
          >
            <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="envelope-name" className="text-sm font-medium text-secondary">
                  Name
                </Label>
                <Input
                  id="envelope-name"
                  placeholder="Envelope name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => prev && { ...prev, name: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-secondary">Icon</Label>
                <div className="grid grid-cols-10 gap-2">
                  {iconChoices.map((icon) => {
                    const isActive = form.icon === icon;
                    return (
                      <button
                        key={icon}
                        type="button"
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition",
                          isActive
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
                        )}
                        onClick={() => setForm((prev) => prev && { ...prev, icon })}
                        aria-label={`Select ${icon}`}
                      >
                        <span>{icon}</span>
                      </button>
                    );
                  })}
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
                  onChange={(event) =>
                    setForm((prev) => prev && { ...prev, categoryId: event.target.value })
                  }
                >
                  <option value="">Select a category (optional)</option>
                  {categoryOptions.map((option) => (
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
                  onChange={(event) =>
                    setForm((prev) => prev && { ...prev, openingBalance: event.target.value })
                  }
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
                  onChange={(event) =>
                    setForm((prev) => prev && { ...prev, dueAmount: event.target.value })
                  }
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
                    setForm(
                      (prev) =>
                        prev && {
                          ...prev,
                          dueFrequency: event.target.value as PlannerFrequency,
                        },
                    )
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
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="due-date"
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        setForm((prev) => prev && { ...prev, dueDate: event.target.value })
                      }
                      className="pr-10"
                    />
                    <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() =>
                      setForm((prev) => {
                        if (!prev) return prev;
                        const next = nextDueDate(prev.dueFrequency, prev.dueDate).toISOString().slice(0, 10);
                        return { ...prev, dueDate: next };
                      })
                    }
                    title="Auto-calculate next due date"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the refresh button to auto-calculate the next payment date.
                </p>
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
                onChange={(event) => setForm((prev) => prev && { ...prev, notes: event.target.value })}
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <label className="flex items-start gap-3 text-sm text-secondary">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border border-border"
                  checked={form.isSpending}
                  onChange={(event) =>
                    setForm((prev) => prev && { ...prev, isSpending: event.target.checked })
                  }
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
                  <span className="block text-xs">
                    Show this envelope in the dashboard monitoring widget (coming soon).
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground md:grid-cols-2">
                <div>
                  <p className="uppercase tracking-wide text-xs text-muted-foreground">Required per pay</p>
                  <p className="text-lg font-semibold text-secondary">
                    {formatCurrency(requiredPerPay)} / {form.dueFrequency}
                  </p>
                </div>
                {planPerPay !== undefined && planPerPay !== null ? (
                  <div>
                    <p className="uppercase tracking-wide text-xs text-muted-foreground">Plan alignment</p>
                    <p className="text-lg font-semibold text-secondary">
                      {formatCurrency(planPerPay)} {planFrequencyLabel ? `per ${planFrequencyLabel.toLowerCase()}` : ""}
                    </p>
                    {typeof planAnnual === "number" ? (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatCurrency(planAnnual)} allocated each year.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                {submitLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
