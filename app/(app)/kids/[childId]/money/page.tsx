import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidMoneyClient } from "./kid-money-client";

interface Props {
  params: { childId: string };
}

export default async function KidMoneyPage({ params }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Fetch child profile (verify parent owns this child)
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("*")
    .eq("id", params.childId)
    .eq("parent_user_id", user.id)
    .single();

  if (childError || !child) {
    notFound();
  }

  // Fetch envelope balances
  const { data: envelopes } = await supabase
    .from("child_bank_accounts")
    .select("*")
    .eq("child_profile_id", params.childId);

  // Calculate pending earnings from approved chores
  const { data: pendingChores } = await supabase
    .from("chore_assignments")
    .select("currency_amount")
    .eq("child_profile_id", params.childId)
    .eq("currency_type", "money")
    .eq("status", "approved");

  const pendingEarnings =
    pendingChores?.reduce((sum, c) => sum + Number(c.currency_amount), 0) || 0;

  return (
    <KidMoneyClient
      child={child}
      initialEnvelopes={envelopes || []}
      pendingEarnings={pendingEarnings}
    />
  );
}
