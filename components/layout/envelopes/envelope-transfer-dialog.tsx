"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import type { TransferHistoryItem } from "@/lib/types/envelopes";
import { formatCurrency } from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  envelopes: SummaryEnvelope[];
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: number;
  history?: TransferHistoryItem[];
  onTransferComplete?: () => void;
}

export function EnvelopeTransferDialog({
  open,
  onOpenChange,
  envelopes,
  defaultFromId,
  defaultToId,
  defaultAmount,
  history,
  onTransferComplete,
}: Props) {
  const [fromId, setFromId] = useState(defaultFromId ?? "");
  const [toId, setToId] = useState(defaultToId ?? "");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fromEnvelope = useMemo(
    () => envelopes.find((env) => env.id === fromId),
    [envelopes, fromId],
  );
  const toEnvelope = useMemo(
    () => envelopes.find((env) => env.id === toId),
    [envelopes, toId],
  );
  const availableBalance = Number(fromEnvelope?.current_amount ?? 0);

  useEffect(() => {
    if (!open) return;
    setFromId(defaultFromId ?? "");
    setToId(defaultToId ?? "");
    setAmount(defaultAmount ? String(defaultAmount) : "");
    setError(null);
    setSuccessMessage(null);
  }, [open, defaultFromId, defaultToId, defaultAmount]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const parsedAmount = Number(amount);
    if (!fromId || !toId) {
      setError("Select both sender and recipient envelopes.");
      setSaving(false);
      return;
    }
    if (fromId === toId) {
      setError("Choose different envelopes.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid transfer amount.");
      setSaving(false);
      return;
    }
    if (parsedAmount > availableBalance + 0.005) {
      setError("Transfer amount exceeds available balance.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/envelopes/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromId,
          toId,
          amount: Number(parsedAmount.toFixed(2)),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Transfer failed" }));
        setError(data.error ?? "Transfer failed");
        return;
      }

      setSuccessMessage("Transfer completed.");
      onTransferComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setError(null);
          setSuccessMessage(null);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4 py-10">
          <form className="w-full max-w-2xl space-y-5 rounded-3xl border bg-background p-6 shadow-xl" onSubmit={handleSubmit}>
            <Dialog.Title className="text-lg font-semibold text-secondary">Transfer between envelopes</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Move funds between envelopes while keeping totals balanced.
            </Dialog.Description>
            <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary" htmlFor="transfer-from">
                  From envelope
                </label>
                <select
                  id="transfer-from"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={fromId}
                  onChange={(event) => setFromId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select envelope
                  </option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
                {fromEnvelope ? (
                  <p className="text-xs text-muted-foreground">
                    Balance {formatCurrency(Number(fromEnvelope.current_amount ?? 0))} · Target{" "}
                    {formatCurrency(Number(fromEnvelope.target_amount ?? 0))}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary" htmlFor="transfer-to">
                  To envelope
                </label>
                <select
                  id="transfer-to"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={toId}
                  onChange={(event) => setToId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select envelope
                  </option>
                  {envelopes
                    .filter((env) => env.id !== fromId)
                    .map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.name}
                      </option>
                    ))}
                </select>
                {toEnvelope ? (
                  <p className="text-xs text-muted-foreground">
                    Balance {formatCurrency(Number(toEnvelope.current_amount ?? 0))} · Target{" "}
                    {formatCurrency(Number(toEnvelope.target_amount ?? 0))}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary" htmlFor="transfer-amount">
                Amount
              </label>
              <Input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {fromEnvelope ? (
                <p className="text-xs text-muted-foreground">
                  Available to move: {formatCurrency(Math.max(0, availableBalance))}
                </p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Transferring…" : "Transfer"}
              </Button>
            </div>
            <HistoryList history={history} />
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HistoryList({ history }: { history?: TransferHistoryItem[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
        Transfers you make will appear here for quick reference.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-secondary">Recent transfers</h3>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {history.slice(0, 6).map((item) => (
          <li key={item.id} className="rounded-lg border bg-background px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span>
                {item.from.name ?? "Unknown"} → {item.to.name ?? "Unknown"}
              </span>
              <span className="font-medium text-secondary">{formatCurrency(item.amount)}</span>
            </div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
              {new Date(item.createdAt).toLocaleString("en-NZ", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            {item.note ? <p className="mt-1 text-muted-foreground">{item.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
