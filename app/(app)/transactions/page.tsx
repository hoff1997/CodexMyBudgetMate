import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/layout/transactions/transactions-table";
import { TransactionsHeader } from "@/components/layout/transactions/transactions-header";
import { applySignedReceiptUrls } from "@/lib/storage/receipts";
import type { TransactionRow } from "@/lib/auth/types";
import { getPayPlanSummary } from "@/lib/server/pay-plan";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      `id, merchant_name, description, amount, occurred_at, status, bank_reference, bank_memo, receipt_url, duplicate_of, duplicate_status, duplicate_reviewed_at, envelope_id,
        account:accounts!transactions_account_id_fkey(name),
        envelope:envelopes(name),
        transaction_labels:transaction_labels(label:labels(name))`
    )
    .eq("status", "approved")
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[TransactionsPage] Query error:", error.message, error.details, error.hint);
  }

  const list: TransactionRow[] = error
    ? []
    : (transactions ?? []).map((transaction: any) => ({
        id: transaction.id,
        merchant_name: transaction.merchant_name,
        description: transaction.description,
        amount: transaction.amount,
        occurred_at: transaction.occurred_at,
        status: transaction.status,
        envelope_id: transaction.envelope_id ?? null,
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
  const payPlan = await getPayPlanSummary(supabase, user?.id);

  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6">
      <TransactionsHeader />
      {error && (
        <div className="rounded-xl border border-[#6B9ECE]/40 bg-[#DDEAF5] px-6 py-3 text-sm text-[#4A7A9E]">
          Unable to load transactions. Please check your connection and try again.
        </div>
      )}
      <TransactionsTable transactions={hydrated} payPlan={payPlan} />
    </div>
  );
}
