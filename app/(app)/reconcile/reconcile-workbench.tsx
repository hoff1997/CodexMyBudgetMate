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
import { SplitEditor, type SplitResult } from "@/components/layout/reconcile/split-editor";
import Link from "next/link";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useRouter } from "next/navigation";

type WorkbenchRow = TransactionRow & {
  labels?: string[];
};

function duplicateKey(transaction: WorkbenchRow) {
  const reference = transaction.bank_reference?.trim().toLowerCase();
  if (reference) return reference;
  const merchant = transaction.merchant_name?.trim().toLowerCase();
  if (!merchant) return null;
  const amount = Number(transaction.amount ?? 0).toFixed(2);
  const date = new Date(transaction.occurred_at).toISOString().slice(0, 10);
  return `${merchant}::${amount}::${date}`;
}

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
  const [search, setSearch] = useState("");
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

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
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [receiptTransactionId, setReceiptTransactionId] = useState<string | null>(null);
  const [splitTransactionId, setSplitTransactionId] = useState<string | null>(null);
  const [sheetTransaction, setSheetTransaction] = useState<WorkbenchRow | null>(null);
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

async function handleResolveDuplicate(tx: WorkbenchRow) {
  const key = duplicateKey(tx);
  if (!key) {
    toast.info("No duplicate key available for this transaction.");
    return;
  }

  const group = duplicateGroups.get(key) ?? [];
  const candidates = group.filter((candidate) => candidate.id !== tx.id);

  if (!candidates.length) {
    toast.info("No matching duplicates found to resolve.");
    return;
  }

  const options = candidates
    .map((candidate, index) => {
      const amount = formatCurrency(Number(candidate.amount ?? 0));
      const occurred = new Date(candidate.occurred_at).toLocaleDateString("en-NZ", {
        dateStyle: "medium",
      });
      return `${index + 1}. ${candidate.merchant_name} · ${amount} · ${occurred}`;
    })
    .join("\n");

  const choiceRaw = window.prompt(
    `Resolve duplicate for ${tx.merchant_name}.\nSelect the matching transaction:\n${options}`,
    "1",
  );

  if (!choiceRaw) return;
  const choiceIndex = Number.parseInt(choiceRaw, 10) - 1;
  if (!Number.isFinite(choiceIndex) || choiceIndex < 0 || choiceIndex >= candidates.length) {
    toast.error("Invalid selection.");
    return;
  }

  const decisionRaw = window.prompt(
    'Type "merge" to combine or "ignore" to dismiss future duplicate alerts.',
    "merge",
  );
  if (!decisionRaw) return;
  const decision = decisionRaw.trim().toLowerCase();
  if (decision !== "merge" && decision !== "ignore") {
    toast.error("Decision must be either merge or ignore.");
    return;
  }

  const noteInput = window.prompt("Optional note for audit (press cancel to skip).") ?? undefined;

  const target = candidates[choiceIndex];

  try {
    const response = await fetch(`/api/transactions/${tx.id}/duplicates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateId: target.id, decision, note: noteInput }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to resolve duplicate" }));
      throw new Error(payload.error ?? "Unable to resolve duplicate");
    }

    const payload = (await response.json()) as {
      transactions?: Array<{
        id: string;
        duplicate_of: string | null;
        duplicate_status: string | null;
        duplicate_reviewed_at: string | null;
      }>;
    };

    setRows((prev) => {
      let next = prev.map((row) => {
        const match = payload.transactions?.find((item) => item.id === row.id);
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
        next = next.filter((row) => row.id !== target.id);
      }

      return next;
    });

    toast.success(
      decision === "merge"
        ? "Duplicate merged successfully"
        : "Duplicate dismissed for future imports",
    );
    router.refresh();
  } catch (error) {
    console.error(error);
    toast.error(error instanceof Error ? error.message : "Unable to resolve duplicate");
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
              {filtered.map((tx) => {
                const status = normaliseStatus(tx.status);
                const duplicateCount = (() => {
                  const keyValue = duplicateKey(tx);
                  return keyValue ? duplicates.get(keyValue) ?? 0 : 0;
                })();
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
                            onClick={() => handleLabels(tx)}
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
                            onClick={() => handleAssign(tx)}
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
