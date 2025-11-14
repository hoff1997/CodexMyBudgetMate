import { createClient } from "@/lib/supabase/server";
import { PlannerClient, PlannerEnvelope } from "./planner-client";
import { demoPlannerEnvelopes } from "@/lib/planner/demo-data";
import { PlannerFrequency } from "@/lib/planner/calculations";
import { getPayPlanSummary } from "@/lib/server/pay-plan";

export default async function EnvelopePlanningPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <PlannerClient
        initialPayFrequency="fortnightly"
        envelopes={demoPlannerEnvelopes}
        readOnly
      />
    );
  }

  const [categoriesResponse, envelopesResponse] = await Promise.all([
    supabase.from("envelope_categories").select("id, name").order("name"),
    supabase
      .from("envelopes")
      .select(
        "id, name, category_id, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, due_date, next_payment_due, frequency, notes",
      )
      .eq("user_id", session.user.id)
      .or("is_goal.is.null,is_goal.eq.false") // Exclude goals
      .order("name"),
  ]);

  const categories = new Map<string, string>();
  if (categoriesResponse.data) {
    for (const category of categoriesResponse.data) {
      categories.set(category.id, category.name);
    }
  }

  const envelopes: PlannerEnvelope[] = (envelopesResponse.data ?? []).map((envelope) => ({
    ...envelope,
    category_name: envelope.category_id ? categories.get(envelope.category_id) ?? null : null,
  }));

  const defaultFrequency: PlannerFrequency = "fortnightly";

  const payPlan = await getPayPlanSummary(supabase, session?.user.id);

  return (
    <PlannerClient
      initialPayFrequency={defaultFrequency}
      envelopes={envelopes}
      payPlan={payPlan}
    />
  );
}
