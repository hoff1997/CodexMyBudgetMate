import { createClient } from "@/lib/supabase/server";
import { ReconcileWorkbench } from "./reconcile-workbench";
import { applySignedReceiptUrls } from "@/lib/storage/receipts";
import { PageHeaderWithHelp } from "@/components/coaching/PageHeaderWithHelp";
import type { TransactionRow } from "@/lib/auth/types";

export default async function ReconcilePage() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      `id, merchant_name, description, amount, occurred_at, status, bank_reference, bank_memo, receipt_url, duplicate_of, duplicate_status, duplicate_reviewed_at, allocation_plan_id, is_auto_allocated, parent_transaction_id, envelope_id,
        account:accounts!transactions_account_id_fkey(name),
        envelope:envelopes(name),
        transaction_labels:transaction_labels(label:labels(name))`
    )
    .eq("status", "pending")
    .order("occurred_at", { ascending: false })
    .limit(200);

  const normalised: TransactionRow[] = (transactions ?? []).map((transaction: any) => ({
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
    allocation_plan_id: transaction.allocation_plan_id,
    is_auto_allocated: transaction.is_auto_allocated,
    parent_transaction_id: transaction.parent_transaction_id,
  }));

  const hydrated = await applySignedReceiptUrls(normalised);

  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6">
      <PageHeaderWithHelp
        pageId="reconcile"
        title="Reconciliation centre"
        description="Queue imports, catch duplicates, split tricky spends, and approve in one pass."
      />
      <ReconcileWorkbench transactions={hydrated} />
    </div>
  );
}
