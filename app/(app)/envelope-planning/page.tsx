import { createClient } from "@/lib/supabase/server";
import { PlannerClient, PlannerEnvelope } from "./planner-client";
import { demoPlannerEnvelopes } from "@/lib/planner/demo-data";
import { PlannerFrequency } from "@/lib/planner/calculations";
import { getPayPlanSummary } from "@/lib/server/pay-plan";

export default async function EnvelopePlanningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PlannerClient
        initialPayFrequency="fortnightly"
        envelopes={demoPlannerEnvelopes}
        readOnly
      />
    );
  }

  const [categoriesResponse, envelopesResponse] = await Promise.all([
    supabase.from("envelope_categories").select("id, name, sort_order").order("sort_order", { ascending: true }).order("name"),
    supabase
      .from("envelopes")
      .select(
        "id, name, category_id, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, due_date, next_payment_due, frequency, notes, sort_order",
      )
      .eq("user_id", user.id)
      .or("is_goal.is.null,is_goal.eq.false") // Exclude goals
      .order("sort_order", { ascending: true })
      .order("name"),
  ]);

  const categories = new Map<string, string>();
  const categorySortOrders = new Map<string, number>();
  if (categoriesResponse.data) {
    for (const category of categoriesResponse.data) {
      categories.set(category.id, category.name);
      categorySortOrders.set(category.id, category.sort_order ?? 0);
    }
  }

  const envelopes: PlannerEnvelope[] = (envelopesResponse.data ?? []).map((envelope) => ({
    ...envelope,
    category_name: envelope.category_id ? categories.get(envelope.category_id) ?? null : null,
  }));

  // Build categories list with sortOrder for proper ordering
  const categoryList = (categoriesResponse.data ?? []).map(cat => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sort_order ?? 0,
  }));

  const defaultFrequency: PlannerFrequency = "fortnightly";

  const payPlan = await getPayPlanSummary(supabase, user?.id);

  return (
    <PlannerClient
      initialPayFrequency={defaultFrequency}
      envelopes={envelopes}
      payPlan={payPlan}
      categories={categoryList}
    />
  );
}
