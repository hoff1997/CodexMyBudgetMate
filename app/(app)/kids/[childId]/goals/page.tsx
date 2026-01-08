import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidGoalsClient } from "./kid-goals-client";

export const metadata = {
  title: "My Savings Goals | My Budget Mate Kids",
  description: "Track your savings goals",
};

interface PageProps {
  params: Promise<{ childId: string }>;
}

export default async function KidGoalsPage({ params }: PageProps) {
  const { childId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Get child profile
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, first_name, avatar_emoji, avatar_url, star_balance")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    notFound();
  }

  // Get savings goals
  const { data: goals } = await supabase
    .from("teen_savings_goals")
    .select("*")
    .eq("child_profile_id", childId)
    .order("created_at", { ascending: false });

  // Get bank accounts for transfers
  const { data: accounts } = await supabase
    .from("child_bank_accounts")
    .select("id, envelope_type, account_name, current_balance, is_virtual")
    .eq("child_profile_id", childId);

  return (
    <KidGoalsClient
      child={{
        id: child.id,
        name: child.first_name,
        avatar_url: child.avatar_url,
        avatar_emoji: child.avatar_emoji,
        star_balance: child.star_balance,
      }}
      goals={goals || []}
      accounts={accounts || []}
    />
  );
}
