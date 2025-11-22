import { createClient } from "@/lib/supabase/server";
import { BudgetManagerClient } from "./budget-manager-client";

export const metadata = {
  title: "Budget Manager | My Budget Mate",
  description: "Manage your zero-based budget with inline editing",
};

export default async function BudgetManagerPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get user pay cycle preference
  let payCycle = "monthly";
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

  return <BudgetManagerClient userId={session?.user.id} initialPayCycle={payCycle} />;
}
