import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DatabaseProfile } from "@/lib/auth/types";
import HelpTooltip from "@/components/ui/help-tooltip";
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard";
import type { PersonaType } from "@/lib/onboarding/personas";

type Props = {
  profile: (DatabaseProfile & { user_persona?: PersonaType | null; onboarding_completed?: boolean }) | null;
  userId: string;
  demoMode?: boolean;
  showDemoCta?: boolean;
  context: {
    envelopeCount: number;
    transactionCount: number;
    goalCount: number;
    hasRecurringIncome: boolean;
    hasBankConnected: boolean;
    onboardingCompleted: boolean;
  };
};

export default function DashboardShell({ profile, userId, demoMode = false, showDemoCta = false, context }: Props) {
  return (
    <div className="grid min-h-screen grid-rows-[auto,1fr] bg-background">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Kia ora, {profile?.full_name ?? (demoMode ? "Demo Budget Mate" : "Budget Mate")}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-secondary">
                Your Dashboard
              </h1>
              <HelpTooltip
                title="Dashboard"
                content={[
                  "Your customisable command centre for budget management. Drag and drop widgets to reorder them, or click 'Customise Dashboard' to show/hide widgets.",
                  "Your dashboard layout is personalised based on your profile and automatically saves your preferences."
                ]}
                tips={[
                  "Use Quick Actions (Shift + Q) to rapidly log transactions",
                  "Follow 'Next Steps' suggestions to build momentum",
                  "Click 'Customise Dashboard' to show/hide widgets",
                  "Drag widgets by the handle to reorder them"
                ]}
              />
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/api/auth/sign-out" prefetch={false}>Sign out</Link>
          </Button>
        </div>
      </header>

      {/* Customizable Dashboard */}
      <CustomizableDashboard
        userId={userId}
        demoMode={demoMode}
        persona={profile?.user_persona}
        showDemoCta={showDemoCta}
        context={context}
      />
    </div>
  );
}
