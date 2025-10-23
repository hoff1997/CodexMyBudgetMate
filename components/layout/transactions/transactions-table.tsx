"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SplitEditor, type SplitResult } from "@/components/layout/reconcile/split-editor";
import type { TransactionRow } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useSwipeable } from "react-swipeable";
import { cn } from "@/lib/cn";

type TransactionItem = TransactionRow & {
  labels?: string[];
};

type Props = {
  transactions: TransactionRow[];
};

const UNASSIGNED_LABEL = "Unassigned";

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

type MobileTransactionListProps = {
  transactions: TransactionItem[];
  pendingIds: Set<string>;
  isRefreshing: boolean;
  activeId: string | null;
  onSelect: (transaction: TransactionItem) => void;
  onApprove: (transaction: TransactionItem) => void;
  onAssign: (transaction: TransactionItem) => void;
  onLabels: (transaction: TransactionItem) => void;
  onSplit: (transaction: TransactionItem) => void;
  swipedId: string | null;
  setSwipedId: (id: string | null) => void;
};

function MobileTransactionList({
  transactions,
  pendingIds,
  isRefreshing,
  activeId,
  onSelect,
  onApprove,
  onAssign,
  onLabels,
  onSplit,
  swipedId,
  setSwipedId,
}: MobileTransactionListProps) {
  if (!transactions.length) {
    return null;
  }
  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <MobileTransactionRow
          key={transaction.id}
          transaction={transaction}
          disabled={pendingIds.has(transaction.id) || isRefreshing}
          swiped={swipedId === transaction.id}
          active={activeId === transaction.id}
          onSwipeChange={(open) => setSwipedId(open ? transaction.id : null)}
          onSelect={() => {
            setSwipedId(null);
            onSelect(transaction);
          }}
          onApprove={() => onApprove(transaction)}
          onAssign={() => onAssign(transaction)}
          onLabels={() => onLabels(transaction)}
          onSplit={() => onSplit(transaction)}
        />
      ))}
    </div>
  );
}

type MobileTransactionRowProps = {
  transaction: TransactionItem;
  disabled: boolean;
  swiped: boolean;
  active: boolean;
  onSwipeChange: (open: boolean) => void;
  onSelect: () => void;
  onApprove: () => void;
  onAssign: () => void;
  onLabels: () => void;
  onSplit: () => void;
};

function MobileTransactionRow({
  transaction,
  disabled,
  swiped,
  active,
  onSwipeChange,
  onSelect,
  onApprove,
  onAssign,
  onLabels,
  onSplit,
}: MobileTransactionRowProps) {
  const status = (transaction.status ?? "pending").toLowerCase();
  const amount = Number(transaction.amount ?? 0);
  const isExpense = amount < 0;
  const handlers = useSwipeable({
    onSwipedLeft: () => onSwipeChange(true),
    onSwipedRight: () => onSwipeChange(false),
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition",
        active && "border-primary bg-primary/5",
      )}
    >
      <div className="absolute inset-y-0 right-0 flex w-56 items-stretch justify-between bg-muted/60 px-2">
        <button
          type="button"
          onClick={() => {
            onSwipeChange(false);
            onApprove();
          }}
          disabled={disabled || status === "approved"}
          className="my-2 flex-1 rounded-xl bg-emerald-500 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => {
            onSwipeChange(false);
            onAssign();
          }}
          disabled={disabled}
          className="my-2 flex-1 rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Assign
        </button>
        <button
          type="button"
          onClick={() => {
            onSwipeChange(false);
            onLabels();
          }}
          disabled={disabled}
          className="my-2 flex-1 rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Labels
        </button>
        <button
          type="button"
          onClick={() => {
            onSwipeChange(false);
            onSplit();
          }}
          disabled={disabled}
          className="my-2 flex-1 rounded-xl bg-muted/80 text-xs font-semibold text-secondary transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Split
        </button>
      </div>
      <div
        {...handlers}
        className={cn(
          "relative bg-white transition-transform duration-200 ease-out",
          swiped ? "-translate-x-56" : "translate-x-0",
        )}
      >
        <button
          type="button"
          className="flex w-full flex-col gap-2 px-4 py-3 text-left"
          onClick={() => {
            onSwipeChange(false);
            onSelect();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-secondary">
                {transaction.merchant_name}
              </p>
              {transaction.description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {transaction.description}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isExpense ? "text-rose-600" : "text-emerald-600",
                )}
              >
                {formatCurrency(amount)}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{status}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{transaction.envelope_name ?? "Unassigned"}</span>
            <span>{transaction.account_name ?? "No account"}</span>
            <span>
              {new Date(transaction.occurred_at).toLocaleDateString("en-NZ", { dateStyle: "medium" })}
            </span>
          </div>
          {transaction.labels?.length ? (
            <div className="flex flex-wrap gap-1">
              {transaction.labels.slice(0, 3).map((label) => (
                <span key={label} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {label}
                </span>
              ))}
              {transaction.labels.length > 3 ? (
                <span className="text-[10px] text-muted-foreground">
                  +{transaction.labels.length - 3} more
                </span>
              ) : null}
            </div>
          ) : null}
        </button>
      </div>
    </div>
  );
}

