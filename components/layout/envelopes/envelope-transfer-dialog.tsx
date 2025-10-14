"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  envelopes: SummaryEnvelope[];
  defaultFromId?: string;
  defaultToId?: string;
}

export function EnvelopeTransferDialog({ open, onOpenChange, envelopes, defaultFromId, defaultToId }: Props) {
  const [fromId, setFromId] = useState(defaultFromId ?? "");
  const [toId, setToId] = useState(defaultToId ?? "");
  const [amount, setAmount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4">
          <form
            className="w-full max-w-md space-y-4 rounded-3xl border bg-background p-6 shadow-xl"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              setError(null);
              try {
                const response = await fetch("/api/envelopes/transfer", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fromId,
                    toId,
                    amount: Number(amount),
                  }),
                });
                if (!response.ok) {
                  const data = await response.json().catch(() => ({ error: "Transfer failed" }));
                  setError(data.error ?? "Transfer failed");
                } else {
                  onOpenChange(false);
                  setAmount("0");
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Transfer failed");
              } finally {
                setSaving(false);
              }
            }}
          >
            <Dialog.Title className="text-lg font-semibold text-secondary">Transfer between envelopes</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Move funds between envelopes while keeping totals balanced.
            </Dialog.Description>
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
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Transferring…" : "Transfer"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
