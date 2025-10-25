"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlannerFrequency, frequencyOptions } from "@/lib/planner/calculations";
import { formatCurrency } from "@/lib/finance";

interface Props {
  envelope: SummaryEnvelope | null;
  onClose: () => void;
  onSave: (payload: SummaryEnvelope) => Promise<void> | void;
  planPerPay?: number | null;
  planAnnual?: number | null;
  planFrequency?: PlannerFrequency | null;
}

export function EnvelopeEditSheet({ envelope, onClose, onSave, planPerPay, planAnnual, planFrequency }: Props) {
  const [localEnvelope, setLocalEnvelope] = useState<SummaryEnvelope | null>(envelope);

  useEffect(() => {
    setLocalEnvelope(envelope);
  }, [envelope]);

  if (!localEnvelope) return null;

  const hasPlan = typeof planPerPay === "number" && !Number.isNaN(planPerPay);
  const planFrequencyLabel = planFrequency
    ? (frequencyOptions.find((option) => option.value === planFrequency)?.label ?? "Pay cycle")
    : "Pay cycle";

  return (
    <Dialog.Root open={Boolean(envelope)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col gap-6 bg-background p-6 shadow-lg">
          <div className="space-y-1">
            <Dialog.Title className="text-lg font-semibold text-secondary">Edit envelope</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Quick adjustments sync straight back to the planner. Perfect for topping up or adjusting targets between pays.
            </Dialog.Description>
          </div>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await onSave(localEnvelope);
              onClose();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={localEnvelope.name}
                onChange={(event) =>
                  setLocalEnvelope((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target">Target amount</Label>
                <Input
                  id="target"
                  type="number"
                  step="0.01"
                  value={Number(localEnvelope.target_amount ?? 0)}
                  onChange={(event) =>
                    setLocalEnvelope((prev) =>
                      prev ? { ...prev, target_amount: Number(event.target.value) } : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perpay">Per pay amount</Label>
                <Input
                  id="perpay"
                  type="number"
                  step="0.01"
                  value={Number(localEnvelope.pay_cycle_amount ?? 0)}
                  onChange={(event) =>
                    setLocalEnvelope((prev) =>
                      prev ? { ...prev, pay_cycle_amount: Number(event.target.value) } : prev,
                    )
                  }
                />
              </div>
            </div>
            {hasPlan ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span>Recurring income plan</span>
                  <span className="text-sm font-semibold text-secondary">
                    {formatCurrency(planPerPay ?? 0)} per {planFrequencyLabel.toLowerCase()}
                  </span>
                </div>
                {typeof planAnnual === "number" ? (
                  <p className="mt-1">
                    ≈ {formatCurrency(planAnnual)} each year allocated to this envelope.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={(localEnvelope.frequency as PlannerFrequency) ?? "monthly"}
                  onChange={(event) =>
                    setLocalEnvelope((prev) =>
                      prev ? { ...prev, frequency: event.target.value as PlannerFrequency } : prev,
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
                <Label htmlFor="due">Next due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={(localEnvelope.next_payment_due ?? localEnvelope.due_date ?? "").slice(0, 10)}
                  onChange={(event) =>
                    setLocalEnvelope((prev) =>
                      prev ? { ...prev, next_payment_due: event.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={localEnvelope.notes ?? ""}
                onChange={(event) =>
                  setLocalEnvelope((prev) =>
                    prev ? { ...prev, notes: event.target.value } : prev,
                  )
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={Boolean(localEnvelope.is_spending)}
                onChange={(event) =>
                  setLocalEnvelope((prev) =>
                    prev ? { ...prev, is_spending: event.target.checked } : prev,
                  )
                }
              />
              Treat as spending account (skip projections)
            </label>
            <div className="mt-auto flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary">
                Save changes
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
