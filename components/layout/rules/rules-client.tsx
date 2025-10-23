"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RulesData, CategoryRule, MatchType } from "@/lib/types/rules";
import {
  Filter,
  GitBranch,
  Lightbulb,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

type Props = {
  data: RulesData;
};

type FormState = {
  pattern: string;
  envelopeId: string;
  matchType: MatchType;
  caseSensitive: boolean;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  pattern: "",
  envelopeId: "",
  matchType: "contains",
  caseSensitive: false,
  notes: "",
};

export function RulesClient({ data }: Props) {
  const [rules, setRules] = useState<CategoryRule[]>(data.rules);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [envelopeFilter, setEnvelopeFilter] = useState<string>("all");

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (activeFilter === "active" && !rule.isActive) return false;
      if (activeFilter === "inactive" && rule.isActive) return false;
      if (envelopeFilter !== "all" && rule.envelopeId !== envelopeFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          rule.pattern.toLowerCase().includes(term) ||
          (rule.envelopeName ?? "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rules, search, activeFilter, envelopeFilter]);

  const averageMatchRate = useMemo(() => {
    if (!data.merchantStats.length) return 0;
    const total = data.merchantStats.reduce((sum, stat) => sum + stat.matchRate, 0);
    return Math.round(total / data.merchantStats.length);
  }, [data.merchantStats]);

  const projectedSuggestions = useMemo(() => {
    if (!rules.length) return 0;
    const multiplier = Math.max(4, Math.round(data.merchantStats.length * 1.5));
    return rules.filter((rule) => rule.isActive).length * multiplier;
  }, [rules, data.merchantStats.length]);

  function resetForm() {
    setForm(DEFAULT_FORM);
  }

  async function handleCreateRule() {
    if (data.demoMode) {
      toast.info("Demo mode: rules are not persisted.");
      return;
    }
    if (!form.pattern.trim()) {
      toast.error("Enter a merchant pattern to match.");
      return;
    }
    if (!form.envelopeId) {
      toast.error("Select an envelope to assign to.");
      return;
    }

    const provisionalRule: CategoryRule = {
      id: `local-${Date.now()}`,
      pattern: form.pattern.trim(),
      envelopeId: form.envelopeId,
      envelopeName: data.envelopes.find((env) => env.id === form.envelopeId)?.name ?? null,
      envelopeIcon: data.envelopes.find((env) => env.id === form.envelopeId)?.icon ?? null,
      isActive: true,
      matchType: form.matchType,
      caseSensitive: form.caseSensitive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRules((prev) => [provisionalRule, ...prev]);
    resetForm();

    try {
      const response = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: provisionalRule.pattern,
          envelopeId: provisionalRule.envelopeId,
          matchType: provisionalRule.matchType,
          caseSensitive: provisionalRule.caseSensitive,
          notes: form.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const created = (await response.json()) as CategoryRule;
      const envelopeMeta = data.envelopes.find((env) => env.id === created.envelopeId);
      const hydrated: CategoryRule = {
        ...created,
        envelopeName: created.envelopeName ?? envelopeMeta?.name ?? null,
        envelopeIcon: created.envelopeIcon ?? envelopeMeta?.icon ?? null,
      };
      setRules((prev) => prev.map((rule) => (rule.id === provisionalRule.id ? hydrated : rule)));
      toast.success("Rule created");
    } catch (error) {
      console.warn("Rule create fallback", error);
      setRules((prev) => prev.filter((rule) => rule.id !== provisionalRule.id));
      toast.error("Unable to create rule. Please try again.");
    }
  }

  async function handleDeleteRule(rule: CategoryRule) {
    if (data.demoMode) {
      setRules((prev) => prev.filter((entry) => entry.id !== rule.id));
      toast.info("Demo mode: removed locally only.");
      return;
    }
    const previous = rules;
    setRules((prev) => prev.filter((entry) => entry.id !== rule.id));
    try {
      const response = await fetch(`/api/category-rules/${rule.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }
      toast.success("Rule deleted");
    } catch (error) {
      console.warn("Rule delete fallback", error);
      setRules(previous);
      toast.error("Failed to delete rule");
    }
  }

  async function handleToggleActive(rule: CategoryRule) {
    if (data.demoMode) {
      setRules((prev) =>
        prev.map((entry) =>
          entry.id === rule.id
            ? { ...entry, isActive: !entry.isActive, updatedAt: new Date().toISOString() }
            : entry,
        ),
      );
      toast.info("Demo mode: status toggled locally only.");
      return;
    }
    const nextActive = !rule.isActive;
    const previous = rules;
    setRules((prev) =>
      prev.map((entry) =>
        entry.id === rule.id ? { ...entry, isActive: nextActive, updatedAt: new Date().toISOString() } : entry,
      ),
    );
    try {
      const response = await fetch(`/api/category-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!response.ok) {
        throw new Error("Toggle failed");
      }
      const updated = (await response.json()) as CategoryRule;
      const envelopeMeta = data.envelopes.find((env) => env.id === updated.envelopeId);
      const hydrated: CategoryRule = {
        ...updated,
        envelopeName: updated.envelopeName ?? envelopeMeta?.name ?? null,
        envelopeIcon: updated.envelopeIcon ?? envelopeMeta?.icon ?? null,
      };
      setRules((prev) => prev.map((entry) => (entry.id === hydrated.id ? hydrated : entry)));
      toast.success(updated.isActive ? "Rule activated" : "Rule paused");
    } catch (error) {
      console.warn("Rule toggle fallback", error);
      setRules(previous);
      toast.error("Failed to update rule status");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-secondary">Merchant memory</h1>
          {data.demoMode ? (
            <Badge variant="secondary" className="uppercase tracking-wide">
              Demo
            </Badge>
          ) : null}
        </div>
        <p className="text-base text-muted-foreground">
          Automatically categorise repeat merchants and keep envelope assignments consistent across imports.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Automation pulse</CardTitle>
            <CardDescription>Quick stats from the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <MetricRow label="Rules active" value={rules.filter((rule) => rule.isActive).length.toString()} />
            <MetricRow label="Rules paused" value={rules.filter((rule) => !rule.isActive).length.toString()} />
            <MetricRow
              label="Average match rate"
              value={`${averageMatchRate}%`}
              helper="Across the top tracked merchants"
            />
            <MetricRow
              label="Projected suggestions"
              value={projectedSuggestions.toLocaleString()}
              helper="Estimate of envelopes auto-suggested next month"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top merchants</CardTitle>
            <CardDescription>Where merchant memory is doing the heavy lifting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {data.merchantStats.length ? (
              data.merchantStats.map((stat) => (
                <div key={stat.merchant} className="flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2">
                  <div>
                    <p className="font-medium text-secondary">{stat.merchant}</p>
                    <p className="text-xs">
                      {stat.envelopeIcon ? `${stat.envelopeIcon} ` : ""}
                      {stat.envelopeName ?? "Unassigned"}
                    </p>
                  </div>
                  <Badge variant="secondary">{stat.matchRate}% match</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No transaction history yet—connect a bank feed to start learning.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create rule</CardTitle>
          <CardDescription>Match on merchant name text and auto-assign to the right envelope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr]">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Merchant pattern</span>
              <Input
                placeholder="e.g. Countdown, Uber Eats"
                value={form.pattern}
                onChange={(event) => setForm((prev) => ({ ...prev, pattern: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Envelope</span>
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={form.envelopeId}
                onChange={(event) => setForm((prev) => ({ ...prev, envelopeId: event.target.value }))}
              >
                <option value="">Select envelope</option>
                {data.envelopes.map((envelope) => (
                  <option key={envelope.id} value={envelope.id}>
                    {envelope.icon ? `${envelope.icon} ` : ""}{envelope.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Match type</span>
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={form.matchType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, matchType: event.target.value as MatchType }))
                }
              >
                <option value="contains">Contains</option>
                <option value="starts_with">Starts with</option>
                <option value="exact">Exact</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.caseSensitive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, caseSensitive: event.target.checked }))
                }
              />
              Case sensitive matching
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked readOnly />
              Stop on first match (default)
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Internal notes</span>
            <Textarea
              placeholder="Optional coaching context or reasons for the rule."
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateRule}>
              Create rule
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules catalogue</CardTitle>
          <CardDescription>Every merchant memory rule currently in play.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search merchants or envelopes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <select
                className="h-10 rounded-md border px-2 text-sm"
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                className="h-10 rounded-md border px-2 text-sm"
                value={envelopeFilter}
                onChange={(event) => setEnvelopeFilter(event.target.value)}
              >
                <option value="all">All envelopes</option>
                {data.envelopes.map((envelope) => (
                  <option key={envelope.id} value={envelope.id}>
                    {envelope.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredRules.length ? (
              filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={rule.isActive ? "secondary" : "outline"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{rule.matchType.replace("_", " ")}</Badge>
                      {rule.caseSensitive ? <Badge variant="outline">Case sensitive</Badge> : null}
                    </div>
                    <p className="text-sm font-semibold text-secondary">
                      Merchants matching{" "}
                      <span className="text-primary">&ldquo;{rule.pattern}&rdquo;</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assign to: {rule.envelopeIcon ? `${rule.envelopeIcon} ` : ""}
                      {rule.envelopeName ?? "Unmapped envelope"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated{" "}
                      {rule.updatedAt
                        ? new Date(rule.updatedAt).toLocaleString("en-NZ", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "n/a"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start md:self-end">
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(rule)}>
                      {rule.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => handleDeleteRule(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                No rules match your filters. Create a rule above or clear filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merchant memory tips</CardTitle>
          <CardDescription>Best practices lifted from the Replit playbook.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <TipRow
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="Layer patterns from broad to specific"
            description="Start with contains rules for common chains, then add exact matches for merchants that share prefixes."
          />
          <TipRow
            icon={<Zap className="h-4 w-4 text-primary" />}
            title="Pair rules with transaction approvals"
            description="Rules fire on import, but approvals capture merchant memory updates. Approve regularly to teach the system."
          />
          <TipRow
            icon={<Lightbulb className="h-4 w-4 text-primary" />}
            title="Review suggestions each month"
            description="Use the Suggestions widget in Reconcile to accept or adjust matches and keep spending analytics tidy."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span>{label}</span>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </div>
      <span className="font-semibold text-secondary">{value}</span>
    </div>
  );
}

function TipRow({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/10 px-4 py-3">
      <div className="mt-1">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-secondary">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
