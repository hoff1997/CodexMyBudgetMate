import { createClient } from "@/lib/supabase/server";
import type { SummaryEnvelope } from "@/components/layout/envelopes/envelope-summary-card";
import { EnvelopeSummaryClient } from "@/components/layout/envelopes/envelope-summary-client";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function EnvelopeSummaryPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: envelopes } = await supabase
    .from("envelopes")
    .select(
      "id, name, target_amount, current_amount, due_date, frequency, next_payment_due, notes, pay_cycle_amount, opening_balance, category_id, icon, sort_order, is_spending",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: categories } = await supabase
    .from("envelope_categories")
    .select("id, name")
    .order("name");

  const categoryLookup = new Map<string, string>();
  (categories ?? []).forEach((category) => {
    categoryLookup.set(category.id, category.name);
  });

  const list: SummaryEnvelope[] = (envelopes ?? []).map((envelope, index) => {
    const sortOrder =
      typeof envelope.sort_order === "number"
        ? envelope.sort_order
        : Number(envelope.sort_order ?? index);
    return {
      ...envelope,
      category_name: envelope.category_id ? categoryLookup.get(envelope.category_id) ?? null : null,
      sort_order: sortOrder,
      is_spending: envelope.is_spending ?? false,
    };
  });

  const totals = list.reduce(
    (acc, envelope) => {
      acc.target += Number(envelope.target_amount ?? 0);
      acc.current += Number(envelope.current_amount ?? 0);
      return acc;
    },
    { target: 0, current: 0 },
  );

  return (
    <EnvelopeSummaryClient
      list={list}
      totals={totals}
      defaultTab={typeof searchParams?.tab === "string" ? searchParams?.tab : undefined}
    />
  );
}
