"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Split {
  id: string;
  envelope: string;
  amount: number;
}

export type SplitResult = {
  transaction: {
    id: string;
    amount: number;
  };
  splits: Array<{
    id: string;
    transactionId: string;
    envelopeId: string;
    envelopeName: string;
    amount: number;
  }>;
};

interface Props {
  transactionId: string;
  amount: number;
  onClose: () => void;
  onSaved?: (result: SplitResult) => void;
  demo?: boolean;
}

export function SplitEditor({
  transactionId,
  amount,
  onClose,
  onSaved,
  demo = false,
}: Props) {
  const [splits, setSplits] = useState<Split[]>([
    { id: crypto.randomUUID(), envelope: "", amount },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSplits([{ id: crypto.randomUUID(), envelope: "", amount }]);
  }, [amount]);

  function updateSplit(id: string, key: "envelope" | "amount", value: string) {
    setSplits((prev) =>
      prev.map((split) =>
        split.id === id
          ? {
              ...split,
              [key]: key === "amount" ? Number(value) : value,
            }
          : split,
      ),
    );
  }

  function addSplit() {
    setSplits((prev) => [...prev, { id: crypto.randomUUID(), envelope: "", amount: 0 }]);
  }

  function removeSplit(id: string) {
    setSplits((prev) => prev.filter((split) => split.id !== id));
  }

  const splitTotal = useMemo(
    () => splits.reduce((sum, split) => sum + Number(split.amount ?? 0), 0),
    [splits],
  );
  const remaining = useMemo(() => amount - splitTotal, [amount, splitTotal]);
  const outOfBalance = Math.abs(remaining) > 0.01;

  async function handleSave() {
    setError(null);
    if (outOfBalance) {
      setError("Split amounts must balance the transaction");
      return;
    }

    if (!splits.every((split) => split.envelope.trim())) {
      setError("Each split requires an envelope");
      return;
    }

    const resultFromState: SplitResult = {
      transaction: {
        id: transactionId,
        amount,
      },
      splits: splits.map((split) => ({
        id: split.id,
        transactionId,
        envelopeId: split.envelope.trim(),
        envelopeName: split.envelope.trim(),
        amount: Number(split.amount ?? 0),
      })),
    };

    if (demo || transactionId.startsWith("demo-")) {
      toast.success("Split saved (demo)");
      onSaved?.(resultFromState);
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splits: splits.map((split) => ({
            envelopeName: split.envelope.trim(),
            amount: Number(split.amount ?? 0),
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to save split" }));
        throw new Error(payload.error ?? "Unable to save split");
      }

      const payload = (await response.json()) as SplitResult;

      toast.success("Split saved");
      onSaved?.(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to save split");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-4 text-sm">
      <h4 className="font-semibold text-secondary">Split transaction</h4>
      <p className="text-xs text-muted-foreground">
        Original amount ${amount.toFixed(2)}. Allocate across envelopes below. Splits are persisted to Supabase
        and track the same workflow the Replit build used.
      </p>
      <div className="mt-3 space-y-3">
        {splits.map((split) => (
          <div key={split.id} className="grid gap-2 md:grid-cols-[2fr,1fr,auto]">
            <Input
              placeholder="Envelope name"
              value={split.envelope}
              onChange={(event) => updateSplit(split.id, "envelope", event.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={split.amount}
              onChange={(event) => updateSplit(split.id, "amount", event.target.value)}
            />
            <Button variant="ghost" size="sm" onClick={() => removeSplit(split.id)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addSplit}>
          Add split line
        </Button>
        <p className={`text-xs ${outOfBalance ? "text-destructive" : "text-muted-foreground"}`}>
          {outOfBalance
            ? `Remaining: $${remaining.toFixed(2)} – adjust amounts to balance`
            : "Balanced"}
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || outOfBalance}>
            {isSaving ? "Saving…" : "Save split"}
          </Button>
        </div>
      </div>
    </div>
  );
}
