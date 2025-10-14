"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EnvelopeForm() {
  const [envelopeName, setEnvelopeName] = useState("");
  const [category, setCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [payCycleAmount, setPayCycleAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDue, setNextDue] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [isSpending, setIsSpending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: wire up Supabase mutation
    setMessage(
      `Envelope '${envelopeName}' created with ${frequency} target $${targetAmount}${
        isSpending ? " (spending account)" : ""
      }. (Simulated)`,
    );
    setEnvelopeName("");
    setCategory("");
    setTargetAmount("");
    setPayCycleAmount("");
    setFrequency("monthly");
    setNextDue("");
    setOpeningBalance("");
    setIsSpending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-secondary">Add a new envelope</h2>
        <p className="text-sm text-muted-foreground">
          Quick capture for trial budgets while Supabase mutations are being wired up.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          type="text"
          placeholder="Envelope name"
          value={envelopeName}
          onChange={(event) => setEnvelopeName(event.target.value)}
          required
        />
        <Input
          type="text"
          placeholder="Category or group"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <Input
          type="number"
          placeholder="Target amount"
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
          required
        />
        <Input
          type="number"
          placeholder="Per pay contribution"
          value={payCycleAmount}
          onChange={(event) => setPayCycleAmount(event.target.value)}
        />
        <select
          className="h-10 w-full rounded-md border px-3 text-sm"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
        <Input
          type="date"
          placeholder="Next due"
          value={nextDue}
          onChange={(event) => setNextDue(event.target.value)}
        />
        <Input
          type="number"
          placeholder="Opening balance"
          value={openingBalance}
          onChange={(event) => setOpeningBalance(event.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={isSpending}
          onChange={(event) => setIsSpending(event.target.checked)}
        />
        Treat as spending account (skip projections)
      </label>
      <Button type="submit" className="w-full md:w-auto">
        Add envelope
      </Button>
      {message && <p className="text-sm text-primary">{message}</p>}
    </form>
  );
}
