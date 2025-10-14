import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft, ArrowRightLeft, Download, Edit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuthContext } from "@/contexts/SupabaseAuthContext";
import { fetchEnvelopes, fetchEnvelopeCategories, type EnvelopeRecord, type EnvelopeCategoryRecord, updateEnvelope } from "@/lib/supabase-data";
import { authHelpers } from "@/lib/supabase-auth";
import { AddEnvelopeDialog } from "@/components/add-envelope-dialog";
import EditEnvelopeDialog, { type EditableEnvelope } from "@/components/edit-envelope-dialog";
import EnvelopeTransferDialog from "@/components/envelope-transfer-dialog";
import MobileHeader from "@/components/layout/mobile-header";

interface PlanningEnvelope {
  id: string;
  name: string;
  category?: string | null;
  openingBalance: number;
  transactionBalance: number;
  actualBalance: number;
  dueAmount: number;
  dueDate: Date | null;
  dueFrequency: "none" | "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";
  contributionAmount: number;
  expected: number;
  status: "under" | "on-track" | "over";
  notes?: string | null;
}

type Frequency = PlanningEnvelope["dueFrequency"];

const frequencyOptions: Frequency[] = ["none", "weekly", "fortnightly", "monthly", "quarterly", "annually"];

function normaliseEnvelope(row: EnvelopeRecord, categoryLookup: Map<string, string>): PlanningEnvelope {
  const opening = Number(row.opening_balance ?? 0);
  const current = Number(row.current_balance ?? 0);
  const dueAmount = Number(row.target_amount ?? row.annual_amount ?? 0);
  const dueFrequency = ((row.budget_frequency ?? "monthly") as Frequency);
  const category = row.category_id ? categoryLookup.get(row.category_id) ?? null : null;
  return {
    id: row.id,
    name: row.name,
    category,
    openingBalance: opening,
    transactionBalance: current,
    actualBalance: opening + current,
    dueAmount,
    dueDate: row.next_payment_due ? new Date(row.next_payment_due) : null,
    dueFrequency,
    contributionAmount: Number(row.pay_cycle_amount ?? 0),
    expected: 0,
    status: "on-track",
    notes: row.notes,
  };
}

function calculateRequiredContribution(dueAmount: number, dueFrequency: Frequency, payFrequency: Frequency) {
  if (!dueAmount || dueFrequency === "none") return 0;
  const perYear =
    dueFrequency === "weekly"
      ? dueAmount * 52
      : dueFrequency === "fortnightly"
      ? dueAmount * 26
      : dueFrequency === "monthly"
      ? dueAmount * 12
      : dueFrequency === "quarterly"
      ? dueAmount * 4
      : dueFrequency === "annually"
      ? dueAmount
      : dueAmount;

  const divisor =
    payFrequency === "weekly"
      ? 52
      : payFrequency === "fortnightly"
      ? 26
      : payFrequency === "monthly"
      ? 12
      : payFrequency === "quarterly"
      ? 4
      : payFrequency === "annually"
      ? 1
      : 12;

  return perYear / divisor;
}

function determineStatus(actual: number, expected: number): PlanningEnvelope["status"] {
  const tolerance = 5;
  if (actual < expected - tolerance) return "under";
  if (actual > expected + tolerance) return "over";
  return "on-track";
}

function calculateProgress(actual: number, dueAmount: number) {
  if (dueAmount <= 0) return 0;
  return Math.min(Math.max((actual / dueAmount) * 100, 0), 100);
}

