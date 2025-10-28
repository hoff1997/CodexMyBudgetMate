"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlannerFrequency, calculateAnnualFromTarget, calculateDueProgress, calculateRequiredContribution, determineStatus, frequencyOptions } from "@/lib/planner/calculations";
import type { EnvelopeRow } from "@/lib/auth/types";
import type { PayPlanSummary } from "@/lib/types/pay-plan";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { Info } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeEditSheet } from "@/components/layout/envelopes/envelope-edit-sheet";

export type PlannerEnvelope = EnvelopeRow & {
  category_name?: string | null;
};

interface Props {
  initialPayFrequency: PlannerFrequency;
  envelopes: PlannerEnvelope[];
  readOnly?: boolean;
  payPlan?: PayPlanSummary | null;
}

interface UpdatePayload {
  id: string;
  name?: string;
  category_id?: string | null;
  target_amount?: number;
  annual_amount?: number;
  pay_cycle_amount?: number;
  frequency?: PlannerFrequency;
  due_date?: string | null;
  next_payment_due?: string | null;
  notes?: string | null;
  icon?: string | null;
  is_spending?: boolean;
  opening_balance?: number;
  current_amount?: number;
}

function frequencyLabel(value: PlannerFrequency) {
  const option = frequencyOptions.find((item) => item.value === value);
  return option ? option.label.toLowerCase() : value;
}

