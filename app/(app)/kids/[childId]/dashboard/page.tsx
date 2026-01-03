import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidDashboardClient } from "./kid-dashboard-client";

interface Props {
  params: { childId: string };
}

export default async function KidDashboardPage({ params }: Props) {
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
    .select(
      `
      id,
      name,
      avatar_url,
      star_balance,
      screen_time_balance,
      distribution_spend_pct,
      distribution_save_pct,
      distribution_invest_pct,
      distribution_give_pct
    `
    )
    .eq("id", params.childId)
    .eq("parent_user_id", user.id)
    .single();

  if (childError || !child) {
    notFound();
  }

  // Fetch child's bank accounts
  const { data: accounts } = await supabase
    .from("child_bank_accounts")
    .select("*")
    .eq("child_profile_id", params.childId);

  // Fetch this week's chore assignments
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStarting = new Date(today);
  weekStarting.setDate(today.getDate() + mondayOffset);
  const weekStartingStr = weekStarting.toISOString().split("T")[0];

  const { data: rawChores } = await supabase
    .from("chore_assignments")
    .select(
      `
      id,
      status,
      marked_done_at,
      approved_at,
      chore_template:chore_templates (
        id,
        name,
        description,
        icon,
        currency_type,
        currency_amount
      )
    `
    )
    .eq("child_profile_id", params.childId)
    .eq("week_starting", weekStartingStr);

  // Transform chore_template from array to object
  const chores = (rawChores || []).map((chore) => ({
    ...chore,
    chore_template: Array.isArray(chore.chore_template)
      ? chore.chore_template[0] || null
      : chore.chore_template,
  }));

  // Fetch recent achievements
  const { data: rawAchievements } = await supabase
    .from("child_achievements")
    .select(
      `
      id,
      achieved_at,
      achievement:kid_achievements (
        key,
        name,
        description,
        bonus_stars,
        icon
      )
    `
    )
    .eq("child_profile_id", params.childId)
    .order("achieved_at", { ascending: false })
    .limit(5);

  // Transform achievement from array to object
  const achievements = (rawAchievements || []).map((a) => ({
    ...a,
    achievement: Array.isArray(a.achievement)
      ? a.achievement[0] || null
      : a.achievement,
  }));

  return (
    <KidDashboardClient
      child={child}
      accounts={accounts || []}
      chores={chores}
      achievements={achievements}
    />
  );
}
