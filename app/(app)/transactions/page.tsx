import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/layout/transactions/transactions-table";
import { applySignedReceiptUrls } from "@/lib/storage/receipts";
import type { TransactionRow } from "@/lib/auth/types";
import { getPayPlanSummary } from "@/lib/server/pay-plan";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      `id, merchant_name, description, amount, occurred_at, status, bank_reference, bank_memo, receipt_url, duplicate_of, duplicate_status, duplicate_reviewed_at,
        account:accounts(name),
        envelope:envelopes(name),
        transaction_labels:transaction_labels(label:labels(name))`
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  const list: TransactionRow[] = error
    ? []
    : (transactions ?? []).map((transaction: any) => ({
        id: transaction.id,
        merchant_name: transaction.merchant_name,
        description: transaction.description,
        amount: transaction.amount,
        occurred_at: transaction.occurred_at,
        status: transaction.status,
        envelope_name: transaction.envelope?.name ?? null,
        account_name: transaction.account?.name ?? null,
        bank_reference: transaction.bank_reference,
        bank_memo: transaction.bank_memo,
        receipt_url: transaction.receipt_url,
        labels: Array.isArray(transaction.transaction_labels)
          ? transaction.transaction_labels
              .map((entry: any) => entry?.label?.name)
              .filter(Boolean)
          : [],
        duplicate_of: transaction.duplicate_of,
        duplicate_status: transaction.duplicate_status,
        duplicate_reviewed_at: transaction.duplicate_reviewed_at,
      }));

  const hydrated = await applySignedReceiptUrls(list);
  const payPlan = await getPayPlanSummary(supabase, session?.user.id);

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
      <TransactionsTable transactions={hydrated} payPlan={payPlan} />
    </div>
  );
}
