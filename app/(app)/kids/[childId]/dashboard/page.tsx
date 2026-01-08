import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { getKidSession } from "@/lib/utils/kid-session";
import { KidDashboardClient } from "./kid-dashboard-client";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function KidDashboardPage({ params }: Props) {
  const { childId } = await params;
  const supabase = await createClient();

  // First check if this is a kid session
  const kidSession = await getKidSession();

  // If kid is logged in, verify they're accessing their own dashboard
  if (kidSession) {
    if (kidSession.childId !== childId) {
      // Kid trying to access another kid's dashboard
      redirect(`/kids/${kidSession.childId}/dashboard`);
    }

    // Use service client for kid session (no Supabase auth user)
    const serviceSupabase = createServiceClient();

    // Fetch child profile for kid session
    const { data: child, error: childError } = await serviceSupabase
      .from("child_profiles")
      .select(
        `
        id,
        name,
        avatar_url,
        distribution_spend_pct,
        distribution_save_pct,
        distribution_invest_pct,
        distribution_give_pct
      `
      )
      .eq("id", childId)
      .single();

    if (childError || !child) {
      notFound();
    }

    // Fetch remaining data for kid session
    return await renderDashboard(serviceSupabase, child, childId);
  }

  // Otherwise, check for parent user login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No parent user and no kid session - redirect to login
    redirect("/kids/login");
  }

  // Check beta access for parents
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
      distribution_spend_pct,
      distribution_save_pct,
      distribution_invest_pct,
      distribution_give_pct
    `
    )
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .single();

  if (childError || !child) {
    notFound();
  }

  // Parent viewing child dashboard - use regular supabase client
  return await renderDashboard(supabase, child, childId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderDashboard(supabase: any, child: any, childId: string) {
  // Fetch child's bank accounts
  const { data: accounts } = await supabase
    .from("child_bank_accounts")
    .select("*")
    .eq("child_profile_id", childId);

  // Fetch savings goals
  const { data: goals } = await supabase
    .from("teen_savings_goals")
    .select(`
      id,
      name,
      target_amount,
      current_amount,
      icon,
      description,
      is_active
    `)
    .eq("child_profile_id", childId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

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
        is_expected,
        currency_type,
        currency_amount
      )
    `
    )
    .eq("child_profile_id", childId)
    .eq("week_starting", weekStartingStr);

  // Transform chore_template from array to object
  const chores = (rawChores || []).map((chore: { chore_template: unknown }) => ({
    ...chore,
    chore_template: Array.isArray(chore.chore_template)
      ? chore.chore_template[0] || null
      : chore.chore_template,
  }));

  // Fetch streaks for expected chores
  const { data: streaks } = await supabase
    .from("expected_chore_streaks")
    .select(
      `
      id,
      chore_template_id,
      current_streak,
      longest_streak,
      completed_days,
      chore_template:chore_templates (
        id,
        name,
        icon
      )
    `
    )
    .eq("child_profile_id", childId);

  // Transform streaks chore_template from array to object
  const transformedStreaks = (streaks || []).map((s: { chore_template: unknown }) => ({
    ...s,
    chore_template: Array.isArray(s.chore_template)
      ? s.chore_template[0] || undefined
      : s.chore_template,
  }));

  // Fetch draft invoice
  const { data: rawInvoice } = await supabase
    .from("kid_invoices")
    .select(
      `
      id,
      invoice_number,
      total_amount,
      status
    `
    )
    .eq("child_profile_id", childId)
    .eq("status", "draft")
    .maybeSingle();

  // Get item count for draft invoice
  let draftInvoice = null;
  if (rawInvoice) {
    const { count } = await supabase
      .from("kid_invoice_items")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", rawInvoice.id);

    draftInvoice = {
      ...rawInvoice,
      item_count: count || 0,
    };
  }

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
    .eq("child_profile_id", childId)
    .order("achieved_at", { ascending: false })
    .limit(5);

  // Transform achievement from array to object
  const achievements = (rawAchievements || []).map((a: { achievement: unknown }) => ({
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
      streaks={transformedStreaks}
      draftInvoice={draftInvoice}
      goals={goals || []}
    />
  );
}
