"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import type { TransactionRow } from "@/lib/auth/types";
import { toast } from "sonner";
import { SmartSuggestionsBanner } from "@/components/layout/reconcile/smart-suggestions";
import { CsvImportDialog } from "@/components/layout/reconcile/csv-import-dialog";
import { ReceiptUploadDialog } from "@/components/layout/reconcile/receipt-upload-dialog";
import { SplitEditor } from "@/components/layout/reconcile/split-editor";
import Link from "next/link";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

const demoTransactions: TransactionRow[] = [
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
  const [search, setSearch] = useState("");
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const usingDemo = transactions.length === 0;
  const initialRows = useMemo(
    () => (transactions.length ? transactions : demoTransactions),
    [transactions],
  );
  const [rows, setRows] = useState(initialRows);
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [receiptTransactionId, setReceiptTransactionId] = useState<string | null>(null);
  const [splitTransactionId, setSplitTransactionId] = useState<string | null>(null);
  const [sheetTransaction, setSheetTransaction] = useState<TransactionRow | null>(null);
  const isMobile = useIsMobile();

  const duplicates = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((tx) => {
      const ref = tx.bank_reference ?? tx.merchant_name;
      map.set(ref, (map.get(ref) ?? 0) + 1);
    });
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((tx) => {
      const status = normaliseStatus(tx.status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search) {
        const text = `${tx.merchant_name} ${tx.description ?? ""} ${tx.bank_memo ?? ""}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) {
          return false;
        }
      }
      const occurred = new Date(tx.occurred_at).toISOString().slice(0, 10);
      if (dateFrom && occurred < dateFrom) return false;
      if (dateTo && occurred > dateTo) return false;
      return true;
    });
  }, [rows, statusFilter, search, dateFrom, dateTo]);

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

function handleAction(action: string, merchant: string) {
  toast.success(`${action} queued`, {
    description: `${merchant} will move through the workflow once Supabase mutations are connected.`,
  });
}

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
  } catch (error) {
    console.error(error);
    toast.error("Failed to approve transaction");
    setRows((prev) =>
      prev.map((row) => (row.id === tx.id ? { ...row, status: tx.status } : row)),
    );
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

      <section className="grid gap-3 rounded-xl border bg-muted/10 p-4 md:grid-cols-5">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search merchant, memo, or label"
          className="md:col-span-2"
        />
        <Input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(event) => setDateFrom(event.target.value)}
          className="bg-background"
        />
        <Input
          type="date"
          value={dateTo}
          min={dateFrom}
          onChange={(event) => setDateTo(event.target.value)}
          className="bg-background"
        />
        <Button variant="outline" onClick={() => setCsvOpen(true)}>
          Import CSV
        </Button>
      </section>

      {isMobile ? (
        <MobileTransactionList
          transactions={filtered}
          duplicates={duplicates}
          onOpenSheet={setSheetTransaction}
          onAssign={(tx) => handleAction("Assign envelope", tx.merchant_name)}
          onApprove={handleApprove}
          onLabels={(tx) => handleAction("Label editor", tx.merchant_name)}
          onSplit={(tx) => {
            setSplitTransactionId(tx.id);
            setSheetTransaction(null);
          }}
          onReceipt={(tx) => {
            setReceiptTransactionId(tx.id);
            setSheetTransaction(null);
          }}
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
              {filtered.map((tx) => {
                const status = normaliseStatus(tx.status);
                const duplicateCount = duplicates.get(tx.bank_reference ?? tx.merchant_name) ?? 0;
                const duplicateFlag = duplicateCount > 1;
                return (
                  <Fragment key={tx.id}>
                    <tr className="text-sm">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-secondary flex items-center gap-2">
                          {tx.merchant_name}
                          {duplicateFlag ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                              Possible duplicate
                            </span>
                          ) : null}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction("Label editor", tx.merchant_name)}
                          >
                            Manage labels
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction("Assign envelope", tx.merchant_name)}
                          >
                            Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSplitTransactionId(tx.id)}
                          >
                            Split
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiptTransactionId(tx.id)}
                          >
                            Receipt
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApprove(tx)}
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
                            transactionId={tx.id}
                            amount={Number(tx.amount ?? 0)}
                            onClose={() => setSplitTransactionId(null)}
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
            transactionId={splitTarget.id}
            amount={Number(splitTarget.amount ?? 0)}
            onClose={() => setSplitTransactionId(null)}
            onSaved={async () => {
              toast.success("Split saved (demo)");
            }}
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
                    handleAction("Assign envelope", sheetTransaction.merchant_name);
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
    </div>
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

function MobileTransactionList({
  transactions,
  duplicates,
  onOpenSheet,
  onAssign,
  onApprove,
  onLabels,
  onSplit,
  onReceipt,
}: {
  transactions: TransactionRow[];
  duplicates: Map<string, number>;
  onOpenSheet: (transaction: TransactionRow) => void;
  onAssign: (transaction: TransactionRow) => void;
  onApprove: (transaction: TransactionRow) => void;
  onLabels: (transaction: TransactionRow) => void;
  onSplit: (transaction: TransactionRow) => void;
  onReceipt: (transaction: TransactionRow) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {transactions.length ? (
        transactions.map((transaction) => {
          const status = normaliseStatus(transaction.status);
          const duplicateCount =
            duplicates.get(transaction.bank_reference ?? transaction.merchant_name) ?? 0;
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
}: {
  transaction: TransactionRow;
  status: string;
  duplicateFlag: boolean;
  onOpenSheet: (transaction: TransactionRow) => void;
  onAssign: (transaction: TransactionRow) => void;
  onApprove: (transaction: TransactionRow) => void;
  onLabels: (transaction: TransactionRow) => void;
  onSplit: (transaction: TransactionRow) => void;
  onReceipt: (transaction: TransactionRow) => void;
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
            {duplicateFlag ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Possible duplicate
              </span>
            ) : null}
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
