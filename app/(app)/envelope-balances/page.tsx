import { createClient } from "@/lib/supabase/server";
import { EnvelopeBalancesClient } from "./envelope-balances-client";

export const metadata = {
  title: "Envelope Balances Report | My Budget Mate",
  description: "Complete overview of all envelope balances with category grouping, debit/credit columns, and export functionality",
};

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EnvelopeBalancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-6 max-w-6xl">
          <p className="text-center text-muted-foreground">
            Please log in to view envelope balances.
          </p>
        </div>
      </div>
    );
  }

  // Fetch envelopes with categories
  const { data: envelopesRaw, error: envelopesError } = await supabase
    .from("envelopes")
    .select(
      `id,
       name,
       icon,
       current_amount,
       target_amount,
       pay_cycle_amount,
       category_id,
       envelope_categories!category_id(id, name, sort_order)`
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Transform the data to match the expected type (envelope_categories comes as array, take first element)
  const envelopes = envelopesRaw?.map((env: any) => ({
    id: env.id,
    name: env.name,
    icon: env.icon,
    current_amount: env.current_amount,
    target_amount: env.target_amount,
    pay_cycle_amount: env.pay_cycle_amount,
    category: env.envelope_categories?.[0] || null,
  })) ?? [];

  // Fetch all categories for proper sorting
  const { data: categories, error: categoriesError } = await supabase
    .from("envelope_categories")
    .select("id, name, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  const safeEnvelopes = envelopesError ? [] : envelopes;
  const safeCategories = categoriesError ? [] : categories ?? [];

  return (
    <EnvelopeBalancesClient
      envelopes={safeEnvelopes}
      categories={safeCategories}
    />
  );
}
