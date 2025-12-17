import type { DatabaseProfile } from "@/lib/auth/types";
import { DashboardV2Client, type DashboardV2Data } from "@/components/dashboard-v2";
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
  dashboardData?: DashboardV2Data;
};

export default function DashboardShell({
  profile,
  userId,
  demoMode = false,
  showDemoCta = false,
  context,
  dashboardData,
}: Props) {
  // If we have dashboard data, use the new V2 layout
  if (dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardV2Client data={dashboardData} demoMode={demoMode} />
      </div>
    );
  }

  // Fallback to empty state if no data
  return (
    <div className="min-h-screen bg-background">
      <DashboardV2Client
        data={{
          userName: profile?.full_name?.split(" ")[0] || undefined,
          accounts: [],
          envelopes: [],
          creditCards: [],
          incomeThisMonth: 0,
          nextPayday: null,
          allocationData: {
            creditCardHolding: 0,
            essentialEnvelopes: 0,
            importantEnvelopes: 0,
            extrasEnvelopes: 0,
            uncategorisedEnvelopes: 0,
            uncategorisedCount: 0,
          },
          onboardingCompleted: context.onboardingCompleted,
        }}
        demoMode={demoMode}
      />
    </div>
  );
}
