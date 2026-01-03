"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/finance";
import { PlannerFrequency, calculateRequiredContribution, frequencyOptions } from "@/lib/planner/calculations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PayPlanSummary } from "@/lib/types/pay-plan";

type EnvelopeSummary = {
  id: string;
  name: string;
  perPay: number;
  annual: number;
  frequency: PlannerFrequency | null;
};

type IncomeAllocation = {
  envelope: string;
  amount: number;
  envelopeId?: string | null;
};

interface IncomeStream {
  id: string;
  name: string;
  amount: number;
  frequency: PlannerFrequency;
  nextDate: string | null;
  allocations: IncomeAllocation[];
  surplusEnvelope?: string | null;
}

interface Props {
  incomeStreams: IncomeStream[];
  envelopeSummaries: EnvelopeSummary[];
  payPlan?: PayPlanSummary | null;
  streamEvents?: Array<{
    streamId: string;
    transactionId: string;
    transactionAmount: number;
    expectedAmount: number | null;
    difference: number | null;
    appliedAt: string;
  }>;
}

export function RecurringIncomeClient({
  incomeStreams,
  envelopeSummaries,
  payPlan = null,
  streamEvents = [],
}: Props) {
  const router = useRouter();
  const [streams, setStreams] = useState(incomeStreams);
  const [selectedStream, setSelectedStream] = useState<IncomeStream | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<PlannerFrequency | "all">("all");
  const [applyingStreamId, setApplyingStreamId] = useState<string | null>(null);
  const primaryFrequency = useMemo(
    () => payPlan?.primaryFrequency ?? detectPrimaryFrequency(streams),
    [payPlan?.primaryFrequency, streams],
  );

  const planTotals = payPlan?.totals ?? null;
  const annualIncome = useMemo(
    () => streams.reduce((total, stream) => total + toAnnual(stream.amount, stream.frequency), 0),
    [streams],
  );
  const monthlyIncome = planTotals ? planTotals.annualIncome / 12 : annualIncome / 12;

  const annualRequirement = planTotals
    ? planTotals.annualAllocated
    : envelopeSummaries.reduce(
        (sum, envelope) => sum + envelopeAnnualRequirement(envelope, primaryFrequency),
        0,
      );
  const monthlyRequirement = annualRequirement / 12;

  const perPayIncome = planTotals
    ? planTotals.perPayIncome
    : calculateRequiredContribution(annualIncome, primaryFrequency);
  const perPayRequirement = planTotals
    ? planTotals.perPayAllocated
    : calculateRequiredContribution(annualRequirement, primaryFrequency);
  const monthlySurplus = monthlyIncome - monthlyRequirement;
  const perPaySurplus = perPayIncome - perPayRequirement;
  const needsTopUp = monthlySurplus < -1;
  const hasSurplus = monthlySurplus > 1;
  const perPayStrain = perPaySurplus < -0.5;

  const handleStreamSaved = (saved: IncomeStream) => {
    setStreams((prev) => {
      const index = prev.findIndex((item) => item.id === saved.id);
      if (index === -1) {
        return [saved, ...prev];
      }
      const copy = [...prev];
      copy[index] = saved;
      return copy;
    });
    setSelectedStream(null);
    setShowDrawer(false);
    router.refresh();
  };

  const handleStreamDeleted = (id: string) => {
    setStreams((prev) => prev.filter((item) => item.id !== id));
    setSelectedStream(null);
    setShowDrawer(false);
    router.refresh();
  };

  async function handleApplySurplus(stream: IncomeStream) {
    const { surplus } = getAllocations(stream);
    if (surplus <= 0.01) {
      toast.info("No surplus available to auto-allocate for this stream");
      return;
    }
    if (!stream.surplusEnvelope) {
      toast.error("Set a surplus envelope before applying the auto-allocation plan");
      return;
    }
    setApplyingStreamId(stream.id);
    try {
      const response = await fetch(`/api/recurring-income/${stream.id}/apply-surplus`, {
        method: "POST",
      });
      const result = await response
        .json()
        .catch(() => ({ error: "Unable to apply surplus plan" }));
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to apply surplus plan");
      }

      const appliedAmount = Number(result.applied ?? 0);
      if (appliedAmount > 0) {
        toast.success(`Applied ${formatCurrency(appliedAmount)} to underfunded envelopes`);
      } else {
        toast.info("Surplus plan applied, but no envelopes required top ups");
      }
      if (result.celebration?.title) {
        toast.success(result.celebration.title);
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to apply surplus plan");
    } finally {
      setApplyingStreamId(null);
    }
  }

  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => {
      if (frequencyFilter !== "all" && stream.frequency !== frequencyFilter) return false;
      if (search && !stream.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [streams, frequencyFilter, search]);

  const envelopeNameLookup = useMemo(
    () => new Map(envelopeSummaries.map((envelope) => [envelope.id, envelope.name])),
    [envelopeSummaries],
  );
  const payLabel = frequencyLabel(primaryFrequency);
  const payLabelLower = payLabel.toLowerCase();
  const planLookup = useMemo(() => {
    if (!payPlan) return new Map<string, PayPlanSummary["streams"][number]>();
    return new Map(payPlan.streams.map((stream) => [stream.id, stream]));
  }, [payPlan]);
  const eventLookup = useMemo(
    () => new Map(streamEvents.map((event) => [event.streamId, event])),
    [streamEvents],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-secondary">Recurring income</h1>
        <p className="text-base text-muted-foreground">
          Capture salary, benefits, and recurring deposit streams. Edits sync with the planner and dashboard metrics.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Monthly income"
          value={formatCurrency(monthlyIncome)}
          helper={`Per ${payLabelLower}: ${formatCurrency(perPayIncome)}`}
        />
        <MetricCard
          title="Monthly envelope requirement"
          value={formatCurrency(monthlyRequirement)}
          helper={`Per ${payLabelLower}: ${formatCurrency(perPayRequirement)}`}
        />
        <MetricCard
          title="Balance after allocations"
          value={formatCurrency(monthlySurplus)}
          tone={monthlySurplus >= 0 ? "text-emerald-600" : "text-rose-600"}
          helper={
            monthlySurplus >= 0
              ? `Per ${payLabelLower}: ${formatCurrency(perPaySurplus)}`
              : perPayStrain
                ? `Short by ${formatCurrency(Math.abs(perPaySurplus))} per ${payLabelLower}`
                : "Shortfall needs attention"
          }
        />
      </section>

      {needsTopUp ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
          You are short by {formatCurrency(Math.abs(monthlySurplus))} each month. Reduce allocations or
          add income to keep envelopes funded.
          {perPayStrain
            ? ` That is roughly ${formatCurrency(Math.abs(perPaySurplus))} per ${payLabelLower}.`
            : null}
        </div>
      ) : null}
      {!needsTopUp && hasSurplus ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-700">
          Nice! You have {formatCurrency(monthlySurplus)} available after allocations. Consider topping up
          long-term goals or your surplus envelope.
        </div>
      ) : null}

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
              filteredStreams.map((stream) => {
                const { surplus: streamSurplus, allocationsTotal } = getAllocations(stream);
                const hasSurplusToApply = streamSurplus > 0.01 && Boolean(stream.surplusEnvelope);
                const surplusLabel = stream.surplusEnvelope
                  ? envelopeNameLookup.get(stream.surplusEnvelope) ?? stream.surplusEnvelope
                  : "Unassigned";
                const planStream = planLookup.get(stream.id) ?? null;
                const planAllocationsTotal = planStream?.allocationsTotal ?? null;
                const planSurplus = planStream?.surplus ?? streamSurplus;
                const latestEvent = eventLookup.get(stream.id) ?? null;

                return (
                  <Card key={stream.id} className="border border-primary/20 bg-white">
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle>{stream.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {stream.frequency} · {formatCurrency(stream.amount)}
                        </p>
                        {planAllocationsTotal !== null ? (
                          <p className="text-xs text-muted-foreground">
                            Plan allocates {formatCurrency(planAllocationsTotal)} per cycle ·
                            {" "}
                            <span
                              className={planSurplus >= 0 ? "text-emerald-600" : "text-rose-600"}
                            >
                              {planSurplus >= 0 ? "surplus" : "short"} {formatCurrency(Math.abs(planSurplus))}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Allocates {formatCurrency(allocationsTotal)} per cycle
                          </p>
                        )}
                        {latestEvent ? (
                          <p className="text-xs text-muted-foreground">
                            Last payroll {format(new Date(latestEvent.appliedAt), "dd MMM yyyy")} ·
                            {" "}
                            {formatCurrency(latestEvent.transactionAmount)} received
                            {latestEvent.difference !== null ? (
                              <span
                                className={`ml-1 font-medium ${
                                  latestEvent.difference >= 0 ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {latestEvent.difference >= 0 ? "+" : "-"}
                                {formatCurrency(Math.abs(latestEvent.difference))} vs plan
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {hasSurplusToApply ? (
                          <Button
                            size="sm"
                            onClick={() => handleApplySurplus(stream)}
                            disabled={applyingStreamId === stream.id}
                          >
                            {applyingStreamId === stream.id ? "Applying…" : "Apply surplus"}
                          </Button>
                        ) : null}
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
                      <AllocationChart
                        stream={stream}
                        envelopeNameLookup={envelopeNameLookup}
                        monthlyRequirement={monthlyRequirement}
                        perPayRequirement={perPayRequirement}
                        payLabel={payLabelLower}
                      />
                      <div className="text-xs text-muted-foreground">
                        Surplus routed to {surplusLabel}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
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
        onSave={handleStreamSaved}
        onDelete={handleStreamDeleted}
        envelopeSummaries={envelopeSummaries}
      />
      <MobileNav />
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone = "text-secondary",
  helper,
}: {
  title: string;
  value: string;
  tone?: string;
  helper?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function toAnnual(amount: number, frequency: PlannerFrequency) {
  switch (frequency) {
    case "weekly":
      return amount * 52;
    case "fortnightly":
      return amount * 26;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "annually":
      return amount;
    case "none":
    default:
      return amount * 12;
  }
}

function toMonthly(amount: number, frequency: PlannerFrequency) {
  return toAnnual(amount, frequency) / 12;
}

function perPayToAnnual(amount: number, frequency: PlannerFrequency) {
  switch (frequency) {
    case "weekly":
      return amount * 52;
    case "fortnightly":
      return amount * 26;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "annually":
      return amount;
    case "none":
    default:
      return amount * 12;
  }
}

function detectPrimaryFrequency(streams: IncomeStream[]): PlannerFrequency {
  if (!streams.length) return "fortnightly";
  const score: Partial<Record<PlannerFrequency, number>> = {};
  for (const stream of streams) {
    score[stream.frequency] = (score[stream.frequency] ?? 0) + toAnnual(stream.amount, stream.frequency);
  }
  const priority: PlannerFrequency[] = ["fortnightly", "monthly", "weekly", "quarterly", "annually", "none"];
  let best: PlannerFrequency = "fortnightly";
  let bestScore = -Infinity;
  for (const frequency of priority) {
    const value = score[frequency];
    if (value !== undefined && value > bestScore) {
      best = frequency;
      bestScore = value;
    }
  }
  return bestScore > 0 ? best : "fortnightly";
}

function frequencyLabel(frequency: PlannerFrequency) {
  switch (frequency) {
    case "weekly":
      return "Weekly pay";
    case "fortnightly":
      return "Fortnightly pay";
    case "monthly":
      return "Monthly pay";
    case "quarterly":
      return "Quarterly cycle";
    case "annually":
      return "Annual cycle";
    case "none":
    default:
      return "Pay cycle";
  }
}

function envelopeAnnualRequirement(envelope: EnvelopeSummary, payFrequency: PlannerFrequency) {
  if (envelope.annual && envelope.annual > 0) return envelope.annual;
  return perPayToAnnual(envelope.perPay, payFrequency);
}

function getAllocations(stream: IncomeStream) {
  const allocationsTotal = stream.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const surplus = stream.amount - allocationsTotal;
  return { allocationsTotal, surplus };
}

function AllocationChart({
  stream,
  envelopeNameLookup,
  monthlyRequirement,
  perPayRequirement,
  payLabel,
}: {
  stream: IncomeStream;
  envelopeNameLookup: Map<string, string>;
  monthlyRequirement: number;
  perPayRequirement: number;
  payLabel: string;
}) {
  const { surplus } = getAllocations(stream);
  const amountToDisplay = (value: number) =>
    stream.amount === 0 ? `${(value * 100).toFixed(0)}%` : formatCurrency(value);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Allocated {formatCurrency(Math.max(0, stream.amount - surplus))} of {formatCurrency(stream.amount)}
          </span>
          <span>
            Remaining:{" "}
            <span className={surplus >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {formatCurrency(surplus)}
            </span>
          </span>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {stream.allocations.map((allocation, index) => {
            const resolvedName =
              allocation.envelopeId && envelopeNameLookup.has(allocation.envelopeId)
                ? envelopeNameLookup.get(allocation.envelopeId) ?? allocation.envelope
                : allocation.envelope;
            return (
            <div
              key={`${allocation.envelopeId ?? allocation.envelope}-${index}`}
              className="flex items-center justify-between rounded border border-primary/20 bg-background px-3 py-2"
            >
              <span>{resolvedName}</span>
              <span>
                {allocationModeLabel(allocation, stream.amount)} ·{" "}
                {amountToDisplay(allocation.amount)}
              </span>
            </div>
          );
          })}
          {surplus > 0 ? (
            <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
              <span>Surplus</span>
              <span>{formatCurrency(surplus)}</span>
            </div>
          ) : null}
        </div>
      </div>
      {monthlyRequirement > 0 ? (
        <p className="text-xs text-muted-foreground">
          Planner envelopes need about {formatCurrency(monthlyRequirement)} each month (~{formatCurrency(perPayRequirement)} per {payLabel}).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No envelope targets yet. Head to the planner to set contribution goals for this income.
        </p>
      )}
    </div>
  );
}

function allocationModeLabel(allocation: { amount: number }, streamAmount: number) {
  if (streamAmount === 0) {
    return `${allocation.amount}%`;
  }
  return `${((allocation.amount / streamAmount) * 100).toFixed(0)}%`;
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

function createBlankStream(): IncomeStream {
  return {
    id: crypto.randomUUID(),
    name: "",
    amount: 0,
    frequency: "fortnightly",
    nextDate: new Date().toISOString().slice(0, 10),
    allocations: [],
    surplusEnvelope: null,
  };
}

type ApiStream = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextDate: string | null;
  allocations: Array<{ envelope: string; amount: number; envelopeId?: string | null }>;
  surplusEnvelope: string | null;
};

function mapApiStream(stream: ApiStream): IncomeStream {
  return {
    id: stream.id,
    name: stream.name,
    amount: Number(stream.amount ?? 0),
    frequency: (stream.frequency as PlannerFrequency) ?? "monthly",
    nextDate: stream.nextDate,
    allocations: Array.isArray(stream.allocations)
      ? stream.allocations.map((allocation) => ({
          envelope: allocation.envelope ?? "",
          amount: Number(allocation.amount ?? 0),
          envelopeId: allocation.envelopeId ?? null,
        }))
      : [],
    surplusEnvelope: stream.surplusEnvelope ?? null,
  };
}

function IncomeDrawer({
  open,
  onOpenChange,
  stream,
  onSave,
  onDelete,
  envelopeSummaries,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  stream: IncomeStream | null;
  onSave: (stream: IncomeStream) => void;
  onDelete: (id: string) => void;
  envelopeSummaries: EnvelopeSummary[];
}) {
  const [localStream, setLocalStream] = useState<IncomeStream>(stream ?? createBlankStream());
  const [saving, setSaving] = useState(false);
  const [allocationMode, setAllocationMode] = useState<"fixed" | "percentage">("fixed");
  const envelopeIdToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const envelope of envelopeSummaries) {
      map.set(envelope.id, envelope.name);
    }
    return map;
  }, [envelopeSummaries]);
  const envelopeNameToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const envelope of envelopeSummaries) {
      map.set(envelope.name.toLowerCase(), envelope.id);
    }
    return map;
  }, [envelopeSummaries]);
  const envelopeListId = useId();
  const surplusListId = useId();
  const initialSurplusId =
    stream?.surplusEnvelope && envelopeIdToName.has(stream.surplusEnvelope)
      ? stream.surplusEnvelope
      : "";
  const initialSurplusDisplay =
    stream?.surplusEnvelope && envelopeIdToName.has(stream.surplusEnvelope)
      ? envelopeIdToName.get(stream.surplusEnvelope) ?? ""
      : stream?.surplusEnvelope ?? "";
  const [surplusEnvelopeId, setSurplusEnvelopeId] = useState<string>(initialSurplusId);
  const [surplusDisplay, setSurplusDisplay] = useState<string>(initialSurplusDisplay);
  const totalAllocated = useMemo(
    () => localStream.allocations.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0),
    [localStream.allocations],
  );
  const targetTotal = allocationMode === "fixed" ? Number(localStream.amount ?? 0) : 100;
  const remainingAllocation = targetTotal - totalAllocated;
  const overAllocated = allocationMode === "fixed" ? remainingAllocation < -0.5 : remainingAllocation < -0.5;
  const allocationSummary =
    allocationMode === "fixed"
      ? `Allocated ${formatCurrency(totalAllocated)} of ${formatCurrency(targetTotal)}`
      : `Allocated ${totalAllocated.toFixed(2)}% of 100%`;
  const remainingSummary =
    allocationMode === "fixed"
      ? `${remainingAllocation >= 0 ? "Remaining" : "Over"} ${formatCurrency(Math.abs(remainingAllocation))}`
      : `${remainingAllocation >= 0 ? "Remaining" : "Over"} ${Math.abs(remainingAllocation).toFixed(2)}%`;
  const isEdit = Boolean(stream);

  useEffect(() => {
    if (!open) return;
    setLocalStream(stream ?? createBlankStream());
    setSaving(false);
    setAllocationMode("fixed");
    const nextId =
      stream?.surplusEnvelope && envelopeIdToName.has(stream.surplusEnvelope)
        ? stream.surplusEnvelope
        : "";
    setSurplusEnvelopeId(nextId);
    setSurplusDisplay(
      stream?.surplusEnvelope
        ? envelopeIdToName.get(stream.surplusEnvelope) ?? stream.surplusEnvelope
        : "",
    );
  }, [open, stream, envelopeIdToName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let allocations = localStream.allocations
      .filter((allocation) => allocation.envelope.trim())
      .map((allocation) => ({
        envelope: allocation.envelope.trim(),
        amount: Number(allocation.amount ?? 0),
        envelopeId: allocation.envelopeId ?? null,
      }));

    if (allocationMode === "percentage") {
      const totalPercentage = allocations.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0);
      if (totalPercentage > 100.05) {
        toast.error("Percentage allocations cannot exceed 100%.");
        return;
      }
      allocations = allocations.map((allocation) => ({
        ...allocation,
        amount: Number(((allocation.amount / 100) * Number(localStream.amount ?? 0)).toFixed(2)),
      }));
    }

    const trimmedSurplusId = surplusEnvelopeId.trim();
    const trimmedSurplusName = surplusDisplay.trim();

    const payload = {
      name: localStream.name.trim(),
      amount: Number(localStream.amount ?? 0),
      frequency: localStream.frequency,
      nextDate: localStream.nextDate ?? null,
      allocations,
      surplusEnvelope: trimmedSurplusId || (trimmedSurplusName ? trimmedSurplusName : null),
    };

    try {
      setSaving(true);
      const response = await fetch(
        isEdit ? `/api/recurring-income/${stream?.id}` : "/api/recurring-income",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to save income stream" }));
        throw new Error(result.error ?? "Unable to save income stream");
      }

      const result = (await response.json()) as { stream: ApiStream };
      const mapped = mapApiStream(result.stream);
      toast.success(isEdit ? "Income stream updated" : "Income stream created");
      onSave(mapped);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save income stream");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!stream) return;
    const confirmed = window.confirm(`Delete ${stream.name}?`);
    if (!confirmed) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/recurring-income/${stream.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Unable to delete income stream" }));
        throw new Error(result.error ?? "Unable to delete income stream");
      }
      toast.success("Income stream deleted");
      onDelete(stream.id);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete income stream");
    } finally {
      setSaving(false);
    }
  }

  function handleAllocationModeChange(mode: "fixed" | "percentage") {
    if (mode === allocationMode) return;
    setLocalStream((prev) => {
      const incomeAmount = Number(prev.amount ?? 0);
      const updated = prev.allocations.map((allocation) => {
        const current = Number(allocation.amount ?? 0);
        if (mode === "percentage") {
          if (incomeAmount <= 0) {
            return { ...allocation, amount: 0 };
          }
          const percentage = (current / Math.max(incomeAmount, 0.0001)) * 100;
          return { ...allocation, amount: Number(percentage.toFixed(2)) };
        }
        const absolute = Number(((current / 100) * incomeAmount).toFixed(2));
        return { ...allocation, amount: absolute };
      });
      return { ...prev, allocations: updated };
    });
    setAllocationMode(mode);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setLocalStream(stream ?? createBlankStream());
          setSaving(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-lg flex-col gap-4 bg-background p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-secondary">
            {isEdit ? "Edit income stream" : "New income stream"}
          </Dialog.Title>
          <form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
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
                min="0"
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
            <Input
              list={surplusListId}
              placeholder="Surplus envelope (optional)"
              value={surplusDisplay}
              onChange={(event) => {
                const value = event.target.value;
                const match = envelopeNameToId.get(value.toLowerCase());
                setSurplusDisplay(value);
                setSurplusEnvelopeId(match ?? "");
                setLocalStream((prev) => ({ ...prev, surplusEnvelope: value }));
              }}
            />
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-secondary">Allocations</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={allocationMode === "fixed" ? "default" : "outline"}
                    onClick={() => handleAllocationModeChange("fixed")}
                  >
                    Dollars
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={allocationMode === "percentage" ? "default" : "outline"}
                    onClick={() => handleAllocationModeChange("percentage")}
                  >
                    % Split
                  </Button>
                </div>
              </div>
              <p className={`mt-2 text-xs ${overAllocated ? "text-rose-600" : "text-muted-foreground"}`}>
                {allocationSummary} · {remainingSummary}
              </p>
            </div>
            <div className="space-y-3">
              {localStream.allocations.map((allocation, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[2fr,1fr,auto]">
                  <Input
                    list={envelopeListId}
                    placeholder="Envelope"
                    value={allocation.envelope}
                    onChange={(event) => {
                      const value = event.target.value;
                      const match = envelopeNameToId.get(value.toLowerCase());
                      setLocalStream((prev) => ({
                        ...prev,
                        allocations: prev.allocations.map((item, i) =>
                          i === index ? { ...item, envelope: value, envelopeId: match ?? null } : item,
                        ),
                      }));
                    }}
                  />
                  <Input
                    placeholder={allocationMode === "percentage" ? "Percent" : "Amount"}
                    type="number"
                    step={allocationMode === "percentage" ? "0.1" : "0.01"}
                    min="0"
                    max={allocationMode === "percentage" ? 100 : undefined}
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
                    allocations: [...prev.allocations, { envelope: "", envelopeId: null, amount: 0 }],
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
              {isEdit ? (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  Delete
                </Button>
              ) : null}
              <Button type="submit" disabled={saving} className="bg-[#7A9E9A] hover:bg-[#5A7E7A]">
                {saving ? "Saving…" : "Save stream"}
              </Button>
            </div>
          </form>
          <datalist id={envelopeListId}>
            {envelopeSummaries.map((envelope) => (
              <option key={`allocation-${envelope.id}`} value={envelope.name} />
            ))}
          </datalist>
          <datalist id={surplusListId}>
            {envelopeSummaries.map((envelope) => (
              <option key={`surplus-${envelope.id}`} value={envelope.name} />
            ))}
          </datalist>
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
