"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import type { TransactionRow } from "@/lib/auth/types";
import { toast } from "sonner";
import { SmartSuggestionsBanner } from "@/components/layout/reconcile/smart-suggestions";
import { CsvImportDialog } from "@/components/layout/reconcile/csv-import-dialog";
import { ReceiptUploadDialog } from "@/components/layout/reconcile/receipt-upload-dialog";
import { SplitEditor, type SplitResult } from "@/components/layout/reconcile/split-editor";
import { AutoAllocatedTransactionRow } from "@/components/allocations/auto-allocated-transaction-row";
import Link from "next/link";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

type WorkbenchRow = TransactionRow & {
  labels?: string[];
};

const duplicateFilters = [
  { key: "all", label: "All" },
  { key: "needs-review", label: "Needs review" },
  { key: "canonical", label: "Primary kept" },
  { key: "ignored", label: "Ignored" },
] as const;

type DuplicateFilter = (typeof duplicateFilters)[number]["key"];

const datePresets = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-3", label: "Last 3 months" },
  { key: "year", label: "Year to date" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
] as const;

type DatePreset = (typeof datePresets)[number]["key"];

function getPresetRange(preset: DatePreset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case "this-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "last-month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "last-3": {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "all":
      return { from: "", to: "" };
    case "custom":
    default:
      return null;
  }
}

function toggleValue(value: string, selected: string[], setSelected: (next: string[]) => void) {
  setSelected(
    selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value],
  );
}

function duplicateKey(transaction: WorkbenchRow) {
  const reference = transaction.bank_reference?.trim().toLowerCase();
  if (reference) return reference;
  const merchant = transaction.merchant_name?.trim().toLowerCase();
  if (!merchant) return null;
  const amount = Number(transaction.amount ?? 0).toFixed(2);
  const date = new Date(transaction.occurred_at).toISOString().slice(0, 10);
  return `${merchant}::${amount}::${date}`;
}

const UNASSIGNED_LABEL = "Unassigned";

const demoTransactions: WorkbenchRow[] = [
  {
    id: "demo-uber",
    merchant_name: "Uber Eats",
    description: "Friday takeaways",
    amount: -38.5,
    occurred_at: new Date().toISOString(),
    status: "pending",
    envelope_name: "Dining out",
    account_name: "Everyday account",
    bank_reference: "UBER123",
    bank_memo: "Card 1234",
    labels: [],
    duplicate_status: "pending",
  },
  {
    id: "demo-mitre",
    merchant_name: "Mitre 10",
    description: "Garden supplies",
    amount: -89.9,
    occurred_at: new Date(Date.now() - 86400000).toISOString(),
    status: "unmatched",
    envelope_name: null,
    account_name: "Everyday account",
    bank_reference: "MITRE987",
    bank_memo: "EFTPOS",
    labels: [],
    duplicate_status: "pending",
  },
  {
    id: "demo-westfield",
    merchant_name: "Westfield parking",
    description: null,
    amount: -6,
    occurred_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "pending",
    envelope_name: "Transport",
    account_name: "Everyday account",
    bank_reference: "WESTF11",
    bank_memo: "Parking",
    labels: [],
    duplicate_status: "pending",
  },
];

type Props = {
  transactions: TransactionRow[];
};

function normaliseStatus(status?: string | null) {
  if (!status) return "pending";
  const lowered = status.toLowerCase();
  if (lowered.includes("approve")) return "approved";
  if (lowered.includes("match")) return "matched";
  if (lowered.includes("unmatch") || lowered.includes("missing")) return "unmatched";
  if (lowered.includes("pending")) return "pending";
  return lowered;
}

