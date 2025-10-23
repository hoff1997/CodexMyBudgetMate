import { createClient } from "@/lib/supabase/server";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeManagerClient } from "@/components/layout/envelopes/envelope-manager-client";
import { mapTransferHistory, type RawTransferRow } from "@/lib/types/envelopes";

export default async function EnvelopesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [envelopesResponse, categoriesResponse, transfersResponse] = await Promise.all([
    supabase
      .from("envelopes")
      .select(
        "id, name, target_amount, current_amount, pay_cycle_amount, frequency, category_id, icon, next_payment_due, due_date, notes",
      )
      .order("name"),
    supabase.from("envelope_categories").select("id, name").order("name"),
    supabase
      .from("envelope_transfers")
      .select(
        "id, amount, note, created_at, from_envelope:from_envelope_id(id, name), to_envelope:to_envelope_id(id, name)",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const categoryLookup = new Map<string, string>();
  (categoriesResponse.data ?? []).forEach((category) => {
    categoryLookup.set(category.id, category.name);
  });

  const envelopes: SummaryEnvelope[] = (envelopesResponse.data ?? []).map((envelope) => ({
    ...envelope,
    category_name: envelope.category_id ? categoryLookup.get(envelope.category_id) ?? null : null,
  }));

  const transferRows: RawTransferRow[] = (transfersResponse.data ?? []).map((row: any) => ({
    ...row,
    from_envelope: Array.isArray(row.from_envelope) ? row.from_envelope[0] ?? null : row.from_envelope,
    to_envelope: Array.isArray(row.to_envelope) ? row.to_envelope[0] ?? null : row.to_envelope,
  }));

  return (
    <EnvelopeManagerClient
      envelopes={envelopes}
      categories={(categoriesResponse.data ?? []).map((category) => ({ id: category.id, name: category.name }))}
      canEdit={Boolean(session)}
      transferHistory={mapTransferHistory(transferRows)}
    />
  );
}
