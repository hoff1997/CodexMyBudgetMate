import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { KidChoresClient } from "./kid-chores-client";

interface Props {
  params: { childId: string };
}

export default async function KidChoresPage({ params }: Props) {
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
      avatar_url
    `
    )
    .eq("id", params.childId)
    .eq("parent_user_id", user.id)
    .single();

  if (childError || !child) {
    notFound();
  }

  // Calculate current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStarting = new Date(today);
  weekStarting.setDate(today.getDate() + mondayOffset);
  const weekStartingStr = weekStarting.toISOString().split("T")[0];

  // Fetch this week's chores for this child
  const { data: rawChores } = await supabase
    .from("chore_assignments")
    .select(
      `
      id,
      status,
      day_of_week,
      currency_type,
      currency_amount,
      marked_done_at,
      approved_at,
      rejection_reason,
      chore_template:chore_templates (
        id,
        name,
        description,
        icon,
        estimated_minutes,
        is_expected,
        requires_photo,
        currency_type,
        currency_amount
      )
    `
    )
    .eq("child_profile_id", params.childId)
    .eq("week_starting", weekStartingStr)
    .order("day_of_week");

  // Transform chore_template from array to object (Supabase returns relations as arrays)
  const chores = (rawChores || []).map((chore) => ({
    ...chore,
    chore_template: Array.isArray(chore.chore_template)
      ? chore.chore_template[0] || null
      : chore.chore_template,
  }));

  return (
    <KidChoresClient
      child={child}
      chores={chores}
      weekStarting={weekStartingStr}
    />
  );
}