export default function EnvelopePlanningPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useSupabaseAuthContext();
  const queryClient = useQueryClient();

  const [payFrequency, setPayFrequency] = useState<Frequency>("fortnightly");
  const [payCycleStartDate, setPayCycleStartDate] = useState<Date | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<EditableEnvelope | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["envelopeCategories", user?.id],
    queryFn: async () => {
      const rows = await fetchEnvelopeCategories(user!.id);
      return rows as EnvelopeCategoryRecord[];
    },
    enabled: Boolean(user?.id),
  });

  const envelopeQuery = useQuery({
    queryKey: ["planningEnvelopes", user?.id],
    queryFn: async () => {
      const categoryLookup = new Map<string, string>(
        (categoriesQuery.data ?? []).map((cat) => [cat.id, cat.name])
      );
      const rows = await fetchEnvelopes(user!.id);
      return rows.map((row) => normaliseEnvelope(row, categoryLookup));
    },
    enabled: Boolean(user?.id) && categoriesQuery.isSuccess,
  });

  const [planningEnvelopes, setPlanningEnvelopes] = useState<PlanningEnvelope[]>([]);

  const recalcEnvelope = (env: PlanningEnvelope): PlanningEnvelope => {
    const contribution = calculateRequiredContribution(env.dueAmount, env.dueFrequency, payFrequency);
    let expected = env.openingBalance;
    if (payCycleStartDate && contribution) {
      expected = env.openingBalance + contribution;
    }
    const status = determineStatus(env.actualBalance, expected);
    return { ...env, contributionAmount: contribution, expected, status };
  };

  useEffect(() => {
    if (!envelopeQuery.data) return;
    setPlanningEnvelopes(envelopeQuery.data.map(recalcEnvelope));
  }, [envelopeQuery.data, payFrequency, payCycleStartDate]);

  useEffect(() => {
    if (!planningEnvelopes.length) return;
    setPlanningEnvelopes((prev) => prev.map(recalcEnvelope));
  }, [payFrequency, payCycleStartDate]);

  const updateEnvelopeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EnvelopeRecord> }) => {
      await updateEnvelope(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningEnvelopes"] });
      toast({ title: "Envelope updated" });
    },
    onError: () => {
      toast({ title: "Failed to update envelope", variant: "destructive" });
    },
  });

  const groupedEnvelopes = useMemo(() => {
    const map = new Map<string, PlanningEnvelope[]>();
    planningEnvelopes.forEach((env) => {
      const category = env.category ?? "Uncategorised";
      const existing = map.get(category) ?? [];
      existing.push(env);
      map.set(category, existing);
    });
    return map;
  }, [planningEnvelopes]);

  const totals = useMemo(() => {
    return planningEnvelopes.reduce(
      (acc, env) => {
        acc.opening += env.openingBalance;
        acc.actual += env.actualBalance;
        acc.due += env.dueAmount;
        return acc;
      },
      { opening: 0, actual: 0, due: 0 }
    );
  }, [planningEnvelopes]);

  const toggleCategory = (name: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSeed = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const { session } = await authHelpers.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Missing access token");
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Seed failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["planningEnvelopes"] });
      toast({ title: "Demo data seeded" });
    } catch (error: any) {
      toast({ title: "Seeding failed", description: error.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUpdate = (id: string, partial: Partial<PlanningEnvelope>) => {
    setPlanningEnvelopes((prev) =>
      prev.map((env) => {
        if (env.id !== id) return env;
        const next: PlanningEnvelope = { ...env, ...partial } as PlanningEnvelope;
        if (partial.openingBalance !== undefined) {
          next.actualBalance = partial.openingBalance + next.transactionBalance;
        }
        if (partial.transactionBalance !== undefined) {
          next.actualBalance = next.openingBalance + partial.transactionBalance;
        }
        return recalcEnvelope(next);
      })
    );
    const updates: Partial<EnvelopeRecord> = {};
    if (partial.openingBalance !== undefined) {
      updates.opening_balance = partial.openingBalance.toString();
    }
    if (partial.dueAmount !== undefined) {
      updates.target_amount = partial.dueAmount.toString();
    }
    if (partial.dueDate !== undefined) {
      updates.next_payment_due = partial.dueDate ? partial.dueDate.toISOString() : null;
    }
    if (partial.dueFrequency !== undefined) {
      updates.budget_frequency = partial.dueFrequency;
    }
    if (partial.notes !== undefined) {
      updates.notes = partial.notes;
    }
    if (Object.keys(updates).length > 0) {
      updateEnvelopeMutation.mutate({ id, updates });
    }
  };

  const exportCsv = () => {
    const rows = planningEnvelopes.map((env) => [
      env.name,
      env.category ?? "",
      env.openingBalance.toFixed(2),
      env.dueAmount.toFixed(2),
      env.dueFrequency,
      env.dueDate ? format(env.dueDate, "yyyy-MM-dd") : "",
      env.contributionAmount.toFixed(2),
      env.actualBalance.toFixed(2),
      env.expected.toFixed(2),
      env.status,
    ]);
    const csv = [
      ["Name", "Category", "Opening Balance", "Target", "Frequency", "Next Due", "Contribution", "Actual", "Expected", "Status"].join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `envelope-planning-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Envelope Planning</h1>
        <p className="text-muted-foreground">Sign in to manage your envelopes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="md:hidden">
        <MobileHeader />
      </div>

      <Button variant="ghost" size="sm" onClick={() => setLocation("/envelopes-new")}
        className="flex items-center gap-2 w-fit text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold">Envelope Planning</h1>
          <p className="text-muted-foreground">Plan and track your contribution schedules.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Envelope
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransferDialog(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" /> Transfer
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? "Seeding…" : "Seed Demo Data"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pay Cycle Settings</CardTitle>
            <div className="flex gap-4 items-center">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-muted-foreground">Pay Frequency</span>
                <Select value={payFrequency} onValueChange={(value: Frequency) => setPayFrequency(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-muted-foreground">Cycle Start</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-40 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {payCycleStartDate ? format(payCycleStartDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={payCycleStartDate ?? undefined}
                      onSelect={(date) => setPayCycleStartDate(date ?? null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planned Envelopes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="p-2 text-left">Envelope</th>
                  <th className="p-2 text-left">Opening</th>
                  <th className="p-2 text-left">Target</th>
                  <th className="p-2 text-left">Frequency</th>
                  <th className="p-2 text-left">Next Due</th>
                  <th className="p-2 text-left">Contribution</th>
                  <th className="p-2 text-left">Actual</th>
                  <th className="p-2 text-left">Expected</th>
                  <th className="p-2">Progress</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(groupedEnvelopes.entries()).map(([categoryName, rows]) => (
                  <React.Fragment key={categoryName}>
                    <tr className="bg-muted/30 text-sm">
                      <td colSpan={11} className="p-2">
                        <button
                          className="flex items-center gap-2 w-full text-left"
                          onClick={() => toggleCategory(categoryName)}
                        >
                          {collapsedCategories.has(categoryName) ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="font-semibold">{categoryName}</span>
                          <Badge variant="secondary">{rows.length}</Badge>
                        </button>
                      </td>
                    </tr>
                    {!collapsedCategories.has(categoryName) &&
                      rows.map((env) => {
                        const progress = calculateProgress(env.actualBalance, env.dueAmount);
                        const statusLabel = env.status === "under" ? "Under" : env.status === "over" ? "Over" : "On Track";
                        return (
                          <tr key={env.id} className="border-b text-sm">
                            <td className="p-2 font-medium">{env.name}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={env.openingBalance}
                                onChange={(event) => handleUpdate(env.id, { openingBalance: Number(event.target.value) })}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={env.dueAmount}
                                onChange={(event) => handleUpdate(env.id, { dueAmount: Number(event.target.value) })}
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={env.dueFrequency}
                                onValueChange={(value: Frequency) => handleUpdate(env.id, { dueFrequency: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {frequencyOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full justify-start">
                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                    {env.dueDate ? format(env.dueDate, "PPP") : "None"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={env.dueDate ?? undefined}
                                    onSelect={(date) => handleUpdate(env.id, { dueDate: date ?? null })}
                                  />
                                </PopoverContent>
                              </Popover>
                            </td>
                            <td className="p-2 text-right">${env.contributionAmount.toFixed(2)}</td>
                            <td className="p-2 text-right">${env.actualBalance.toFixed(2)}</td>
                            <td className="p-2 text-right">${env.expected.toFixed(2)}</td>
                            <td className="p-2">
                              <Progress value={progress} className="h-2" />
                            </td>
                            <td className="p-2">
                              <Badge variant="outline" className={env.status === "under" ? "text-red-600" : env.status === "over" ? "text-blue-600" : "text-green-600"}>
                                {statusLabel}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const contributionFrequency: "weekly" | "fortnightly" | "monthly" =
                                      payFrequency === "weekly" || payFrequency === "fortnightly" ? payFrequency : "monthly";
                                    setEditingEnvelope({
                                      id: env.id,
                                      name: env.name,
                                      openingBalance: env.openingBalance,
                                      transactionBalance: env.transactionBalance,
                                      actualBalance: env.actualBalance,
                                      dueAmount: env.dueAmount,
                                      dueDate: env.dueDate,
                                      dueFrequency: env.dueFrequency,
                                      contributionAmount: env.contributionAmount,
                                      contributionFrequency,
                                      expected: env.expected,
                                      status: env.status,
                                      notes: env.notes ?? undefined,
                                    });
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPlanningEnvelopes((prev) => prev.filter((p) => p.id !== env.id))}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {planningEnvelopes.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Plus className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No envelopes yet. Seed demo data or add your first envelope to begin planning.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {planningEnvelopes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">${totals.opening.toFixed(2)}</div>
              <p className="text-muted-foreground text-sm">Opening Balances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold text-green-600">${totals.actual.toFixed(2)}</div>
              <p className="text-muted-foreground text-sm">Actual Balances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold text-blue-600">${totals.due.toFixed(2)}</div>
              <p className="text-muted-foreground text-sm">Target Funding</p>
            </CardContent>
          </Card>
        </div>
      )}

      <AddEnvelopeDialog open={showAddDialog} onOpenChange={setShowAddDialog} onEnvelopeCreated={() => queryClient.invalidateQueries({ queryKey: ["planningEnvelopes"] })} />

      <EnvelopeTransferDialog open={showTransferDialog} onOpenChange={setShowTransferDialog} />

      <EditEnvelopeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        envelope={editingEnvelope}
        categories={(categoriesQuery.data ?? []).map((cat) => cat.name)}
        onSave={(envelope) => {
          const contributionFrequency: "weekly" | "fortnightly" | "monthly" =
            payFrequency === "weekly" || payFrequency === "fortnightly" ? payFrequency : "monthly";
          handleUpdate(envelope.id as string, {
            openingBalance: envelope.openingBalance,
            dueAmount: envelope.dueAmount,
            dueDate: envelope.dueDate,
            dueFrequency: envelope.dueFrequency,
            notes: envelope.notes ?? null,
          });
          setShowEditDialog(false);
        }}
      />
    </div>
  );
}
