import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/layout/transactions/transactions-table";
import { applySignedReceiptUrls } from "@/lib/storage/receipts";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: transactions, error } = await supabase
    .from("transactions_view")
    .select(
      "id, merchant_name, description, amount, occurred_at, status, envelope_name, account_name, bank_reference, bank_memo, receipt_url, duplicate_of, duplicate_status, duplicate_reviewed_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  const list = error ? [] : transactions ?? [];
  const hydrated = await applySignedReceiptUrls(list);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-secondary">Transactions</h1>
        <p className="text-base text-muted-foreground">
          Review the 100 most recent transactions across every connected account.
        </p>
      </header>
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-3 text-sm text-destructive">
          Transactions are unavailable until the view is created in Supabase.
        </div>
      )}
      <TransactionsTable transactions={hydrated} />
    </div>
  );
}
