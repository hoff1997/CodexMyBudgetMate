import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { ChoresClient } from "./chores-client";

export default async function ChoresPage() {
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

  // Fetch children for this parent
  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_url, star_balance, screen_time_balance")
    .eq("parent_user_id", user.id)
    .order("name");

  // Fetch chore templates (system + custom)
  const { data: templates } = await supabase
    .from("chore_templates")
    .select("*")
    .or(`is_system.eq.true,created_by.eq.${user.id}`)
    .order("category")
    .order("name");

  // Calculate current week starting date (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStarting = new Date(today);
  weekStarting.setDate(today.getDate() + mondayOffset);
  const weekStartingStr = weekStarting.toISOString().split("T")[0];

  // Fetch this week's assignments
  const childIds = children?.map((c) => c.id) || [];
  let assignments: unknown[] = [];

  if (childIds.length > 0) {
    const { data } = await supabase
      .from("chore_assignments")
      .select(
        `
        *,
        chore_template:chore_templates (
          id,
          name,
          description,
          icon,
          category
        ),
        child:child_profiles (
          id,
          name,
          avatar_url
        )
      `
      )
      .in("child_profile_id", childIds)
      .eq("week_starting", weekStartingStr)
      .order("day_of_week");

    assignments = data || [];
  }

  // Fetch rotations
  const { data: rotations } = await supabase
    .from("chore_rotations")
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon
      ),
      rotation_members:chore_rotation_members (
        id,
        child_profile_id,
        order_position,
        child:child_profiles (
          id,
          name,
          avatar_url
        )
      )
    `
    )
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ChoresClient
      childProfiles={children || []}
      templates={templates || []}
      assignments={assignments}
      rotations={rotations || []}
      weekStarting={weekStartingStr}
    />
  );
}