export function PlannerClient({ initialPayFrequency, envelopes, readOnly = false, payPlan = null }: Props) {
  const [payFrequency, setPayFrequency] = useState<PlannerFrequency>(initialPayFrequency);
  const [editEnvelope, setEditEnvelope] = useState<SummaryEnvelope | null>(null);
  const [rows, setRows] = useState(() =>
    envelopes.map((env) => ({
      ...env,
      target_amount: Number(env.target_amount ?? 0),
      annual_amount: Number(env.annual_amount ?? calculateAnnualFromTarget(Number(env.target_amount ?? 0), (env.frequency as PlannerFrequency) ?? "monthly")),
      pay_cycle_amount: Number(env.pay_cycle_amount ?? 0),
      opening_balance: Number(env.opening_balance ?? 0),
      current_amount: Number(env.current_amount ?? 0),
    })),
  );

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      if (readOnly) return { ok: true };
      const response = await fetch(`/api/envelopes/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error((await response.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to update envelope");
      }
      return response.json();
    },
    onSuccess: () => {
      if (!readOnly) {
        toast.success("Envelope updated");
      }
    },
    onError: (error: unknown) => {
      if (!readOnly) {
        toast.error(error instanceof Error ? error.message : "Failed to update envelope");
      }
    },
  });

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.target += Number(row.target_amount ?? 0);
        acc.annual += Number(row.annual_amount ?? 0);
        acc.current += Number(row.current_amount ?? 0);
        acc.payCycle += Number(row.pay_cycle_amount ?? 0);
        return acc;
      },
      { target: 0, annual: 0, current: 0, payCycle: 0 },
    );
  }, [rows]);

  const planByEnvelope = useMemo(() => {
    if (!payPlan) return new Map<string, { perPay: number; annual: number }>();
    return new Map(
      payPlan.envelopes.map((entry) => [
        entry.envelopeId,
        { perPay: entry.perPayAmount, annual: entry.annualAmount },
      ]),
    );
  }, [payPlan]);

  const planTotals = payPlan?.totals ?? null;
  const planFrequencyLabel = payPlan ? frequencyLabel(payPlan.primaryFrequency) : null;
  const [guideOpen, setGuideOpen] = useState(false);

  const toSummaryEnvelope = (row: PlannerEnvelope & Record<string, any>): SummaryEnvelope => ({
    id: row.id,
    name: row.name,
    category_id: row.category_id ?? null,
    category_name: row.category_name ?? null,
    target_amount: Number(row.target_amount ?? 0),
    annual_amount: Number(row.annual_amount ?? 0),
    pay_cycle_amount: Number(row.pay_cycle_amount ?? 0),
    opening_balance: Number(row.opening_balance ?? 0),
    current_amount: Number(row.current_amount ?? 0),
    due_date: row.due_date ?? null,
    frequency: row.frequency ?? null,
    next_payment_due: row.next_payment_due ?? null,
    notes: row.notes ?? null,
    icon: row.icon ?? null,
    sort_order: (row.sort_order as number) ?? null,
    is_spending: row.is_spending ?? null,
  });

  function handleFieldChange(id: string, field: keyof UpdatePayload, value: number | string | null) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function recalcRow(row: PlannerEnvelope & Record<string, any>) {
    const annual = Number(row.annual_amount ?? calculateAnnualFromTarget(Number(row.target_amount ?? 0), (row.frequency as PlannerFrequency) ?? "monthly"));
    const perPay = calculateRequiredContribution(annual, payFrequency);
    const expected = Number(row.opening_balance ?? 0) + perPay;
    const status = determineStatus(Number(row.current_amount ?? 0), expected);
    return { annual, perPay, expected, status };
  }

  async function handleSave(row: PlannerEnvelope & Record<string, any>) {
    const { perPay } = recalcRow(row as any);
    const payload: UpdatePayload = {
      id: row.id,
      target_amount: Number(row.target_amount ?? 0) || 0,
      annual_amount: Number(row.annual_amount ?? 0) || 0,
      pay_cycle_amount: perPay,
      frequency: (row.frequency as PlannerFrequency) ?? "monthly",
      next_payment_due: row.next_payment_due ?? null,
      notes: (row.notes as string | null) ?? null,
    };
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              ...payload,
              pay_cycle_amount: perPay,
            }
          : item,
      ),
    );
    if (!readOnly) {
      updateMutation.mutate(payload);
    } else {
      toast.info("Sign in to sync changes to Supabase.");
    }
  }

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-secondary">Envelope planning</h1>
            <p className="text-sm text-muted-foreground">
              Keep your contributions aligned with the next due dates and expected balances before payday.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex items-center gap-2 self-start md:self-auto"
            onClick={() => setGuideOpen(true)}
          >
            <Info className="h-4 w-4" />
            <span>Feature guide</span>
          </Button>
        </header>
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-muted/10 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Annual planned</p>
            <p className="text-2xl font-semibold text-secondary">${totals.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        <div className="rounded-xl border bg-muted/10 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Per pay required</p>
          <p className="text-2xl font-semibold text-secondary">
            ${calculateRequiredContribution(totals.annual, payFrequency).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/10 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Current balance</p>
          <p className="text-2xl font-semibold text-secondary">${totals.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pay frequency</p>
          <select
            className="h-9 w-full rounded-md border px-3 text-sm"
            value={payFrequency}
            onChange={(event) => setPayFrequency(event.target.value as PlannerFrequency)}
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>
      {planTotals ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Recurring income plan
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Budgeted per pay</p>
              <p className="text-xl font-semibold text-secondary">
                {formatCurrency(planTotals.perPayAllocated)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Income per pay</p>
              <p className="text-xl font-semibold text-secondary">
                {formatCurrency(planTotals.perPayIncome)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Surplus / shortfall</p>
              <p
                className={`text-xl font-semibold ${
                  planTotals.perPaySurplus >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatCurrency(planTotals.perPaySurplus)}
              </p>
            </div>
          </div>
          {planFrequencyLabel ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Calculated from your recurring income split on a {planFrequencyLabel} cycle.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Envelope</th>
              <th className="px-4 py-3">Annual amount</th>
              <th className="px-4 py-3">Per pay</th>
              <th className="px-4 py-3">Plan per pay</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next due</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((row) => {
              const { annual, perPay, expected, status } = recalcRow(row as any);
              const due = calculateDueProgress(row.next_payment_due ?? row.due_date);
              const contributionDelta = Number(row.current_amount ?? 0) - expected;
              const storedPerPay = Number(row.pay_cycle_amount ?? 0);
              const planEntry = planByEnvelope.get(row.id);
              const planPerPay = planEntry?.perPay ?? 0;
              const planAnnual = planEntry?.annual ?? 0;
              const planDelta = planEntry ? storedPerPay - planPerPay : null;
              return (
                <tr key={row.id} className="text-sm">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-secondary">{row.name}</div>
                    {row.category_name ? (
                      <p className="text-xs text-muted-foreground">{row.category_name}</p>
                    ) : null}
                    <textarea
                      className="mt-2 w-full rounded-md border px-2 py-1 text-xs"
                      rows={2}
                      placeholder="Notes"
                      value={row.notes ?? ""}
                      onChange={(event) => handleFieldChange(row.id, "notes", event.target.value)}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.annual_amount ?? annual}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleFieldChange(row.id, "annual_amount", Number(event.target.value))
                      }
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    <div className="font-medium text-secondary">
                      ${perPay.toFixed(2)}
                    </div>
                    <p className="text-xs">
                      {contributionDelta > 0
                        ? `Over by $${contributionDelta.toFixed(2)}`
                        : contributionDelta < 0
                        ? `Under by $${Math.abs(contributionDelta).toFixed(2)}`
                        : "On target"}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {planEntry ? (
                      <div className="space-y-1">
                        <div className="font-medium text-secondary">
                          {formatCurrency(planPerPay)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(planAnnual)} / yr
                        </p>
                        {planDelta !== null && Math.abs(planDelta) > 0.01 ? (
                          <p
                            className={`text-xs ${
                              planDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {planDelta >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(planDelta))}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.target_amount ?? 0}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleFieldChange(row.id, "target_amount", Number(event.target.value))
                      }
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-secondary">
                    ${Number(row.current_amount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 align-top capitalize">
                    <span
                      className={
                        status === "on-track"
                          ? "text-emerald-600"
                          : status === "over"
                          ? "text-sky-600"
                          : "text-rose-600"
                      }
                    >
                      {status.replace("-", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top space-y-1">
                    <Input
                      type="date"
                      value={(row.next_payment_due ?? row.due_date ?? "").slice(0, 10)}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleFieldChange(row.id, "next_payment_due", event.target.value)
                      }
                    />
                    <select
                      className="h-8 w-full rounded-md border px-2 text-xs"
                      value={(row.frequency as PlannerFrequency) ?? "monthly"}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleFieldChange(row.id, "frequency", event.target.value as PlannerFrequency)
                      }
                    >
                      {frequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">{due.formatted ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Progress value={due.progress} />
                    <p className="text-xs text-muted-foreground mt-1">{due.label}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditEnvelope(toSummaryEnvelope(row as any))}
                        disabled={readOnly}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSave(row as any)}
                        disabled={updateMutation.isPending || readOnly}
                      >
                        {readOnly ? "Preview" : "Save"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      <EnvelopeEditSheet
        envelope={editEnvelope}
        planPerPay={editEnvelope ? planByEnvelope.get(editEnvelope.id)?.perPay : undefined}
        planAnnual={editEnvelope ? planByEnvelope.get(editEnvelope.id)?.annual : undefined}
        planFrequency={payPlan?.primaryFrequency}
        onClose={() => setEditEnvelope(null)}
        onSave={async (updated) => {
          setRows((prev) =>
            prev.map((row) =>
              row.id === updated.id
                ? {
                    ...row,
                    name: updated.name,
                    category_id: updated.category_id ?? null,
                    category_name: updated.category_name ?? row.category_name ?? null,
                    target_amount: Number(updated.target_amount ?? 0),
                    annual_amount: Number(updated.annual_amount ?? 0),
                    pay_cycle_amount: Number(updated.pay_cycle_amount ?? 0),
                    due_date: updated.due_date ?? null,
                    next_payment_due: updated.next_payment_due ?? null,
                    frequency: updated.frequency ?? row.frequency,
                    notes: updated.notes ?? null,
                    icon: updated.icon ?? null,
                    is_spending:
                      updated.is_spending !== undefined && updated.is_spending !== null
                        ? updated.is_spending
                        : row.is_spending ?? null,
                  }
                : row,
            ),
          );

          const isSpending =
            updated.is_spending !== undefined && updated.is_spending !== null
              ? Boolean(updated.is_spending)
              : undefined;

          updateMutation.mutate({
            id: updated.id,
            name: updated.name,
            category_id: updated.category_id ?? null,
            target_amount: Number(updated.target_amount ?? 0) || 0,
            annual_amount: Number(updated.annual_amount ?? 0) || 0,
            pay_cycle_amount: Number(updated.pay_cycle_amount ?? 0) || 0,
            frequency: (updated.frequency as PlannerFrequency) ?? "monthly",
            due_date: updated.due_date ?? null,
            next_payment_due: updated.next_payment_due ?? null,
            notes: updated.notes ?? null,
            icon: updated.icon ?? null,
            is_spending: isSpending,
          });
          setEditEnvelope(null);
        }}
      />
      <PlannerFeatureGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}

function PlannerFeatureGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-0 z-50 mx-auto flex max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl md:top-12 md:h-[80vh]">
          <Dialog.Title className="text-xl font-semibold text-secondary">Planner feature guide</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Use this checklist to ensure the planner keeps parity with the recurring income tools and envelope manager.
          </Dialog.Description>

          <div className="space-y-6 text-sm text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Pay cycle controls</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Pay frequency selector updates every row&rsquo;s required contribution instantly.</li>
                <li>Metric cards reflect annual funding, per-pay requirement, and current balances.</li>
                <li>Guide button links back to this reference panel.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Envelope table</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Columns cover target, per-pay requirement, plan comparison, due dates, and status.</li>
                <li>Save action persists recalculated per-pay contributions to Supabase.</li>
                <li>Edit opens the full envelope sheet so icons, categories, and notes stay in sync.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Plan alignment</h2>
              <ul className="list-disc space-y-1 pl-4">
                <li>Plan per-pay column compares live planner data with recurring income splits.</li>
                <li>Positive values highlight surplus, negative values highlight deficits needing action.</li>
                <li>Editing an envelope keeps the planner, envelope manager, and recurring income views consistent.</li>
              </ul>
            </section>
          </div>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
