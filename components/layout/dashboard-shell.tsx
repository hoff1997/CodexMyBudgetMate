import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import type { DatabaseProfile } from "@/lib/auth/types";
import { BudgetOverview } from "@/components/layout/overview/budget-overview";
import { QuickActionsPanel } from "@/components/layout/dashboard/quick-actions-panel";

type Props = {
  profile: DatabaseProfile | null;
  userId: string;
  demoMode?: boolean;
};

export default function DashboardShell({ profile, userId, demoMode = false }: Props) {
  return (
    <div className="grid min-h-screen grid-rows-[auto,1fr] bg-background">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Kia ora, {profile?.full_name ?? (demoMode ? "Demo Budget Mate" : "Budget Mate")}
            </p>
            <h1 className="text-2xl font-semibold text-secondary">
              Your envelopes at a glance
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/api/auth/sign-out">Sign out</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-6">
          <QuickActionsPanel />
        </div>
        <Suspense fallback={<p className="text-muted-foreground">Loading overview…</p>}>
          <BudgetOverview userId={userId} demoMode={demoMode} />
        </Suspense>
      </main>
    </div>
  );
}
