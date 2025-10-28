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
    data: { session },
  } = await supabase.auth.getSession();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";
  const demoMode =
    cookieStore.get("demo-mode")?.value === "true" || (!session && authDisabled);

  if (!session && !authDisabled && !demoMode) {
    redirect("/login");
  }

  if (!session && demoMode) {
    return (
      <DashboardShell
        profile={{ id: "demo-user", full_name: "Demo Budget Mate", avatar_url: null }}
        userId="demo-user"
        demoMode
      />
    );
  }

  const userId = session!.user.id;

  const [{ data: profile }, { count: envelopeCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("envelopes")
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
    />
  );
}
