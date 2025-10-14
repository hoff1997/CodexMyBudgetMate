"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/finance";
import { calculateRequiredContribution, PlannerFrequency, frequencyOptions } from "@/lib/planner/calculations";

interface IncomeStream {
  id: string;
  name: string;
  amount: number;
  frequency: PlannerFrequency;
  nextDate: string | null;
  allocations: Array<{ envelope: string; amount: number }>;
  surplusEnvelope?: string | null;
}

interface Props {
  incomeStreams: IncomeStream[];
  envelopeSummaries: Array<{ id: string; name: string; perPay: number }>;
}

export function RecurringIncomeClient({ incomeStreams, envelopeSummaries }: Props) {
  const [streams, setStreams] = useState(incomeStreams);
  const [selectedStream, setSelectedStream] = useState<IncomeStream | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<PlannerFrequency | "all">("all");

  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => {
      if (frequencyFilter !== "all" && stream.frequency !== frequencyFilter) return false;
      if (search && !stream.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [streams, frequencyFilter, search]);

  const monthlyIncome = filteredStreams.reduce(
    (total, stream) => total + toMonthly(stream.amount, stream.frequency),
    0,
  );

  const totalPerPayRequirement = envelopeSummaries.reduce((sum, envelope) => sum + envelope.perPay, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-secondary">Recurring income</h1>
        <p className="text-base text-muted-foreground">
          Capture salary, benefits, and recurring deposit streams. Edits sync with the planner and dashboard metrics.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Monthly income" value={formatCurrency(monthlyIncome)} />
        <MetricCard title="Per pay envelope requirement" value={formatCurrency(totalPerPayRequirement)} />
        <MetricCard
          title="Balance after allocations"
          value={formatCurrency(monthlyIncome - totalPerPayRequirement)}
        />
      </section>

      <Tabs defaultValue="streams" className="space-y-6">
        <TabsList>
          <TabsTrigger value="streams">Income streams</TabsTrigger>
          <TabsTrigger value="timeline">Per-pay timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="streams" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={frequencyFilter}
                onChange={(event) => setFrequencyFilter(event.target.value as PlannerFrequency | "all")}
              >
                <option value="all">All frequencies</option>
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                className="h-9"
                placeholder="Search streams"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/envelope-planning">Planner</Link>
              </Button>
              <Button onClick={() => setShowDrawer(true)}>Add income stream</Button>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredStreams.length ? (
              filteredStreams.map((stream) => (
                <Card key={stream.id} className="border border-primary/20 bg-white">
                  <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>{stream.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {stream.frequency} · {formatCurrency(stream.amount)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStream(stream);
                          setShowDrawer(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AllocationChart stream={stream} envelopeSummaries={envelopeSummaries} />
                    <div className="text-xs text-muted-foreground">
                      Surplus routed to {stream.surplusEnvelope ?? "unassigned"}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No recurring income streams yet. Add one above to start modelling your pay cycle.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineView streams={streams} />
        </TabsContent>
      </Tabs>

      <IncomeDrawer
        open={showDrawer}
        onOpenChange={(value) => {
          setShowDrawer(value);
          if (!value) setSelectedStream(null);
        }}
        stream={selectedStream}
        onSave={(updated) => {
          setStreams((prev) => {
            const exists = prev.find((item) => item.id === updated.id);
            if (exists) {
              return prev.map((item) => (item.id === updated.id ? updated : item));
            }
            return [updated, ...prev];
          });
        }}
      />
      <MobileNav />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-secondary">{value}</p>
      </CardContent>
    </Card>
  );
}

function toMonthly(amount: number, frequency: PlannerFrequency) {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "fortnightly":
      return (amount * 26) / 12;
    case "quarterly":
      return amount * 4;
    case "annually":
      return amount / 12;
    case "monthly":
    default:
      return amount;
  }
}

function getAllocations(stream: IncomeStream) {
  const allocationsTotal = stream.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const surplus = stream.amount - allocationsTotal;
  return { allocationsTotal, surplus };
}

function AllocationChart({
  stream,
  envelopeSummaries,
}: {
  stream: IncomeStream;
  envelopeSummaries: Array<{ id: string; name: string; perPay: number }>;
}) {
  const required = envelopeSummaries.reduce((sum, envelope) => sum + envelope.perPay, 0);
  const { allocationsTotal, surplus } = getAllocations(stream);
  const segmentWidth = (value: number) => `${Math.min(100, Math.max(0, (value / stream.amount) * 100))}%`;

  return (
    <div className="space-y-3">
      <div className="rounded-full bg-muted p-1">
        <div className="flex overflow-hidden rounded-full">
          {stream.allocations.map((allocation) => (
            <div
              key={allocation.envelope}
              className="flex items-center justify-center bg-primary/80 text-[10px] text-primary-foreground"
              style={{ width: segmentWidth(allocation.amount) }}
            >
              {allocation.envelope}
            </div>
          ))}
          {surplus > 0 ? (
            <div
              className="flex items-center justify-center bg-emerald-200 text-[10px] text-emerald-900"
              style={{ width: segmentWidth(surplus) }}
            >
              Surplus
            </div>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {stream.allocations.map((allocation) => (
          <div key={allocation.envelope} className="flex items-center justify-between rounded border bg-muted/40 px-3 py-2 text-xs">
            <span>{allocation.envelope}</span>
            <span>{formatCurrency(allocation.amount)}</span>
          </div>
        ))}
        {surplus > 0 ? (
          <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <span>Surplus</span>
            <span>{formatCurrency(surplus)}</span>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Your envelopes currently require {formatCurrency(required / (envelopeSummaries.length || 1))} per pay on
        average. Planner updates will adjust these suggestions automatically.
      </p>
    </div>
  );
}

function TimelineView({ streams }: { streams: IncomeStream[] }) {
  const today = new Date();
  const events = streams.flatMap((stream) => {
    const date = stream.nextDate ? new Date(stream.nextDate) : today;
    return {
      id: stream.id,
      name: stream.name,
      amount: stream.amount,
      date,
      frequency: stream.frequency,
    };
  });

  const sorted = events.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 12);

  return (
    <div className="space-y-3">
      {sorted.map((event) => (
        <div key={`${event.id}-${event.date.toISOString()}`} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-secondary">{event.name}</p>
            <p className="text-xs text-muted-foreground">
              {event.frequency} · {event.date.toLocaleDateString("en-NZ", { dateStyle: "medium" })}
            </p>
          </div>
          <div className="text-sm font-semibold text-secondary">{formatCurrency(event.amount)}</div>
        </div>
      ))}
    </div>
  );
}

function IncomeDrawer({
  open,
  onOpenChange,
  stream,
  onSave,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  stream: IncomeStream | null;
  onSave: (stream: IncomeStream) => void;
}) {
  const defaultStream: IncomeStream =
    stream ?? {
      id: crypto.randomUUID(),
      name: "",
      amount: 0,
      frequency: "fortnightly",
      nextDate: new Date().toISOString().slice(0, 10),
      allocations: [],
    };

  const [localStream, setLocalStream] = useState(defaultStream);

  return (
    <Dialog.Root open={open} onOpenChange={(value) => {
      onOpenChange(value);
      if (!value) {
        setLocalStream(defaultStream);
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-lg flex-col gap-4 bg-background p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-secondary">
            {stream ? "Edit income stream" : "New income stream"}
          </Dialog.Title>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(localStream);
              onOpenChange(false);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Name"
                required
                value={localStream.name}
                onChange={(event) =>
                  setLocalStream((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <Input
                placeholder="Amount"
                type="number"
                step="0.01"
                required
                value={localStream.amount}
                onChange={(event) =>
                  setLocalStream((prev) => ({ ...prev, amount: Number(event.target.value) }))
                }
              />
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={localStream.frequency}
                onChange={(event) =>
                  setLocalStream((prev) => ({
                    ...prev,
                    frequency: event.target.value as PlannerFrequency,
                  }))
                }
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={localStream.nextDate ?? ""}
                onChange={(event) =>
                  setLocalStream((prev) => ({ ...prev, nextDate: event.target.value }))
                }
              />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              {localStream.allocations.length ? "Edit allocations below" : "Add envelope allocations"}
            </div>
            <div className="space-y-3">
              {localStream.allocations.map((allocation, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[2fr,1fr,auto]">
                  <Input
                    placeholder="Envelope"
                    value={allocation.envelope}
                    onChange={(event) =>
                      setLocalStream((prev) => ({
                        ...prev,
                        allocations: prev.allocations.map((item, i) =>
                          i === index ? { ...item, envelope: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    step="0.01"
                    value={allocation.amount}
                    onChange={(event) =>
                      setLocalStream((prev) => ({
                        ...prev,
                        allocations: prev.allocations.map((item, i) =>
                          i === index ? { ...item, amount: Number(event.target.value) } : item,
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLocalStream((prev) => ({
                        ...prev,
                        allocations: prev.allocations.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLocalStream((prev) => ({
                    ...prev,
                    allocations: [...prev.allocations, { envelope: "", amount: 0 }],
                  }))
                }
              >
                Add allocation
              </Button>
            </div>
            <div className="mt-auto flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save stream</Button>
            </div>
          </form>
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
        <Link href="/recurring-income" className="text-primary font-semibold">
          Income
        </Link>
        <Link href="/envelope-planning" className="text-muted-foreground transition hover:text-primary">
          Planner
        </Link>
      </div>
    </nav>
  );
}
