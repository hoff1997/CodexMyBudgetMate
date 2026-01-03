"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RulesData, CategoryRule, MerchantStat } from "@/lib/types/rules";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Lightbulb,
  RefreshCcw,
  Search,
  Wand2,
  XCircle,
} from "lucide-react";

type Props = {
  data: RulesData;
};

export function InteractionsClient({ data }: Props) {
  const [search, setSearch] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);

  const timeline = useMemo(() => {
    return [...data.rules]
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
      )
      .slice(0, 12);
  }, [data.rules]);

  const suggestionFeed = useMemo(() => {
    const entries = selectedMerchant
      ? data.merchantStats.filter((stat) => stat.merchant === selectedMerchant)
      : data.merchantStats;
    return entries.slice(0, 6);
  }, [data.merchantStats, selectedMerchant]);

  const filteredRules = useMemo(() => {
    if (!search.trim()) return data.rules;
    const term = search.toLowerCase();
    return data.rules.filter(
      (rule) =>
        rule.pattern.toLowerCase().includes(term) ||
        (rule.envelopeName ?? "").toLowerCase().includes(term),
    );
  }, [data.rules, search]);

  const activeCount = data.rules.filter((rule) => rule.isActive).length;

  function handleAcceptSuggestion(merchant: MerchantStat) {
    toast.success(`Approved ${merchant.merchant} for ${merchant.envelopeName ?? "manual review"}`);
  }

  function handleDismissSuggestion(merchant: MerchantStat) {
    toast.info(`Suggestion dismissed for ${merchant.merchant}`);
  }

  function handleRefreshSuggestions() {
    toast.loading("Refreshing suggestions…", { duration: 1200 });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Wand2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-semibold text-secondary">Merchant interactions</h1>
          {data.demoMode ? (
            <Badge variant="secondary" className="uppercase tracking-wide">
              Demo
            </Badge>
          ) : null}
        </div>
        <p className="text-base text-muted-foreground">
          Review auto-suggested envelopes, see which merchants are still learning, and tune your rules
          without leaving the reconciliation flow.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active automations</CardTitle>
            <CardDescription>Rules ready to match the next import.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-secondary">{activeCount}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {activeCount ? "Keep merchant names consistent; new suggestions will appear here." : "Create rules to start automating assignments."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average match rate</CardTitle>
            <CardDescription>Across recently imported merchants.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-secondary">
              {averageMatchRate(data.merchantStats)}%
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Boost this by approving suggested envelopes or creating new rules.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending suggestions</CardTitle>
            <CardDescription>Based on the latest import.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-semibold text-secondary">
              {suggestionFeed.length}
            </p>
            <Button size="sm" variant="outline" onClick={handleRefreshSuggestions}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Suggestion feed</CardTitle>
            <CardDescription>Accept or tweak merchant memory suggestions before approving transactions.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={selectedMerchant ?? "all"}
              onChange={(event) =>
                setSelectedMerchant(event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">All merchants</option>
              {data.merchantStats.map((stat) => (
                <option key={stat.merchant} value={stat.merchant}>
                  {stat.merchant}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestionFeed.length ? (
            suggestionFeed.map((stat) => (
              <div
                key={stat.merchant}
                className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-secondary">
                    {stat.merchant}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Suggested envelope:{" "}
                    {stat.envelopeName ? `${stat.envelopeIcon ?? ""} ${stat.envelopeName}` : "Review needed"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{stat.matchRate}% match</Badge>
                    <span>
                      Last seen{" "}
                      {stat.lastSeen
                        ? new Date(stat.lastSeen).toLocaleString("en-NZ", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "n/a"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleAcceptSuggestion(stat)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDismissSuggestion(stat)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              No suggestions at the moment. Sync bank connections or approve recent transactions to generate fresh recommendations.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rule activity</CardTitle>
          <CardDescription>Recent edits, activations, and pauses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search rules"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {filteredRules.length ? (
            filteredRules.slice(0, 12).map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={rule.isActive ? "secondary" : "outline"}>
                    {rule.isActive ? "Active" : "Paused"}
                  </Badge>
                  <Badge variant="outline">{rule.matchType.replace("_", " ")}</Badge>
                  {rule.caseSensitive ? <Badge variant="outline">Case sensitive</Badge> : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-secondary">
                  <span>&ldquo;{rule.pattern}&rdquo;</span> ➜ {rule.envelopeName ?? "Unmapped envelope"}
                </p>
                <p className="text-xs">
                  Updated{" "}
                  {rule.updatedAt
                    ? new Date(rule.updatedAt).toLocaleString("en-NZ", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "n/a"}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              No rules match your search. Clear the filter to review all activity.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Make the most of merchant memory</CardTitle>
          <CardDescription>Workflow tips carried over from the Replit build.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <Tip
            icon={<Lightbulb className="h-4 w-4 text-primary" />}
            title="Approve pending transactions daily"
            description="Every approval teaches merchant memory. Keep approvals flowing to maintain high match rates."
          />
          <Tip
            icon={<ArrowRight className="h-4 w-4 text-primary" />}
            title="Promote suggestions into rules"
            description="If the same merchant shows up repeatedly, add a rule from the suggestion to automate future imports."
          />
          <Tip
            icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
            title="Pause noisy rules"
            description="If a merchant changes descriptors, pause the rule and reapprove transactions to retrain the system."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function averageMatchRate(stats: MerchantStat[]) {
  if (!stats.length) return 0;
  const total = stats.reduce((sum, stat) => sum + stat.matchRate, 0);
  return Math.round(total / stats.length);
}

function Tip({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
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