export function ReconcileWorkbench({ transactions }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "unmatched" | "matched">(
    "all",
  );
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>("all");
  const [search, setSearch] = useState("");
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);
  const [envelopeFilter, setEnvelopeFilter] = useState<string[]>([]);

  const router = useRouter();
  const usingDemo = transactions.length === 0;
  const initialRows = useMemo<WorkbenchRow[]>(
    () =>
      (transactions.length ? transactions : demoTransactions)
        .filter((transaction) => (transaction.duplicate_status ?? "pending") !== "merged")
        .map((transaction) => ({
          ...transaction,
          duplicate_status: transaction.duplicate_status ?? "pending",
          labels: Array.isArray((transaction as WorkbenchRow).labels)
            ? [...((transaction as WorkbenchRow).labels ?? [])]
            : [],
        })),
    [transactions],
  );
  const [rows, setRows] = useState<WorkbenchRow[]>(initialRows);
  const [activeRowId, setActiveRowId] = useState<string | null>(initialRows[0]?.id ?? null);
  const approveShortcutRef = useRef<(tx: WorkbenchRow) => Promise<void>>(async () => {});
  const labelShortcutRef = useRef<(tx: WorkbenchRow) => Promise<void>>(async () => {});
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  useEffect(() => {
    if (datePreset === "custom") return;
    const range = getPresetRange(datePreset);
    if (!range) return;
    setDateFrom(range.from);
    setDateTo(range.to);
  }, [datePreset]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [receiptTransactionId, setReceiptTransactionId] = useState<string | null>(null);
  const [splitTransactionId, setSplitTransactionId] = useState<string | null>(null);
  const [sheetTransaction, setSheetTransaction] = useState<WorkbenchRow | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    transaction: WorkbenchRow;
    candidates: WorkbenchRow[];
  } | null>(null);
  const [duplicateActionLoading, setDuplicateActionLoading] = useState(false);
  const [duplicateActionError, setDuplicateActionError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, WorkbenchRow[]>();
    rows.forEach((tx) => {
      const status = tx.duplicate_status ?? "pending";
      if (status !== "pending") return;
      const key = duplicateKey(tx);
      if (!key) return;
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    });
    return map;
  }, [rows]);

  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    duplicateGroups.forEach((list, key) => {
      if (list.length > 1) counts.set(key, list.length);
    });
    return counts;
  }, [duplicateGroups]);

  const labelOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      (row.labels ?? []).forEach((label) => {
        const trimmed = label.trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      set.add(row.account_name ?? UNASSIGNED_LABEL);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const envelopeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      set.add(row.envelope_name ?? UNASSIGNED_LABEL);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const min = amountMin.trim() ? Number(amountMin) : null;
    const max = amountMax.trim() ? Number(amountMax) : null;
    const searchLower = search.toLowerCase();
    const labelSet = new Set(labelFilter.map((label) => label.toLowerCase()));
    const accountSet = new Set(accountFilter);
    const envelopeSet = new Set(envelopeFilter);

    return rows.filter((tx) => {
      const status = normaliseStatus(tx.status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search) {
        const text = `${tx.merchant_name} ${tx.description ?? ""} ${tx.bank_memo ?? ""}`.toLowerCase();
        if (!text.includes(searchLower)) {
          return false;
        }
      }
      const occurred = new Date(tx.occurred_at).toISOString().slice(0, 10);
      if (dateFrom && occurred < dateFrom) return false;
      if (dateTo && occurred > dateTo) return false;
      const amount = Number(tx.amount ?? 0);
      if (min !== null && Number.isFinite(min) && amount < min) return false;
      if (max !== null && Number.isFinite(max) && amount > max) return false;
      if (labelSet.size) {
        const labels = (tx.labels ?? []).map((label) => label.toLowerCase());
        const hasMatch = labels.some((label) => labelSet.has(label));
        if (!hasMatch) return false;
      }
      if (accountSet.size) {
        const accountName = tx.account_name ?? UNASSIGNED_LABEL;
        if (!accountSet.has(accountName)) return false;
      }
      if (envelopeSet.size) {
        const envelopeName = tx.envelope_name ?? UNASSIGNED_LABEL;
        if (!envelopeSet.has(envelopeName)) return false;
      }
      const duplicateStatus = (tx.duplicate_status ?? "pending").toLowerCase();
      const keyValue = duplicateKey(tx);
      const duplicateCount = keyValue ? duplicates.get(keyValue) ?? 0 : 0;
      const needsReview = duplicateStatus === "pending" && duplicateCount > 1;
      if (duplicateFilter === "needs-review" && !needsReview) return false;
      if (duplicateFilter === "canonical" && duplicateStatus !== "canonical") return false;
      if (duplicateFilter === "ignored" && duplicateStatus !== "ignored") return false;
      return true;
    });
  }, [
    rows,
    statusFilter,
    search,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    labelFilter,
    accountFilter,
    envelopeFilter,
    duplicateFilter,
    duplicates,
  ]);

  useEffect(() => {
    if (!filtered.length) {
      setActiveRowId(null);
      return;
    }
    setActiveRowId((prev) => (prev && filtered.some((tx) => tx.id === prev) ? prev : filtered[0].id));
  }, [filtered]);

  const activeRow = useMemo(
    () => (activeRowId ? filtered.find((tx) => tx.id === activeRowId) ?? null : null),
    [filtered, activeRowId],
  );

  approveShortcutRef.current = handleApprove;
  labelShortcutRef.current = handleLabels;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!filtered.length) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (
          target.isContentEditable ||
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          tag === "button"
        ) {
          return;
        }
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const index = activeRowId ? filtered.findIndex((tx) => tx.id === activeRowId) : -1;

      if (key === "arrowdown") {
        event.preventDefault();
        const nextIndex = index >= 0 ? Math.min(filtered.length - 1, index + 1) : 0;
        setActiveRowId(filtered[nextIndex]?.id ?? null);
        return;
      }

      if (key === "arrowup") {
        event.preventDefault();
        if (!filtered.length) return;
        const nextIndex = index > 0 ? index - 1 : 0;
        setActiveRowId(filtered[nextIndex]?.id ?? null);
        return;
      }

      if (!activeRow) return;

      if (key === "a") {
        event.preventDefault();
        if (normaliseStatus(activeRow.status) !== "approved") {
          void approveShortcutRef.current(activeRow);
        }
        return;
      }

      if (key === "s") {
        event.preventDefault();
        setSplitTransactionId((prev) => (prev === activeRow.id ? null : activeRow.id));
        setSheetTransaction(null);
        return;
      }

      if (key === "l") {
        event.preventDefault();
        void labelShortcutRef.current(activeRow);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, activeRowId, activeRow]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, tx) => {
        const status = normaliseStatus(tx.status);
        acc.total += 1;
        if (status === "pending") acc.pending += 1;
        if (status === "unmatched" || !tx.envelope_name) acc.unmatched += 1;
        return acc;
      },
      { total: 0, pending: 0, unmatched: 0 },
    );
  }, [rows]);

  const suggestionCount = useMemo(
    () => rows.filter((tx) => !tx.envelope_name && normaliseStatus(tx.status) === "pending").length,
    [rows],
  );

