import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EnvelopeDetailClient } from "./envelope-detail-client";

interface Props {
  params: { id: string };
}

export default async function EnvelopeDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch envelope details
  const { data: envelope, error: envelopeError } = await supabase
    .from("envelopes")
    .select(`
      id,
      name,
      target_amount,
      current_amount,
      frequency,
      due_date,
      icon,
      notes,
      priority,
      subtype,
      is_spending,
      is_tracking_only,
      is_suggested,
      suggestion_type,
      category_id,
      created_at,
      updated_at,
      envelope_categories (
        id,
        name,
        icon
      )
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (envelopeError || !envelope) {
    notFound();
  }

  // Fetch transactions for this envelope (limit to 50 most recent)
  const { data: transactionsRaw } = await supabase
    .from("transactions")
    .select(`
      id,
      merchant_name,
      description,
      amount,
      occurred_at,
      status,
      account:accounts(id, name)
    `)
    .eq("envelope_id", params.id)
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(50);

  // Normalize account relation (can be array from join)
  const transactions = (transactionsRaw ?? []).map((t: any) => ({
    ...t,
    account: Array.isArray(t.account) ? t.account[0] ?? null : t.account,
  }));

  // Fetch envelope transfers (both in and out)
  const { data: transfersIn } = await supabase
    .from("envelope_transfers")
    .select(`
      id,
      amount,
      note,
      created_at,
      from_envelope:from_envelope_id(id, name)
    `)
    .eq("to_envelope_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: transfersOut } = await supabase
    .from("envelope_transfers")
    .select(`
      id,
      amount,
      note,
      created_at,
      to_envelope:to_envelope_id(id, name)
    `)
    .eq("from_envelope_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch all envelopes for transfer dialog
  const { data: allEnvelopes } = await supabase
    .from("envelopes")
    .select("id, name, current_amount, target_amount, icon")
    .eq("user_id", user.id)
    .order("name");

  // Calculate insights
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthSpending = transactions
    .filter(t => {
      const date = new Date(t.occurred_at);
      return date >= thisMonthStart && t.amount < 0;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const lastMonthSpending = transactions
    .filter(t => {
      const date = new Date(t.occurred_at);
      return date >= lastMonthStart && date <= lastMonthEnd && t.amount < 0;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Normalize the category data (can be array or object depending on query)
  const category = Array.isArray(envelope.envelope_categories)
    ? envelope.envelope_categories[0]
    : envelope.envelope_categories;

  return (
    <EnvelopeDetailClient
      envelope={{
        ...envelope,
        category: category || null,
      }}
      transactions={transactions ?? []}
      transfersIn={(transfersIn ?? []).map((t: any) => ({
        ...t,
        from_envelope: Array.isArray(t.from_envelope) ? t.from_envelope[0] : t.from_envelope,
      }))}
      transfersOut={(transfersOut ?? []).map((t: any) => ({
        ...t,
        to_envelope: Array.isArray(t.to_envelope) ? t.to_envelope[0] : t.to_envelope,
      }))}
      allEnvelopes={allEnvelopes ?? []}
      insights={{
        thisMonthSpending,
        lastMonthSpending,
      }}
    />
  );
}
