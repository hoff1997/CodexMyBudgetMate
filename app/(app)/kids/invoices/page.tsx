import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
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

  // Fetch all children for this parent
  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name, avatar_url, star_balance, screen_time_balance")
    .eq("parent_user_id", user.id)
    .order("name");

  if (!children || children.length === 0) {
    redirect("/kids/setup");
  }

  // Get the last 4 weeks of approved chores for each child
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split("T")[0];

  // Fetch approved chores with money rewards
  const { data: moneyChores } = await supabase
    .from("chore_assignments")
    .select(
      `
      id,
      child_profile_id,
      week_starting,
      currency_type,
      currency_amount,
      approved_at,
      chore_template:chore_templates (
        id,
        name,
        icon
      )
    `
    )
    .eq("status", "approved")
    .eq("currency_type", "money")
    .in(
      "child_profile_id",
      children.map((c) => c.id)
    )
    .gte("week_starting", fourWeeksAgoStr)
    .order("approved_at", { ascending: false });

  // Group by child and calculate totals
  const childEarnings: Record<
    string,
    {
      total: number;
      chores: Array<{
        id: string;
        name: string;
        icon: string;
        amount: number;
        approvedAt: string;
        weekStarting: string;
      }>;
    }
  > = {};

  for (const child of children) {
    childEarnings[child.id] = { total: 0, chores: [] };
  }

  for (const chore of moneyChores || []) {
    if (childEarnings[chore.child_profile_id]) {
      // Handle chore_template being an array from Supabase join
      const template = Array.isArray(chore.chore_template)
        ? chore.chore_template[0]
        : chore.chore_template;
      childEarnings[chore.child_profile_id].total += chore.currency_amount;
      childEarnings[chore.child_profile_id].chores.push({
        id: chore.id,
        name: template?.name || "Unknown",
        icon: template?.icon || "📋",
        amount: chore.currency_amount,
        approvedAt: chore.approved_at,
        weekStarting: chore.week_starting,
      });
    }
  }

  return (
    <InvoicesClient
      childProfiles={children}
      earnings={childEarnings}
    />
  );
}