async function handleApprove(tx: TransactionRow) {
  setRows((prev) =>
    prev.map((row) => (row.id === tx.id ? { ...row, status: "approved" } : row)),
  );
  setSheetTransaction(null);

  if (usingDemo) {
    toast.success("Transaction approved (demo)");
    return;
  }

  try {
    const response = await fetch(`/api/transactions/${tx.id}/approve`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    toast.success("Transaction approved");
    router.refresh();
  } catch (error) {
    console.error(error);
    toast.error("Failed to approve transaction");
    setRows((prev) =>
      prev.map((row) => (row.id === tx.id ? { ...row, status: tx.status } : row)),
    );
  }
}

async function handleAssign(tx: WorkbenchRow) {
  const defaultValue = tx.envelope_name ?? "";
  const value = prompt(
    "Assign to which envelope? (case insensitive match)",
    defaultValue,
  );
  if (value === null) return;
  const trimmed = value.trim();
  if (!trimmed) {
    toast.error("Envelope name is required");
    return;
  }

  const previousRows = rows.map((row) => ({ ...row, labels: [...(row.labels ?? [])] }));
  setRows((prev) =>
    prev.map((row) =>
      row.id === tx.id
        ? {
            ...row,
            envelope_name: trimmed,
            status: row.status === "unmatched" ? "pending" : row.status,
          }
        : row,
    ),
  );
  setSheetTransaction((current) =>
    current && current.id === tx.id
      ? { ...current, envelope_name: trimmed, status: "pending" }
      : current,
  );

  if (usingDemo) {
    toast.success("Envelope assigned (demo)");
    return;
  }

  try {
    const response = await fetch(`/api/transactions/${tx.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ envelopeName: trimmed }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to assign envelope" }));
      throw new Error(payload.error ?? "Unable to assign envelope");
    }

    const payload = (await response.json()) as {
      transaction: { status: string; envelope: { id: string; name: string | null } };
    };

    setRows((prev) =>
      prev.map((row) =>
        row.id === tx.id
          ? {
              ...row,
              envelope_name: payload.transaction.envelope.name ?? trimmed,
              status: payload.transaction.status ?? row.status,
            }
          : row,
      ),
    );
    toast.success("Envelope assigned");
    router.refresh();
  } catch (error) {
    console.error(error);
    setRows(previousRows);
    toast.error(error instanceof Error ? error.message : "Unable to assign envelope");
  }
}

async function handleLabels(tx: WorkbenchRow) {
  const defaultValue = tx.labels?.join(", ") ?? "";
  const value = prompt(
    "Comma-separated labels (leave blank to clear)",
    defaultValue,
  );
  if (value === null) return;

  const labels = value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  const previousRows = rows.map((row) => ({ ...row, labels: [...(row.labels ?? [])] }));
  setRows((prev) =>
    prev.map((row) => (row.id === tx.id ? { ...row, labels } : row)),
  );

  if (usingDemo) {
    toast.success("Labels updated (demo)");
    return;
  }

  try {
    const response = await fetch(`/api/transactions/${tx.id}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to update labels" }));
      throw new Error(payload.error ?? "Unable to update labels");
    }

    const payload = (await response.json()) as {
      transaction: { labels: Array<{ name: string }> };
    };

    const names = payload.transaction.labels?.map((label) => label.name) ?? [];
    setRows((prev) =>
      prev.map((row) => (row.id === tx.id ? { ...row, labels: names } : row)),
    );
    toast.success("Labels updated");
    router.refresh();
  } catch (error) {
    console.error(error);
    setRows(previousRows);
    toast.error(error instanceof Error ? error.message : "Unable to update labels");
  }
}

function applySplitResult(result: SplitResult) {
  const label =
    result.splits.length === 1 ? result.splits[0].envelopeName : "Split across envelopes";
  setRows((prev) =>
    prev.map((row) =>
      row.id === result.transaction.id ? { ...row, envelope_name: label } : row,
    ),
  );
  router.refresh();
}

function handleResolveDuplicate(tx: WorkbenchRow) {
  const key = duplicateKey(tx);
  if (!key) {
    toast.info("No duplicate key available for this transaction.");
    return;
  }

  const group = duplicateGroups.get(key) ?? [];
  const candidates = group
    .filter((candidate) => candidate.id !== tx.id)
    .sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

  if (!candidates.length) {
    toast.info("No matching duplicates found to resolve.");
    return;
  }

  setDuplicateActionError(null);
  setDuplicateDialog({
    transaction: tx,
    candidates,
  });
}

async function submitDuplicateResolution(
  decision: "merge" | "ignore",
  targetId: string,
  note?: string,
) {
  if (!duplicateDialog) return;
  const base = duplicateDialog.transaction;
  const target = duplicateDialog.candidates.find((candidate) => candidate.id === targetId);
  if (!target) {
    setDuplicateActionError("Select a transaction to resolve against.");
    return;
  }

  if (usingDemo) {
    setRows((prev) => {
      let next = prev.map((row) => {
        if (row.id === base.id) {
          return {
            ...row,
            duplicate_status: decision === "merge" ? "canonical" : "ignored",
            duplicate_reviewed_at: new Date().toISOString(),
          };
        }
        if (row.id === target.id) {
          if (decision === "merge") {
            return { ...row, duplicate_status: "merged", duplicate_of: base.id };
          }
          return { ...row, duplicate_status: "ignored" };
        }
        return row;
      });
      if (decision === "merge") {
        next = next.filter((row) => row.id !== target.id);
      }
      return next;
    });
    toast.success(
      decision === "merge"
        ? "Duplicate merged successfully"
        : "Duplicate dismissed for future imports",
    );
    setDuplicateDialog(null);
    return;
  }

  try {
    setDuplicateActionLoading(true);
    setDuplicateActionError(null);
    const response = await fetch(`/api/transactions/${base.id}/duplicates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateId: targetId, decision, note }),
    });

    const payload = await response
      .json()
      .catch(() => ({ error: "Unable to resolve duplicate" }));

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to resolve duplicate");
    }

    const transactions =
      (payload?.transactions as Array<{
        id: string;
        duplicate_of: string | null;
        duplicate_status: string | null;
        duplicate_reviewed_at: string | null;
      }>) ?? [];

    setRows((prev) => {
      let next = prev.map((row) => {
        const match = transactions.find((item) => item.id === row.id);
        if (match) {
          return {
            ...row,
            duplicate_of: match.duplicate_of ?? null,
            duplicate_status: match.duplicate_status ?? row.duplicate_status,
            duplicate_reviewed_at: match.duplicate_reviewed_at ?? row.duplicate_reviewed_at,
          };
        }
        return row;
      });
      if (decision === "merge") {
        next = next.filter((row) => row.id !== targetId);
      }
      return next;
    });

    toast.success(
      decision === "merge"
        ? "Duplicate merged successfully"
        : "Duplicate dismissed for future imports",
    );
    setDuplicateDialog(null);
    router.refresh();
  } catch (error) {
    console.error(error);
    setDuplicateActionError(error instanceof Error ? error.message : "Unable to resolve duplicate");
    toast.error(error instanceof Error ? error.message : "Unable to resolve duplicate");
  } finally {
    setDuplicateActionLoading(false);
  }
}

  const splitTarget = splitTransactionId ? rows.find((tx) => tx.id === splitTransactionId) : null;
  const sheetStatus = sheetTransaction ? normaliseStatus(sheetTransaction.status) : null;

  return (
    <div className="space-y-6">
      <SmartSuggestionsBanner count={suggestionCount} />
      <section className="grid gap-4 md:grid-cols-3">
        {(
          [
            {
              label: "All transactions",
              value: summary.total,
              action: () => setStatusFilter("all"),
              active: statusFilter === "all",
            },
            {
              label: "Pending",
              value: summary.pending,
              action: () => setStatusFilter("pending"),
              active: statusFilter === "pending",
            },
            {
              label: "Unmatched",
              value: summary.unmatched,
              action: () => setStatusFilter("unmatched"),
              active: statusFilter === "unmatched",
            },
          ] satisfies Array<{ label: string; value: number; action: () => void; active: boolean }>
        ).map((card) => (
          <button
            key={card.label}
            onClick={card.action}
            className={`rounded-xl border px-4 py-5 text-left transition ${
              card.active ? "border-primary bg-primary/10" : "border-border bg-card"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="text-3xl font-semibold text-secondary">{card.value}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-3 rounded-xl border bg-muted/10 p-4 md:grid-cols-6">
        <div className="md:col-span-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date range</p>
          <div className="flex flex-wrap gap-2">
            {datePresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setDatePreset(preset.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  datePreset === preset.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</p>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search merchant, memo, or label"
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</p>
          <Input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => {
              setDatePreset("custom");
              setDateFrom(event.target.value);
            }}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</p>
          <Input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => {
              setDatePreset("custom");
              setDateTo(event.target.value);
            }}
            className="bg-background"
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount range</p>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Min"
              value={amountMin}
              onChange={(event) => setAmountMin(event.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Max"
              value={amountMax}
              onChange={(event) => setAmountMax(event.target.value)}
            />
          </div>
        </div>
        {labelOptions.length ? (
          <div className="md:col-span-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labels</p>
            <div className="flex flex-wrap gap-2">
              {labelOptions.map((label) => {
                const active = labelFilter.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleValue(label, labelFilter, setLabelFilter)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {accountOptions.length ? (
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accounts</p>
            <div className="flex flex-wrap gap-2">
              {accountOptions.map((account) => {
                const active = accountFilter.includes(account);
                return (
                  <button
                    key={account}
                    type="button"
                    onClick={() => toggleValue(account, accountFilter, setAccountFilter)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {account}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {envelopeOptions.length ? (
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Envelopes</p>
            <div className="flex flex-wrap gap-2">
              {envelopeOptions.map((envelope) => {
                const active = envelopeFilter.includes(envelope);
                return (
                  <button
                    key={envelope}
                    type="button"
                    onClick={() => toggleValue(envelope, envelopeFilter, setEnvelopeFilter)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {envelope}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-3">
          <div className="space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setDuplicateFilter("all");
                setSearch("");
                setDateFrom(defaultFrom);
                setDateTo(defaultTo);
                setDatePreset("this-month");
                setAmountMin("");
                setAmountMax("");
                setLabelFilter([]);
                setAccountFilter([]);
                setEnvelopeFilter([]);
              }}
            >
              Reset filters
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            Import CSV
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">Duplicate status</span>
        {duplicateFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setDuplicateFilter(filter.key)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
              duplicateFilter === filter.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:border-primary/40"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Auto-allocated transactions - shown before regular transactions */}
      {filtered
        .filter((tx) => tx.is_auto_allocated && tx.allocation_plan_id && !tx.parent_transaction_id)
        .map((tx) => (
          <AutoAllocatedTransactionRow
            key={tx.id}
            transaction={{
              id: tx.id,
              amount: Number(tx.amount ?? 0),
              date: tx.occurred_at,
              description: tx.merchant_name || "Income",
              allocationPlanId: tx.allocation_plan_id!,
            }}
            onReconciled={() => {
              router.refresh();
            }}
            onRejected={() => {
              router.refresh();
            }}
          />
        ))}

      {isMobile ? (
        <MobileTransactionList
          transactions={filtered.filter((tx) => !tx.parent_transaction_id)} // Hide child transactions
          duplicates={duplicates}
          onOpenSheet={setSheetTransaction}
          onAssign={handleAssign}
          onApprove={handleApprove}
          onLabels={handleLabels}
          onSplit={(tx) => {
            setSplitTransactionId(tx.id);
            setSheetTransaction(null);
          }}
          onReceipt={(tx) => {
            setReceiptTransactionId(tx.id);
            setSheetTransaction(null);
          }}
          onResolveDuplicate={handleResolveDuplicate}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Envelope</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Labels</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.filter((tx) => !tx.parent_transaction_id).map((tx) => { // Hide child transactions
                const status = normaliseStatus(tx.status);
                const duplicateCount = (() => {
                  const keyValue = duplicateKey(tx);
                  return keyValue ? duplicates.get(keyValue) ?? 0 : 0;
                })();
                const duplicateFlag = duplicateCount > 1;
                return (
                  <Fragment key={tx.id}>
                    <tr
                      className={cn(
                        "text-sm transition",
                        tx.id === activeRowId && "bg-primary/5",
                      )}
                      tabIndex={0}
                      onClick={() => setActiveRowId(tx.id)}
                      onFocus={() => setActiveRowId(tx.id)}
                      aria-selected={tx.id === activeRowId}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-secondary flex items-center gap-2">
                          {tx.merchant_name}
                          {renderDuplicateBadge(tx.duplicate_status, duplicateFlag)}
                        </div>
                        {tx.description ? (
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {tx.bank_reference ? `Ref ${tx.bank_reference} · ` : ""}
                          {tx.bank_memo ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {tx.envelope_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 align-top font-medium">
                        {formatCurrency(Number(tx.amount ?? 0))}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                            status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : status === "unmatched"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(
                          new Date(tx.occurred_at),
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {tx.envelope_name ? tx.envelope_name : "Needs tag"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          {tx.labels?.length ? (
                            tx.labels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No labels</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveRowId(tx.id);
                              void handleLabels(tx);
                            }}
                          >
                            Manage labels
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          {duplicateFlag ? (
                            <Button variant="outline" size="sm" onClick={() => handleResolveDuplicate(tx)}>
                              Resolve duplicate
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveRowId(tx.id);
                              void handleAssign(tx);
                            }}
                          >
                            Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveRowId(tx.id);
                              setSplitTransactionId((current) =>
                                current === tx.id ? null : tx.id,
                              );
                            }}
                          >
                            Split
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveRowId(tx.id);
                              setReceiptTransactionId(tx.id);
                            }}
                          >
                            Receipt
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setActiveRowId(tx.id);
                              void handleApprove(tx);
                            }}
                            disabled={status === "approved"}
                          >
                            {status === "approved" ? "Approved" : "Approve"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {splitTransactionId === tx.id ? (
                      <tr className="bg-muted/20">
                        <td colSpan={7} className="px-6 py-4">
                          <SplitEditor
                            demo={usingDemo}
                            transactionId={tx.id}
                            amount={Number(tx.amount ?? 0)}
                            onClose={() => setSplitTransactionId(null)}
                            onSaved={applySplitResult}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-muted-foreground" colSpan={7}>
                    Nothing to reconcile for this view. Adjust filters or import a bank feed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && splitTarget ? (
        <div className="rounded-xl border border-dashed bg-muted/10 p-4 md:hidden">
          <SplitEditor
            demo={usingDemo}
            transactionId={splitTarget.id}
            amount={Number(splitTarget.amount ?? 0)}
            onClose={() => setSplitTransactionId(null)}
            onSaved={applySplitResult}
          />
        </div>
      ) : null}

      {sheetTransaction ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setSheetTransaction(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-2xl backdrop-blur md:hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4">
              <header>
                <p className="text-sm font-semibold text-secondary">
                  {sheetTransaction.merchant_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(
                    new Date(sheetTransaction.occurred_at),
                  )}
                  {" · "}
                  {formatCurrency(Number(sheetTransaction.amount ?? 0))}
                </p>
              </header>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void handleAssign(sheetTransaction);
                    setSheetTransaction(null);
                  }}
                >
                  Assign envelope
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSplitTransactionId(sheetTransaction.id);
                    setSheetTransaction(null);
                  }}
                >
                  Split spend
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReceiptTransactionId(sheetTransaction.id);
                    setSheetTransaction(null);
                  }}
                >
                  Attach receipt
                </Button>
                <Button
                  onClick={() => handleApprove(sheetTransaction)}
                  disabled={sheetStatus === "approved"}
                >
                  {sheetStatus === "approved" ? "Approved" : "Approve"}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <MobileNav />
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <ReceiptUploadDialog
        open={Boolean(receiptTransactionId)}
        onOpenChange={(value) => {
          if (!value) setReceiptTransactionId(null);
        }}
        transactionId={receiptTransactionId}
      />
      <DuplicateResolutionDialog
        open={Boolean(duplicateDialog)}
        transaction={duplicateDialog?.transaction ?? null}
        candidates={duplicateDialog?.candidates ?? []}
        loading={duplicateActionLoading}
        error={duplicateActionError}
        onClose={() => {
          if (!duplicateActionLoading) {
            setDuplicateDialog(null);
            setDuplicateActionError(null);
          }
        }}
        onDecision={(decision, targetId, note) => submitDuplicateResolution(decision, targetId, note)}
      />
    </div>
  );
}

function MobileTransactionList({
  transactions,
  duplicates,
  onOpenSheet,
  onAssign,
  onApprove,
  onLabels,
  onSplit,
  onReceipt,
  onResolveDuplicate,
}: {
  transactions: WorkbenchRow[];
  duplicates: Map<string, number>;
  onOpenSheet: (transaction: WorkbenchRow) => void;
  onAssign: (transaction: WorkbenchRow) => void;
  onApprove: (transaction: WorkbenchRow) => void;
  onLabels: (transaction: WorkbenchRow) => void;
  onSplit: (transaction: WorkbenchRow) => void;
  onReceipt: (transaction: WorkbenchRow) => void;
  onResolveDuplicate: (transaction: WorkbenchRow) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {transactions.length ? (
        transactions.map((transaction) => {
          const status = normaliseStatus(transaction.status);
          const duplicateCount = (() => {
            const keyValue = duplicateKey(transaction);
            return keyValue ? duplicates.get(keyValue) ?? 0 : 0;
          })();
          return (
            <MobileTransactionCard
              key={transaction.id}
              transaction={transaction}
              status={status}
              duplicateFlag={duplicateCount > 1}
              onOpenSheet={onOpenSheet}
              onAssign={onAssign}
              onApprove={onApprove}
              onLabels={onLabels}
              onSplit={onSplit}
              onReceipt={onReceipt}
              onResolveDuplicate={onResolveDuplicate}
            />
          );
        })
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
          Nothing to reconcile for this view. Adjust filters or import a bank feed.
        </div>
      )}
    </div>
  );
}

function renderDuplicateBadge(status: string | null | undefined, needsReview: boolean) {
  if (needsReview) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
        Needs review
      </span>
    );
  }
  const normalised = (status ?? "").toLowerCase();
  if (normalised === "canonical") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        Primary record
      </span>
    );
  }
  if (normalised === "ignored") {
    return (
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
        Ignored duplicate
      </span>
    );
  }
  return null;
}

function MobileTransactionCard({
  transaction,
  status,
  duplicateFlag,
  onOpenSheet,
  onAssign,
  onApprove,
  onLabels,
  onSplit,
  onReceipt,
  onResolveDuplicate,
}: {
  transaction: WorkbenchRow;
  status: string;
  duplicateFlag: boolean;
  onOpenSheet: (transaction: WorkbenchRow) => void;
  onAssign: (transaction: WorkbenchRow) => void;
  onApprove: (transaction: WorkbenchRow) => void;
  onLabels: (transaction: WorkbenchRow) => void;
  onSplit: (transaction: WorkbenchRow) => void;
  onReceipt: (transaction: WorkbenchRow) => void;
  onResolveDuplicate: (transaction: WorkbenchRow) => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const hasMoved = useRef(false);
  const isApproved = status === "approved";

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    hasMoved.current = false;
    startX.current = event.clientX;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const delta = event.clientX - startX.current;
    if (Math.abs(delta) > 4) {
      hasMoved.current = true;
    }
    const constrained = clamp(delta, -140, 0);
    setOffset(constrained);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const final = offset < -70 ? -140 : 0;
    setOffset(final);
    if (!hasMoved.current) {
      onOpenSheet(transaction);
    }
  }

  function handleMoreClick() {
    onOpenSheet(transaction);
  }

  return (
    <div className="relative">
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
        <Button
          size="sm"
          variant="secondary"
          className="shadow"
          onClick={() => onApprove(transaction)}
          disabled={isApproved}
        >
          {isApproved ? "Approved" : "Approve"}
        </Button>
        <Button size="sm" variant="outline" className="shadow" onClick={handleMoreClick}>
          More
        </Button>
        {duplicateFlag ? (
          <Button
            size="sm"
            variant="outline"
            className="shadow"
            onClick={(event) => {
              event.stopPropagation();
              void onResolveDuplicate(transaction);
            }}
          >
            Resolve
          </Button>
        ) : null}
      </div>
      <div
        className="relative rounded-xl border bg-card p-4 shadow-sm transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            {transaction.merchant_name}
            {renderDuplicateBadge(transaction.duplicate_status, duplicateFlag)}
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : status === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : status === "unmatched"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </span>
        </div>
        {transaction.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{transaction.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(
              new Date(transaction.occurred_at),
            )}
          </span>
          <span className="font-semibold text-secondary">
            {formatCurrency(Number(transaction.amount ?? 0))}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
            {transaction.envelope_name ?? "Needs tag"}
          </span>
          <button
            type="button"
            className="text-primary underline"
            onClick={(event) => {
              event.stopPropagation();
              onLabels(transaction);
            }}
          >
            Labels
          </button>
          <button
            type="button"
            className="text-primary underline"
            onClick={(event) => {
              event.stopPropagation();
              onAssign(transaction);
            }}
          >
            Assign
          </button>
        </div>
        {transaction.labels?.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {transaction.labels.map((label) => (
              <span key={label} className="rounded-full bg-muted px-2 py-0.5">
                {label}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-2 text-[11px] text-muted-foreground">
          {transaction.bank_reference ? `Ref ${transaction.bank_reference} · ` : ""}
          {transaction.bank_memo ?? ""}
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              onSplit(transaction);
            }}
          >
            Split
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              onReceipt(transaction);
            }}
          >
            Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}

function DuplicateResolutionDialog({
  open,
  transaction,
  candidates,
  loading,
  error,
  onClose,
  onDecision,
}: {
  open: boolean;
  transaction: WorkbenchRow | null;
  candidates: WorkbenchRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDecision: (decision: "merge" | "ignore", targetId: string, note?: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedId(candidates[0]?.id ?? null);
    setNote("");
  }, [open, candidates]);

  if (!transaction) {
    return null;
  }

  const disableActions = loading || !selectedId;

  return (
    <Dialog.Root open={open} onOpenChange={(value) => (value ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl space-y-5 rounded-3xl border bg-background p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-secondary">
              Resolve duplicate
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Choose the matching transaction and decide whether to merge it or ignore future alerts.
            </Dialog.Description>

            <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary transaction</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-secondary">
                <span className="font-medium">{transaction.merchant_name}</span>
                <span>{formatCurrency(Number(transaction.amount ?? 0))}</span>
                <span>
                  {new Date(transaction.occurred_at).toLocaleDateString("en-NZ", {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
              <p className="text-xs">
                {transaction.bank_reference ? `Ref ${transaction.bank_reference} · ` : ""}
                {transaction.bank_memo ?? ""}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-secondary">Possible matches</Label>
              {candidates.length ? (
                <div className="space-y-2">
                  {candidates.map((candidate) => {
                    const isSelected = selectedId === candidate.id;
                    return (
                      <label
                        key={candidate.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                          isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicate-candidate"
                          value={candidate.id}
                          checked={isSelected}
                          onChange={() => setSelectedId(candidate.id)}
                          className="mt-1"
                        />
                        <div className="text-sm text-secondary">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-medium">{candidate.merchant_name}</span>
                            <span>{formatCurrency(Number(candidate.amount ?? 0))}</span>
                            <span>
                              {new Date(candidate.occurred_at).toLocaleDateString("en-NZ", {
                                dateStyle: "medium",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {candidate.bank_reference ? `Ref ${candidate.bank_reference} · ` : ""}
                            {candidate.bank_memo ?? ""}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                  No matching duplicates detected.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-note" className="text-sm font-medium text-secondary">
                Notes (optional)
              </Label>
              <Textarea
                id="duplicate-note"
                placeholder="Add additional context for this decision"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disableActions}
                onClick={() => selectedId && onDecision("ignore", selectedId, note.trim() || undefined)}
              >
                Ignore duplicates
              </Button>
              <Button
                type="button"
                disabled={disableActions}
                onClick={() => selectedId && onDecision("merge", selectedId, note.trim() || undefined)}
              >
                Merge transactions
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 shadow-lg backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-4 py-3 text-xs">
        <Link href="/dashboard" className="text-muted-foreground transition hover:text-primary">
          Dashboard
        </Link>
        <Link href="/envelope-summary" className="text-muted-foreground transition hover:text-primary">
          Summary
        </Link>
        <Link href="/reconcile" className="text-primary font-semibold">
          Reconcile
        </Link>
        <Link href="/envelope-planning" className="text-muted-foreground transition hover:text-primary">
          Planner
        </Link>
      </div>
    </nav>
  );
}
