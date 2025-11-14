import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoalDetailClient } from "./goal-detail-client";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch the goal
  const { data: goal, error } = await supabase
    .from("envelopes")
    .select("*, envelope_goal_milestones(*)")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .eq("is_goal", true)
    .maybeSingle();

  if (error || !goal) {
    redirect("/goals");
  }

  // Transform milestones
  const goalWithMilestones = {
    ...goal,
    milestones: goal.envelope_goal_milestones || [],
  };

  return <GoalDetailClient goal={goalWithMilestones} />;
}