type MobileTransactionDetailProps = {
  transaction: TransactionItem;
  disabled: boolean;
  onApprove: () => void;
  onAssign: () => void;
  onLabels: () => void;
  onSplitToggle: () => void;
  splitOpen: boolean;
  children?: React.ReactNode;
};

function MobileTransactionDetail({
  transaction,
  disabled,
  onApprove,
  onAssign,
  onLabels,
  onSplitToggle,
  splitOpen,
  children,
}: MobileTransactionDetailProps) {
  const status = (transaction.status ?? "pending").toLowerCase();
  const amount = Number(transaction.amount ?? 0);
  const amountTone = amount < 0 ? "text-rose-600" : "text-emerald-600";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-xl font-semibold", amountTone)}>
          {formatCurrency(amount)}
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {status}
        </span>
      </div>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Envelope</dt>
          <dd className="mt-1 text-secondary">
            {transaction.envelope_name ?? "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Account</dt>
          <dd className="mt-1 text-secondary">
            {transaction.account_name ?? "No account"}
          </dd>
        </div>
        {transaction.bank_reference ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Bank ref</dt>
            <dd className="mt-1 text-secondary">{transaction.bank_reference}</dd>
          </div>
        ) : null}
        {transaction.bank_memo ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Memo</dt>
            <dd className="mt-1 text-secondary">{transaction.bank_memo}</dd>
          </div>
        ) : null}
        {transaction.labels?.length ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Labels</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {transaction.labels.map((label) => (
                <span key={label} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {label}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {transaction.receipt_url ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Receipt</dt>
            <dd className="mt-1">
              <a
                href={transaction.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary underline"
              >
                View receipt
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="secondary"
          disabled={disabled || status === "approved"}
          onClick={onApprove}
        >
          {status === "approved" ? "Approved" : "Approve transaction"}
        </Button>
        <Button variant="outline" disabled={disabled} onClick={onAssign}>
          Assign envelope
        </Button>
        <Button variant="outline" disabled={disabled} onClick={onLabels}>
          Update labels
        </Button>
        <Button variant="outline" disabled={disabled} onClick={onSplitToggle}>
          {splitOpen ? "Close split editor" : "Split transaction"}
        </Button>
      </div>

      {splitOpen ? children : null}
    </div>
  );
}

export function TransactionsTable({ transactions }: Props) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<TransactionItem[]>(
    transactions
      .filter((transaction) => (transaction.duplicate_status ?? "pending") !== "merged")
      .map((transaction) => ({
        ...transaction,
        duplicate_status: transaction.duplicate_status ?? "pending",
        labels: Array.isArray(transaction.labels) ? [...transaction.labels] : [],
      })),
  );
  const [splitTargetId, setSplitTargetId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(
    transactions.length ? transactions[0].id : null,
  );
  const approveShortcutRef = useRef<(tx: TransactionItem) => Promise<void>>(async () => {});
  const labelShortcutRef = useRef<(tx: TransactionItem) => Promise<void>>(async () => {});
  const [detailTransactionId, setDetailTransactionId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);
  const [envelopeFilter, setEnvelopeFilter] = useState<string[]>([]);

  useEffect(() => {
    if (datePreset === "custom") return;
    const range = getPresetRange(datePreset);
    if (!range) return;
    setDateFrom(range.from);
    setDateTo(range.to);
  }, [datePreset]);

  const labelOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      (item.labels ?? []).forEach((label) => {
        const trimmed = label.trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      set.add(item.account_name ?? UNASSIGNED_LABEL);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const envelopeOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      set.add(item.envelope_name ?? UNASSIGNED_LABEL);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const min = amountMin.trim() ? Number(amountMin) : null;
    const max = amountMax.trim() ? Number(amountMax) : null;
    const searchLower = search.toLowerCase();
    const labelSet = new Set(labelFilter.map((label) => label.toLowerCase()));
    const accountSet = new Set(accountFilter);
    const envelopeSet = new Set(envelopeFilter);

    return items.filter((item) => {
      if (searchLower) {
        const text = `${item.merchant_name} ${item.description ?? ""} ${item.bank_memo ?? ""}`.toLowerCase();
        if (!text.includes(searchLower)) return false;
      }
      const occurred = new Date(item.occurred_at).toISOString().slice(0, 10);
      if (dateFrom && occurred < dateFrom) return false;
      if (dateTo && occurred > dateTo) return false;
      const amount = Number(item.amount ?? 0);
      if (min !== null && Number.isFinite(min) && amount < min) return false;
      if (max !== null && Number.isFinite(max) && amount > max) return false;
      if (labelSet.size) {
        const labels = (item.labels ?? []).map((label) => label.toLowerCase());
        const hasMatch = labels.some((label) => labelSet.has(label));
        if (!hasMatch) return false;
      }
      if (accountSet.size) {
        const accountName = item.account_name ?? UNASSIGNED_LABEL;
        if (!accountSet.has(accountName)) return false;
      }
      if (envelopeSet.size) {
        const envelopeName = item.envelope_name ?? UNASSIGNED_LABEL;
        if (!envelopeSet.has(envelopeName)) return false;
      }
      return true;
    });
  }, [items, search, dateFrom, dateTo, amountMin, amountMax, labelFilter, accountFilter, envelopeFilter]);

  useEffect(() => {
    if (!filteredItems.length) {
      setActiveRowId(null);
      return;
    }
    setActiveRowId((prev) => (prev && filteredItems.some((item) => item.id === prev) ? prev : filteredItems[0].id));
  }, [filteredItems]);

  const activeTransaction = useMemo(
    () => (activeRowId ? filteredItems.find((item) => item.id === activeRowId) ?? null : null),
    [filteredItems, activeRowId],
  );

  approveShortcutRef.current = approveTransaction;
  labelShortcutRef.current = updateLabels;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!filteredItems.length) return;
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
      const index = activeRowId ? filteredItems.findIndex((item) => item.id === activeRowId) : -1;

      if (key === "arrowdown") {
        event.preventDefault();
        const nextIndex = index >= 0 ? Math.min(filteredItems.length - 1, index + 1) : 0;
        setActiveRowId(filteredItems[nextIndex]?.id ?? null);
        return;
      }

      if (key === "arrowup") {
        event.preventDefault();
        if (!filteredItems.length) return;
        const nextIndex = index > 0 ? index - 1 : 0;
        setActiveRowId(filteredItems[nextIndex]?.id ?? null);
        return;
      }

      if (!activeTransaction) return;

      if (key === "a") {
        event.preventDefault();
        if ((activeTransaction.status ?? "").toLowerCase() !== "approved") {
          void approveShortcutRef.current(activeTransaction);
        }
        return;
      }

      if (key === "s") {
        event.preventDefault();
        setSplitTargetId((prev) => (prev === activeTransaction.id ? null : activeTransaction.id));
        setDetailTransactionId(activeTransaction.id);
        return;
      }

      if (key === "l") {
        event.preventDefault();
        void labelShortcutRef.current(activeTransaction);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filteredItems, activeRowId, activeTransaction]);

  function markPending(id: string) {
    setPendingIds((prev) => new Set(prev).add(id));
  }

  function clearPending(id: string) {
    setPendingIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  }

  function updateTransaction(id: string, updater: (transaction: TransactionItem) => TransactionItem) {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  }

  function applySplitResult(result: SplitResult) {
    const summary =
      result.splits.length === 1 ? result.splits[0].envelopeName : "Split across envelopes";
    updateTransaction(result.transaction.id, (transaction) => ({
      ...transaction,
      envelope_name: summary,
    }));
    startTransition(() => router.refresh());
  }

  async function approveTransaction(transaction: TransactionItem) {
    markPending(transaction.id);
    const previousStatus = transaction.status;
    updateTransaction(transaction.id, (item) => ({ ...item, status: "approved" }));

    try {
      const response = await fetch(`/api/transactions/${transaction.id}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success("Transaction approved");
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      updateTransaction(transaction.id, (item) => ({ ...item, status: previousStatus }));
      toast.error("Failed to approve transaction");
    } finally {
      clearPending(transaction.id);
    }
  }

  async function assignEnvelope(transaction: TransactionItem) {
    const value = prompt(
      "Assign to which envelope? (case insensitive match)",
      transaction.envelope_name ?? "",
    );
    if (value === null) return;

    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Envelope name is required");
      return;
    }

    markPending(transaction.id);
    const previous = { ...transaction };
    updateTransaction(transaction.id, (item) => ({
      ...item,
      envelope_name: trimmed,
      status: item.status === "unmatched" ? "pending" : item.status,
    }));

    try {
      const response = await fetch(`/api/transactions/${transaction.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelopeName: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to assign envelope" }));
        throw new Error(payload.error ?? "Unable to assign envelope");
      }

      const payload = (await response.json()) as {
        transaction: { status: string; envelope: { name: string | null } };
      };

      updateTransaction(transaction.id, (item) => ({
        ...item,
        envelope_name: payload.transaction.envelope.name ?? trimmed,
        status: payload.transaction.status ?? item.status,
      }));
      toast.success("Envelope assigned");
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      updateTransaction(transaction.id, () => previous);
      toast.error(error instanceof Error ? error.message : "Unable to assign envelope");
    } finally {
      clearPending(transaction.id);
    }
  }

  async function updateLabels(transaction: TransactionItem) {
    const value = prompt(
      "Comma-separated labels (leave blank to clear)",
      transaction.labels?.join(", ") ?? "",
    );
    if (value === null) return;

    const labels = value
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    markPending(transaction.id);
    const previous = { ...transaction, labels: [...(transaction.labels ?? [])] };
    updateTransaction(transaction.id, (item) => ({ ...item, labels }));

    try {
      const response = await fetch(`/api/transactions/${transaction.id}/labels`, {
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

      updateTransaction(transaction.id, (item) => ({
        ...item,
        labels: payload.transaction.labels?.map((label) => label.name) ?? [],
      }));
      toast.success(labels.length ? "Labels updated" : "Labels cleared");
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      updateTransaction(transaction.id, () => previous);
      toast.error(error instanceof Error ? error.message : "Unable to update labels");
    } finally {
      clearPending(transaction.id);
    }
  }

  const splitTarget = splitTargetId ? items.find((item) => item.id === splitTargetId) : null;
  const detailTransaction = detailTransactionId
    ? items.find((item) => item.id === detailTransactionId) ?? null
    : null;

  useEffect(() => {
    if (detailTransactionId && !items.some((item) => item.id === detailTransactionId)) {
      setDetailTransactionId(null);
    }
  }, [detailTransactionId, items]);
  const handleResetFilters = () => {
    setSearch("");
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setDatePreset("this-month");
    setAmountMin("");
    setAmountMax("");
    setLabelFilter([]);
    setAccountFilter([]);
    setEnvelopeFilter([]);
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-muted/10 p-4 md:grid-cols-6">
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
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset filters
            </Button>
          </div>
          <div className="space-x-2 text-xs text-muted-foreground">
            <span>{filteredItems.length} of {items.length} transactions</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <MobileTransactionList
          transactions={filteredItems}
          pendingIds={pendingIds}
          isRefreshing={isRefreshing}
          activeId={activeRowId}
          onSelect={(transaction) => {
            setActiveRowId(transaction.id);
            setDetailTransactionId(transaction.id);
          }}
          onApprove={(transaction) => {
            setActiveRowId(transaction.id);
            void approveTransaction(transaction);
          }}
          onAssign={(transaction) => {
            setActiveRowId(transaction.id);
            void assignEnvelope(transaction);
          }}
          onLabels={(transaction) => {
            setActiveRowId(transaction.id);
            void updateLabels(transaction);
          }}
          onSplit={(transaction) => {
            setActiveRowId(transaction.id);
            setDetailTransactionId(transaction.id);
            setSplitTargetId(transaction.id);
          }}
          swipedId={swipedId}
          setSwipedId={setSwipedId}
        />
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            {items.length
              ? "No transactions match your filters. Adjust the filters above to see more results."
              : "No transactions yet. Import data from Akahu to get started."}
          </div>
        ) : null}
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Merchant</th>
                <th className="px-6 py-3">Envelope</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Labels</th>
                <th className="px-6 py-3">Bank ref</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((transaction) => {
            const status = transaction.status?.toLowerCase() ?? "pending";
            const disabled = pendingIds.has(transaction.id) || isRefreshing;

            return (
              <tr
                key={transaction.id}
                className={cn(
                  "text-sm align-top transition",
                  transaction.id === activeRowId && "bg-primary/5",
                )}
                tabIndex={0}
                onClick={() => setActiveRowId(transaction.id)}
                onFocus={() => setActiveRowId(transaction.id)}
                aria-selected={transaction.id === activeRowId}
              >
                <td className="px-6 py-3 font-medium text-secondary">
                  <div className="flex items-center gap-2">
                    {transaction.merchant_name}
                    {status === "unmatched" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                        Needs review
                      </span>
                    ) : status === "approved" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        ✓
                      </span>
                    ) : status === "pending" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        ⏳
                      </span>
                    ) : null}
                  </div>
                  {transaction.description ? (
                    <p className="text-xs text-muted-foreground">{transaction.description}</p>
                  ) : null}
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {transaction.envelope_name ?? "Unassigned"}
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {transaction.account_name ?? "—"}
                </td>
                <td className="px-6 py-3 font-medium">
                  {formatCurrency(Number(transaction.amount ?? 0))}
                </td>
                <td className="px-6 py-3 capitalize text-muted-foreground">{status}</td>
                <td className="px-6 py-3 text-muted-foreground">
                  {new Intl.DateTimeFormat("en-NZ", {
                    dateStyle: "medium",
                  }).format(new Date(transaction.occurred_at))}
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  <div className="flex flex-wrap gap-2">
                    {transaction.labels?.length ? (
                      transaction.labels.map((label) => (
                        <span key={label} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No labels</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  <div className="space-y-1">
                    {transaction.bank_reference ? <p>Ref {transaction.bank_reference}</p> : null}
                    {transaction.bank_memo ? (
                      <p className="text-xs text-muted-foreground">{transaction.bank_memo}</p>
                    ) : null}
                    {transaction.receipt_url ? (
                      <a
                        className="text-xs text-primary underline"
                        href={transaction.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View receipt
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setActiveRowId(transaction.id);
                        setSplitTargetId((current) =>
                          current === transaction.id ? null : transaction.id,
                        );
                      }}
                    >
                      Split
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setActiveRowId(transaction.id);
                        void updateLabels(transaction);
                      }}
                    >
                      Labels
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setActiveRowId(transaction.id);
                        void assignEnvelope(transaction);
                      }}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={disabled || status === "approved"}
                      onClick={() => {
                        setActiveRowId(transaction.id);
                        void approveTransaction(transaction);
                      }}
                    >
                      {status === "approved" ? "Approved" : "Approve"}
                    </Button>
                  </div>
                  {splitTargetId === transaction.id && splitTarget ? (
                    <div className="mt-4 rounded-lg border border-dashed bg-muted/10 p-4">
                      <SplitEditor
                        transactionId={splitTarget.id}
                        amount={Number(splitTarget.amount ?? 0)}
                        onClose={() => setSplitTargetId(null)}
                        onSaved={applySplitResult}
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {filteredItems.length === 0 ? (
            <tr>
              <td className="px-6 py-10 text-center text-sm text-muted-foreground" colSpan={9}>
                {items.length
                  ? "No transactions match your filters. Adjust the filters above to see more results."
                  : "No transactions yet. Import data from Akahu to get started."}
              </td>
            </tr>
          ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <BottomSheet
        open={Boolean(detailTransaction)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTransactionId(null);
            setSwipedId(null);
            setSplitTargetId(null);
          }
        }}
        title={detailTransaction?.merchant_name ?? "Transaction"}
        description={detailTransaction ? new Date(detailTransaction.occurred_at).toLocaleDateString("en-NZ", { dateStyle: "medium" }) : undefined}
      >
        {detailTransaction ? (
          <MobileTransactionDetail
            transaction={detailTransaction}
            disabled={pendingIds.has(detailTransaction.id) || isRefreshing}
            onApprove={() => {
              setActiveRowId(detailTransaction.id);
              void approveTransaction(detailTransaction);
            }}
            onAssign={() => {
              setActiveRowId(detailTransaction.id);
              void assignEnvelope(detailTransaction);
            }}
            onLabels={() => {
              setActiveRowId(detailTransaction.id);
              void updateLabels(detailTransaction);
            }}
            onSplitToggle={() => {
              setActiveRowId(detailTransaction.id);
              setSplitTargetId((current) =>
                current === detailTransaction.id ? null : detailTransaction.id,
              );
            }}
            splitOpen={splitTargetId === detailTransaction.id && Boolean(splitTarget)}
          >
            {splitTargetId === detailTransaction.id && splitTarget ? (
              <div className="mt-4 rounded-lg border border-dashed bg-muted/10 p-4">
                <SplitEditor
                  transactionId={splitTarget.id}
                  amount={Number(splitTarget.amount ?? 0)}
                  onClose={() => setSplitTargetId(null)}
                  onSaved={applySplitResult}
                />
              </div>
            ) : null}
          </MobileTransactionDetail>
        ) : null}
      </BottomSheet>
    </section>
  );
}
