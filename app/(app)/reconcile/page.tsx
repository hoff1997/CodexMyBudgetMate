import { createClient } from "@/lib/supabase/server";
import { ReconcileWorkbench } from "./reconcile-workbench";
import { applySignedReceiptUrls } from "@/lib/storage/receipts";

export default async function ReconcilePage() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions_view")
    .select(
      "id, merchant_name, description, amount, occurred_at, status, envelope_name, account_name, bank_reference, bank_memo, receipt_url, duplicate_of, duplicate_status, duplicate_reviewed_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(200);

  const hydrated = await applySignedReceiptUrls(transactions ?? []);

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
      <ReconcileWorkbench transactions={hydrated} />
    </div>
  );
}
