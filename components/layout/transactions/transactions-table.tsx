"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SplitEditor, type SplitResult } from "@/components/layout/reconcile/split-editor";
import type { TransactionRow } from "@/lib/auth/types";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";

type TransactionItem = TransactionRow & {
  labels?: string[];
};

type Props = {
  transactions: TransactionRow[];
};

export function TransactionsTable({ transactions }: Props) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<TransactionItem[]>(
    transactions.map((transaction) => ({
      ...transaction,
      labels: Array.isArray(transaction.labels) ? [...transaction.labels] : [],
    })),
  );
  const [splitTargetId, setSplitTargetId] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

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

  return (
    <section className="overflow-hidden rounded-xl border">
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
          {items.map((transaction) => {
            const status = transaction.status?.toLowerCase() ?? "pending";
            const disabled = pendingIds.has(transaction.id) || isRefreshing;

            return (
              <tr key={transaction.id} className="text-sm align-top">
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
                      onClick={() => setSplitTargetId((current) => (current === transaction.id ? null : transaction.id))}
                    >
                      Split
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={disabled}
                      onClick={() => updateLabels(transaction)}
                    >
                      Labels
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={disabled}
                      onClick={() => assignEnvelope(transaction)}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={disabled || status === "approved"}
                      onClick={() => approveTransaction(transaction)}
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
          {!items.length && (
            <tr>
              <td className="px-6 py-10 text-center text-sm text-muted-foreground" colSpan={9}>
                No transactions yet. Import data from Akahu to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
