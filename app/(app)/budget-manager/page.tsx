import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BudgetManagerClient } from "./budget-manager-client";

export const metadata = {
  title: "Budget Manager | My Budget Mate",
  description: "Manage your zero-based budget with inline editing",
};

export default async function BudgetManagerPage() {
  const cookieStore = cookies();
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authDisabled =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV !== "production";
  const demoMode =
    cookieStore.get("demo-mode")?.value === "true" || (!session && authDisabled);

  // Get user pay cycle preference
  let payCycle = "monthly";
  let userId = session?.user.id;

  // Handle demo mode - use demo user ID
  if (demoMode && !session) {
    userId = "demo-user";
  }

  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", session.user.id)
      .single();

    if (profile?.pay_cycle) {
      payCycle = profile.pay_cycle;
    }
  }

  return <BudgetManagerClient userId={userId} initialPayCycle={payCycle} demoMode={demoMode} />;
}
