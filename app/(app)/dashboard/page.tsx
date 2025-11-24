import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/layout/dashboard-shell";

type PageProps = {
  searchParams?: {
    demo?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const demoParam = searchParams?.demo;

  if (demoParam === "1") {
    redirect("/api/demo-mode/enter?redirect=/dashboard");
  }

  if (demoParam === "0") {
    redirect("/api/demo-mode/exit?redirect=/dashboard");
  }

  const cookieStore = cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";
  // Demo mode only if NO user exists
  const demoMode =
    !user && (cookieStore.get("demo-mode")?.value === "true" || authDisabled);

  if (!user && !authDisabled && !demoMode) {
    redirect("/login");
  }

  if (!user && demoMode) {
    return (
      <DashboardShell
        profile={{ id: "demo-user", full_name: "Demo Budget Mate", avatar_url: null }}
        userId="demo-user"
        demoMode
        context={{
          envelopeCount: 0,
          transactionCount: 0,
          goalCount: 0,
          hasRecurringIncome: false,
          hasBankConnected: false,
          onboardingCompleted: false,
        }}
      />
    );
  }

  const userId = user!.id;

  // Fetch all context data needed for widget visibility and next steps
  const [
    { data: profile },
    { count: envelopeCount },
    { count: transactionCount },
    { count: goalCount },
    { count: recurringIncomeCount },
    { count: bankConnectionCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, user_persona, onboarding_completed")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("envelopes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("recurring_income")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("bank_connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const showDemoCta = (envelopeCount ?? 0) === 0;

  return (
    <DashboardShell
      profile={profile}
      userId={userId}
      demoMode={false}
      showDemoCta={showDemoCta}
      context={{
        envelopeCount: envelopeCount ?? 0,
        transactionCount: transactionCount ?? 0,
        goalCount: goalCount ?? 0,
        hasRecurringIncome: (recurringIncomeCount ?? 0) > 0,
        hasBankConnected: (bankConnectionCount ?? 0) > 0,
        onboardingCompleted: profile?.onboarding_completed ?? false,
      }}
    />
  );
}
