import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/layout/dashboard-shell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";

  if (!session && !authDisabled) {
    redirect("/login");
  }

  if (!session && authDisabled) {
    return (
      <DashboardShell
        profile={{ id: "demo-user", full_name: "Demo Budget Mate", avatar_url: null }}
        userId="demo-user"
        demoMode
      />
    );
  }

  const userId = session!.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return <DashboardShell profile={profile} userId={userId} demoMode={false} />;
}
