"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { PlannerFrequency, calculateAnnualFromTarget, calculateDueProgress, calculateRequiredContribution, determineStatus, frequencyOptions } from "@/lib/planner/calculations";
import type { EnvelopeRow } from "@/lib/auth/types";
import type { PayPlanSummary } from "@/lib/types/pay-plan";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeftRight, CalendarIcon, ChevronLeft, Download, FileText, Plus, PlusCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeEditSheet } from "@/components/layout/envelopes/envelope-edit-sheet";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";

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
  const router = useRouter();
  const [payFrequency, setPayFrequency] = useState<PlannerFrequency>(initialPayFrequency);
  const [payCycleStartDate, setPayCycleStartDate] = useState<Date | null>(null);
  const [editEnvelope, setEditEnvelope] = useState<SummaryEnvelope | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
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
  const payFrequencyLabel =
    frequencyOptions.find((option) => option.value === payFrequency)?.label ?? "Pay";
  const requiredColumnLabel = `Required ${payFrequencyLabel}`;

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

  const categoryOptions = useMemo(() => {
    const lookup = new Map<string, string>();
    rows.forEach((row) => {
      if (row.category_id) {
        const name = row.category_name ?? "Uncategorised";
        lookup.set(String(row.category_id), name);
      }
    });
    return Array.from(lookup.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);
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
      prev.map((row) => {
        if (row.id !== id) return row;
        const next: any = { ...row, [field]: value };

        if (field === "target_amount") {
          const numericTarget = Number(value ?? 0);
          next.target_amount = numericTarget;
          next.annual_amount = calculateAnnualFromTarget(
            numericTarget,
            (next.frequency as PlannerFrequency) ?? "monthly",
          );
        }

        if (field === "frequency") {
          const frequencyValue = (value as PlannerFrequency) ?? "monthly";
          next.frequency = frequencyValue;
          const numericTarget = Number(next.target_amount ?? 0);
          next.annual_amount = calculateAnnualFromTarget(numericTarget, frequencyValue);
        }

        return next;
      }),
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
    const annualAmount = calculateAnnualFromTarget(
      Number(row.target_amount ?? 0),
      (row.frequency as PlannerFrequency) ?? "monthly",
    );
    const perPay = calculateRequiredContribution(annualAmount, payFrequency);
    const payload: UpdatePayload = {
      id: row.id,
      target_amount: Number(row.target_amount ?? 0) || 0,
      annual_amount: annualAmount,
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

  function handleExportCsv() {
    if (rows.length === 0) {
      toast.info("No envelopes to export yet.");
      return;
    }

    const formatNumber = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "0.00");
    const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const headers = [
      "Envelope",
      "Category",
      "Target Amount",
      "Annual Amount",
      requiredColumnLabel,
      "Plan Per Pay",
      "Plan Variance",
      "Current Balance",
      "Status",
      "Next Due",
      "Due Status",
      "Frequency",
      "Notes",
    ];

    const dataRows = rows.map((row) => {
      const { annual, perPay, status } = recalcRow(row as any);
      const planEntry = planByEnvelope.get(row.id);
      const planPerPay = planEntry?.perPay ?? null;
      const planVariance = planEntry ? perPay - planPerPay : null;
      const dueInfo = calculateDueProgress(row.next_payment_due ?? row.due_date);
      const frequencyText =
        row.frequency && row.frequency !== "none"
          ? frequencyLabel(row.frequency as PlannerFrequency)
          : "";

      return [
        row.name ?? "",
        row.category_name ?? "",
        formatNumber(Number(row.target_amount ?? 0)),
        formatNumber(annual),
        formatNumber(perPay),
        planPerPay !== null ? formatNumber(planPerPay) : "",
        planVariance !== null ? formatNumber(planVariance) : "",
        formatNumber(Number(row.current_amount ?? 0)),
        status.replace("-", " "),
        dueInfo.formatted ?? "",
        dueInfo.label,
        frequencyText,
        row.notes ?? "",
      ];
    });

    const csvContent = [headers, ...dataRows]
      .map((row) => row.map((value) => escapeCsvValue(value ?? "")).join(","))
      .join("\n");

    const filename = `envelope-planning-${format(new Date(), "yyyy-MM-dd")}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        <div className="space-y-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground hover:text-secondary"
          >
            <Link href="/envelope-summary" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-secondary">Envelope Planning</h1>
              <p className="text-sm text-muted-foreground">
                Plan and track your envelope contributions with detailed calculations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Envelope
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/envelopes?transfer=1">
                  <ArrowLeftRight className="h-4 w-4" />
                  Move Balances
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/balance-report">
                  <FileText className="h-4 w-4" />
                  Balance Report
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => handleExportCsv()}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-border/60 bg-muted/10 shadow-sm">
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pay Frequency
                </Label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pay Cycle Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-sm",
                        !payCycleStartDate && "text-muted-foreground"
                      )}
                    >
                      <span>
                        {payCycleStartDate ? format(payCycleStartDate, "MMMM do, yyyy") : "Select date"}
                      </span>
                      <CalendarIcon className="h-4 w-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={payCycleStartDate ?? undefined}
                      onSelect={(date) => setPayCycleStartDate(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pay frequency determines how the “Required” column calculates amounts from your due amount.
              Pay cycle start date is used to calculate expected balances based on actual payment periods since this date.
            </p>
          </CardContent>
        </Card>

        {planTotals ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recurring income plan</p>
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
                  className={cn(
                    "text-xl font-semibold",
                    planTotals.perPaySurplus >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
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

        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background shadow-sm">
          <table className="min-w-full divide-y divide-border/50 text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Opening Balance</th>
                <th className="px-4 py-3 text-left font-semibold">Due Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold">Due Frequency</th>
                <th className="px-4 py-3 text-left font-semibold">
                  {requiredColumnLabel} Amount
                </th>
                <th className="px-4 py-3 text-left font-semibold">Frequency</th>
                <th className="px-4 py-3 text-left font-semibold">Actual Balance*</th>
                <th className="px-4 py-3 text-left font-semibold">Expected</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <PlusCircle className="h-12 w-12 text-primary/60" />
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-secondary">
                          No envelopes added yet
                        </p>
                        <p className="text-sm">
                          Use the “Add Envelope” button above to start planning.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const { perPay, expected, status } = recalcRow(row as any);
                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium text-secondary">{row.name}</div>
                        {row.category_name ? (
                          <p className="text-xs text-muted-foreground">{row.category_name}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatCurrency(Number(row.opening_balance ?? 0))}
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4">
                        <Input
                          type="date"
                          value={(row.next_payment_due ?? row.due_date ?? "").slice(0, 10)}
                          disabled={readOnly}
                          onChange={(event) =>
                            handleFieldChange(row.id, "next_payment_due", event.target.value)
                          }
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="h-9 w-full rounded-md border px-2 text-sm"
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
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatCurrency(perPay)}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {payFrequencyLabel}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatCurrency(Number(row.current_amount ?? 0))}
                      </td>
                      <td className="px-4 py-4 text-secondary">{formatCurrency(expected)}</td>
                      <td className="px-4 py-4 capitalize">
                        <span
                          className={cn(
                            status === "on-track" && "text-emerald-600",
                            status === "over" && "text-sky-600",
                            status === "under" && "text-rose-600",
                          )}
                        >
                          {status.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
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
                })
              )}
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
                    opening_balance: Number(updated.opening_balance ?? row.opening_balance ?? 0),
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
            opening_balance: Number(updated.opening_balance ?? 0) || 0,
          });
          setEditEnvelope(null);
        }}
        categories={categoryOptions}
      />
      <EnvelopeCreateDialog
        open={createOpen}
        onOpenChange={(value) => {
          setCreateOpen(value);
        }}
        categories={categoryOptions}
        onCreated={() => {
          router.refresh();
        }}
      />
    </>
  );
}
