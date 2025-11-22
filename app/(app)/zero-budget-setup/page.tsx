import { createClient } from "@/lib/supabase/server";
import { ZeroBudgetSetupClientV2 as ZeroBudgetSetupClient } from "./zero-budget-setup-client-v2";

export const metadata = {
  title: "Zero-Based Budget Setup | My Budget Mate",
  description: "Plan and organise your complete budget system with inline editing",
};

export default async function ZeroBudgetSetupPage() {
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

  return <ZeroBudgetSetupClient userId={session?.user.id} initialPayCycle={payCycle} />;
}
