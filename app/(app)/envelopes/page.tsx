import { createClient } from "@/lib/supabase/server";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeManagerClient } from "@/components/layout/envelopes/envelope-manager-client";

export default async function EnvelopesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [envelopesResponse, categoriesResponse] = await Promise.all([
    supabase
      .from("envelopes")
      .select(
        "id, name, target_amount, current_amount, pay_cycle_amount, frequency, category_id, icon, next_payment_due, due_date, notes",
      )
      .order("name"),
    supabase.from("envelope_categories").select("id, name").order("name"),
  ]);

  const categoryLookup = new Map<string, string>();
  (categoriesResponse.data ?? []).forEach((category) => {
    categoryLookup.set(category.id, category.name);
  });

  const envelopes: SummaryEnvelope[] = (envelopesResponse.data ?? []).map((envelope) => ({
    ...envelope,
    category_name: envelope.category_id ? categoryLookup.get(envelope.category_id) ?? null : null,
  }));

  return (
    <EnvelopeManagerClient
      envelopes={envelopes}
      categories={(categoriesResponse.data ?? []).map((category) => ({ id: category.id, name: category.name }))}
      canEdit={Boolean(session)}
    />
  );
}
