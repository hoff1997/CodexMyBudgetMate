"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlannerFrequency, calculateAnnualFromTarget, calculateDueProgress, calculateRequiredContribution, determineStatus, frequencyOptions } from "@/lib/planner/calculations";
import type { EnvelopeRow } from "@/lib/auth/types";
import { toast } from "sonner";

export type PlannerEnvelope = EnvelopeRow & {
  category_name?: string | null;
};

interface Props {
  initialPayFrequency: PlannerFrequency;
  envelopes: PlannerEnvelope[];
  readOnly?: boolean;
}

interface UpdatePayload {
  id: string;
  target_amount?: number;
  annual_amount?: number;
  pay_cycle_amount?: number;
  frequency?: PlannerFrequency;
  next_payment_due?: string | null;
  notes?: string | null;
}

export function PlannerClient({ initialPayFrequency, envelopes, readOnly = false }: Props) {
  const [payFrequency, setPayFrequency] = useState<PlannerFrequency>(initialPayFrequency);
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
    <div className="space-y-6">
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
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Envelope</th>
              <th className="px-4 py-3">Annual amount</th>
              <th className="px-4 py-3">Per pay</th>
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
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSave(row as any)}
                      disabled={updateMutation.isPending || readOnly}
                    >
                      {readOnly ? "Preview" : "Save"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
