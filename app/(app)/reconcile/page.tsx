import { createClient } from "@/lib/supabase/server";
import { ReconcileWorkbench } from "./reconcile-workbench";

export default async function ReconcilePage() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions_view")
    .select(
      "id, merchant_name, description, amount, occurred_at, status, envelope_name, account_name, bank_reference, bank_memo, receipt_url",
    )
    .order("occurred_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:px-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-secondary">Reconciliation centre</h1>
        <p className="text-base text-muted-foreground">
          This mirrors the Replit-era workflow: queue imports, catch duplicates, split tricky spends,
          and approve in one pass. Filters and status chips below shift the table just like the old
          All / Pending / Unmatched cards.
        </p>
      </header>
      <ReconcileWorkbench transactions={transactions ?? []} />
    </div>
  );
}
