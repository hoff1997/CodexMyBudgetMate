import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatabaseProfile } from "@/lib/auth/types";
import { BudgetOverview } from "@/components/layout/overview/budget-overview";
import { QuickActionsPanel } from "@/components/layout/dashboard/quick-actions-panel";
import { DemoSeedCta } from "@/components/layout/dashboard/demo-seed-cta";
import StatsCards from "@/components/dashboard/stats-cards";
import MonitoredEnvelopesWidget from "@/components/dashboard/monitored-envelopes-widget";
import PendingApprovalWidget from "@/components/dashboard/pending-approval-widget";
import HelpTooltip from "@/components/ui/help-tooltip";

type Props = {
  profile: DatabaseProfile | null;
  userId: string;
  demoMode?: boolean;
  showDemoCta?: boolean;
};

export default function DashboardShell({ profile, userId, demoMode = false, showDemoCta = false }: Props) {
  return (
    <div className="grid min-h-screen grid-rows-[auto,1fr] bg-background">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Kia ora, {profile?.full_name ?? (demoMode ? "Demo Budget Mate" : "Budget Mate")}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-secondary">
                Your envelopes at a glance
              </h1>
              <HelpTooltip
                title="Dashboard"
                content={[
                  "Your command center for budget management. View key metrics, monitored envelopes, pending transactions, and an overview of all your financial categories.",
                  "Quick actions allow rapid data entry for transactions, envelopes, and transfers. Stats cards show your current financial position at a glance."
                ]}
                tips={[
                  "Use Quick Actions (Shift + Q) to rapidly log transactions",
                  "Monitor high-priority envelopes for alerts and warnings",
                  "Review pending transactions to approve or reject bank imports",
                  "Check the budget overview to see spending across all categories"
                ]}
              />
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/api/auth/sign-out">Sign out</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {!demoMode && showDemoCta ? (
          <Card className="mb-6 border-dashed border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg text-secondary">New account? Load sample data</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Explore every dashboard, planner, and report with a ready-made dataset. You can still remove or edit anything afterwards.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <span>Populate envelopes, transactions, and recurring income in one click.</span>
              <DemoSeedCta />
            </CardContent>
          </Card>
        ) : null}
        <div className="mb-6">
          <QuickActionsPanel />
        </div>
        <div className="mb-6">
          <StatsCards showReconciliation={true} />
        </div>
        <div className="mb-6">
          <MonitoredEnvelopesWidget />
        </div>
        <div className="mb-6">
          <PendingApprovalWidget />
        </div>
        <Suspense fallback={<p className="text-muted-foreground">Loading overview…</p>}>
          <BudgetOverview userId={userId} demoMode={demoMode} />
        </Suspense>
      </main>
    </div>
  );
}
