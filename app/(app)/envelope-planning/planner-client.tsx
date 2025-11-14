"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlannerFrequency, calculateAnnualFromTarget, calculateDueProgress, calculateRequiredContribution, determineStatus, frequencyOptions } from "@/lib/planner/calculations";
import type { EnvelopeRow } from "@/lib/auth/types";
import type { PayPlanSummary } from "@/lib/types/pay-plan";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  FileBarChart,
  GripVertical,
  Plus,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeEditSheet } from "@/components/layout/envelopes/envelope-edit-sheet";
import { EnvelopeCreateDialog } from "@/components/layout/envelopes/envelope-create-dialog";
import { EnvelopeTransferDialog } from "@/components/layout/envelopes/envelope-transfer-dialog";
import HelpTooltip from "@/components/ui/help-tooltip";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

type StatusFilter = "all" | "surplus" | "deficit" | "on-track";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "surplus", label: "Surplus" },
  { key: "deficit", label: "Deficit" },
  { key: "on-track", label: "On track" },
] as const;

export function PlannerClient({ initialPayFrequency, envelopes, readOnly = false, payPlan = null }: Props) {
  const router = useRouter();
  const [payFrequency, setPayFrequency] = useState<PlannerFrequency>(initialPayFrequency);
  const [payCycleStartDate, setPayCycleStartDate] = useState<Date | null>(null);
  const [editEnvelope, setEditEnvelope] = useState<SummaryEnvelope | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDefaults, setTransferDefaults] = useState<{ fromId?: string; toId?: string; amount?: number }>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
        const { perPay, expected } = recalcRow(row as any);
        const actual = Number(row.current_amount ?? 0);
        const variance = actual - expected;

        acc.target += Number(row.target_amount ?? 0);
        acc.annual += Number(row.annual_amount ?? 0);
        acc.current += actual;
        acc.payCycle += Number(row.pay_cycle_amount ?? 0);
        acc.expected += expected;

        if (variance >= 5) {
          acc.surplus += variance;
        } else if (variance <= -5) {
          acc.deficit += Math.abs(variance);
        }

        return acc;
      },
      { target: 0, annual: 0, current: 0, payCycle: 0, expected: 0, surplus: 0, deficit: 0 },
    );
  }, [rows, payFrequency, payCycleStartDate]);

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

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: rows.length,
      surplus: 0,
      deficit: 0,
      "on-track": 0,
    };
    rows.forEach((row) => {
      const { expected } = recalcRow(row as any);
      const actual = Number(row.current_amount ?? 0);
      const variance = actual - expected;

      if (variance >= 5) {
        counts.surplus += 1;
      } else if (variance <= -5) {
        counts.deficit += 1;
      } else {
        counts["on-track"] += 1;
      }
    });
    return counts;
  }, [rows, payFrequency, payCycleStartDate]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;

    return rows.filter((row) => {
      const { expected } = recalcRow(row as any);
      const actual = Number(row.current_amount ?? 0);
      const variance = actual - expected;

      if (statusFilter === "surplus") return variance >= 5;
      if (statusFilter === "deficit") return variance <= -5;
      if (statusFilter === "on-track") return variance > -5 && variance < 5;
      return true;
    });
  }, [rows, statusFilter, payFrequency, payCycleStartDate]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; rows: typeof rows }>();

    filteredRows.forEach((row) => {
      const categoryId = row.category_id ? String(row.category_id) : "uncategorised";
      const categoryName = row.category_name ?? "Uncategorised";

      if (!groups.has(categoryId)) {
        groups.set(categoryId, { id: categoryId, name: categoryName, rows: [] });
      }
      groups.get(categoryId)!.rows.push(row);
    });

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRows]);
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
      const planVariance = planEntry && planPerPay !== null ? perPay - planPerPay : null;
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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || readOnly) return;

      const activeRow = rows.find((row) => row.id === active.id);
      const overRow = rows.find((row) => row.id === over.id);

      if (!activeRow || !overRow) return;

      // If dropping on a different category, update the envelope's category
      const activeCategoryId = activeRow.category_id ? String(activeRow.category_id) : "uncategorised";
      const overCategoryId = overRow.category_id ? String(overRow.category_id) : "uncategorised";

      if (activeCategoryId !== overCategoryId) {
        // Move to different category
        const newCategoryId = overRow.category_id;
        const newCategoryName = overRow.category_name;

        setRows((prev) =>
          prev.map((row) =>
            row.id === activeRow.id
              ? { ...row, category_id: newCategoryId, category_name: newCategoryName }
              : row
          )
        );

        updateMutation.mutate({
          id: activeRow.id,
          category_id: newCategoryId,
        });

        toast.success(`Moved "${activeRow.name}" to ${newCategoryName ?? "Uncategorised"}`);
      } else {
        // Reorder within same category
        const fromIndex = rows.indexOf(activeRow);
        const toIndex = rows.indexOf(overRow);

        if (fromIndex === toIndex) return;

        const newRows = [...rows];
        const [movedRow] = newRows.splice(fromIndex, 1);
        newRows.splice(toIndex, 0, movedRow);

        setRows(newRows);
        toast.success("Envelope reordered");
      }
    },
    [rows, readOnly, updateMutation]
  );

  return (
    <>
      <div className="min-h-screen bg-[#f5f7fd]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8 sm:gap-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-sm font-medium text-muted-foreground hover:text-secondary"
            >
              <Link href="/envelope-summary" className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-semibold text-secondary">Envelope Planning</h1>
                  <HelpTooltip
                    title="Envelope Planning"
                    content={[
                      "Plan and track contributions for each envelope based on your pay cycle. This page shows you how much you need to set aside each pay period to meet your financial goals.",
                      "View annual funding requirements, due dates, and track progress toward your targets. The status indicators show whether you're on track, ahead, or behind on your savings goals."
                    ]}
                    tips={[
                      "Click any envelope to edit its details, target amount, or frequency",
                      "Use the 'Add Envelope' button to create new savings goals",
                      "Filter by category to focus on specific spending areas",
                      "Review the summary cards at the top to see your overall funding needs"
                    ]}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Plan and track your envelope contributions with detailed calculations.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Envelope
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-xl border border-border/80 bg-white px-4 py-2 text-secondary shadow-sm hover:bg-slate-50"
                  onClick={() => {
                    setTransferDefaults({});
                    setTransferOpen(true);
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Transfer Funds
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 rounded-xl border border-border/80 bg-white px-4 py-2 text-secondary shadow-sm hover:bg-slate-50"
                >
                  <Link href="/balance-report">
                    <FileBarChart className="h-4 w-4" />
                    Balance Report
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border border-border/80 bg-white px-4 py-2 text-secondary shadow-sm hover:bg-slate-50"
                  onClick={() => handleExportCsv()}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-2xl border border-border/40 bg-white shadow-sm">
                <CardContent className="px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Expected</p>
                  <p className="mt-2 text-2xl font-bold text-secondary">{formatCurrency(totals.expected)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Should be funded</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
                <CardContent className="px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Surplus</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totals.surplus)}</p>
                  <p className="mt-1 text-xs text-emerald-600">Over-funded envelopes</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-rose-200 bg-rose-50 shadow-sm">
                <CardContent className="px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Deficit</p>
                  <p className="mt-2 text-2xl font-bold text-rose-600">{formatCurrency(totals.deficit)}</p>
                  <p className="mt-1 text-xs text-rose-600">Under-funded envelopes</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/40 bg-white shadow-sm">
                <CardContent className="px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Variance</p>
                  <p className={cn(
                    "mt-2 text-2xl font-bold",
                    totals.surplus - totals.deficit >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCurrency(totals.surplus - totals.deficit)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totals.surplus - totals.deficit >= 0 ? "Overall surplus" : "Overall shortfall"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {planTotals ? (
              <div className="rounded-3xl border border-primary/20 bg-white px-6 py-5 shadow-sm sm:px-8">
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key as StatusFilter)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      statusFilter === filter.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {filter.label}
                    <span className="ml-1 text-[10px] opacity-80">({statusCounts[filter.key as StatusFilter]})</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCollapsedCategories(new Set())}
                >
                  Expand all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allCategoryIds = new Set(groupedRows.map((group) => group.id));
                    setCollapsedCategories(allCategoryIds);
                  }}
                >
                  Collapse all
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border/40 bg-white shadow-sm">
              <div className="w-full">
                <table className="w-full divide-y divide-border/40 text-sm text-secondary">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-right">Current</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 text-left">Frequency</th>
                      <th className="px-4 py-3 text-right">{requiredColumnLabel}</th>
                      <th className="px-4 py-3 text-right">Over/Under</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            <PlusCircle className="h-12 w-12 text-muted-foreground/40" />
                            <div className="space-y-1">
                              <p className="text-base font-semibold text-secondary">
                                {rows.length === 0 ? "No envelopes added yet" : "No envelopes match this filter"}
                              </p>
                              <p className="text-sm">
                                {rows.length === 0
                                  ? 'Click "Add Envelope" to start planning.'
                                  : "Try selecting a different filter or add a new envelope."}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      groupedRows.map((group) => {
                        const isCollapsed = collapsedCategories.has(group.id);
                        return (
                          <>
                            <tr key={`category-${group.id}`} className="bg-slate-50/50">
                              <td colSpan={7} className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollapsedCategories((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(group.id)) {
                                        next.delete(group.id);
                                      } else {
                                        next.add(group.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="flex w-full items-center gap-2 text-left font-semibold text-secondary hover:text-primary"
                                >
                                  <ChevronDown
                                    className={cn(
                                      "h-4 w-4 transition-transform",
                                      isCollapsed && "-rotate-90"
                                    )}
                                  />
                                  <span className="text-sm">{group.name}</span>
                                  <span className="text-xs font-normal text-muted-foreground">
                                    ({group.rows.length} {group.rows.length === 1 ? "envelope" : "envelopes"})
                                  </span>
                                </button>
                              </td>
                            </tr>
                            {!isCollapsed && (
                              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                <SortableContext
                                  items={group.rows.map((row) => row.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {group.rows.map((row) => (
                                    <SortableTableRow
                                      key={row.id}
                                      row={row}
                                      recalcRow={recalcRow}
                                      handleFieldChange={handleFieldChange}
                                      handleSave={handleSave}
                                      setEditEnvelope={setEditEnvelope}
                                      setTransferDefaults={setTransferDefaults}
                                      setTransferOpen={setTransferOpen}
                                      toSummaryEnvelope={toSummaryEnvelope}
                                      formatCurrency={formatCurrency}
                                      updateMutation={updateMutation}
                                      readOnly={readOnly}
                                      frequencyOptions={frequencyOptions}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
      <EnvelopeTransferDialog
        open={transferOpen}
        onOpenChange={(value) => {
          setTransferOpen(value);
          if (!value) {
            setTransferDefaults({});
          }
        }}
        envelopes={rows.map(toSummaryEnvelope)}
        defaultFromId={transferDefaults.fromId}
        defaultToId={transferDefaults.toId}
        defaultAmount={transferDefaults.amount}
        history={[]}
        onTransferComplete={() => {
          setTransferOpen(false);
          setTransferDefaults({});
          router.refresh();
        }}
      />
    </>
  );
}

interface SortableRowProps {
  row: PlannerEnvelope & Record<string, any>;
  recalcRow: (row: any) => { perPay: number; expected: number; status: string };
  handleFieldChange: (id: string, field: string, value: any) => void;
  handleSave: (row: any) => void;
  setEditEnvelope: (envelope: SummaryEnvelope) => void;
  setTransferDefaults: (defaults: { fromId?: string; toId?: string; amount?: number }) => void;
  setTransferOpen: (open: boolean) => void;
  toSummaryEnvelope: (row: any) => SummaryEnvelope;
  formatCurrency: (value: number) => string;
  updateMutation: any;
  readOnly: boolean;
  frequencyOptions: any[];
}

function SortableTableRow({
  row,
  recalcRow,
  handleFieldChange,
  handleSave,
  setEditEnvelope,
  setTransferDefaults,
  setTransferOpen,
  toSummaryEnvelope,
  formatCurrency,
  updateMutation,
  readOnly,
  frequencyOptions,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { perPay, expected, status } = recalcRow(row as any);
  const actual = Number(row.current_amount ?? 0);
  const variance = actual - expected;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      key={row.id}
      className={cn(
        "transition hover:bg-slate-50/70",
        isDragging && "opacity-50"
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              className="cursor-grab text-muted-foreground hover:text-secondary active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="font-medium text-secondary">{row.name}</div>
            {row.category_name ? (
              <p className="text-xs text-muted-foreground">{row.category_name}</p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-medium text-secondary">
        {formatCurrency(actual)}
      </td>
      <td className="px-4 py-3 text-right">
        <Input
          className="h-8 w-24 rounded-lg border-border/60 text-right"
          type="number"
          step="0.01"
          value={row.target_amount ?? 0}
          disabled={readOnly}
          onChange={(event) =>
            handleFieldChange(row.id, 'target_amount', Number(event.target.value))
          }
        />
      </td>
      <td className="px-4 py-3">
        <select
          className="h-8 w-32 rounded-lg border border-border/70 bg-white px-2 text-xs focus-visible:outline-none"
          value={(row.frequency as PlannerFrequency) ?? 'monthly'}
          disabled={readOnly}
          onChange={(event) =>
            handleFieldChange(row.id, 'frequency', event.target.value as PlannerFrequency)
          }
        >
          {frequencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(perPay)}</td>
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            'font-semibold',
            variance >= 5 && 'text-sky-600',
            variance <= -5 && 'text-rose-600',
            variance > -5 && variance < 5 && 'text-emerald-600',
          )}
        >
          {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1.5">
          {variance >= 5 ? (
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => {
                setTransferDefaults({ fromId: row.id, amount: Math.abs(variance) });
                setTransferOpen(true);
              }}
              disabled={readOnly}
              title="Transfer surplus to another envelope"
            >
              <ArrowRight className="h-3 w-3" />
              Move
            </Button>
          ) : variance <= -5 ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => {
                setTransferDefaults({ toId: row.id, amount: Math.abs(variance) });
                setTransferOpen(true);
              }}
              disabled={readOnly}
              title="Transfer funds to cover deficit"
            >
              <ArrowRight className="h-3 w-3" />
              Fund
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={() => setEditEnvelope(toSummaryEnvelope(row as any))}
            disabled={readOnly}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-3 text-xs"
            onClick={() => handleSave(row as any)}
            disabled={updateMutation.isPending || readOnly}
          >
            Save
          </Button>
        </div>
      </td>
    </tr>
  );
}
