import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/finance";
import { Button } from "@/components/ui/button";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: transactions, error } = await supabase
    .from("transactions_view")
    .select(
      "id, merchant_name, description, amount, occurred_at, status, envelope_name, account_name, bank_reference, bank_memo, receipt_url",
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  const list = error ? [] : transactions ?? [];

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
      <section className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-6 py-3">Merchant</th>
              <th className="px-6 py-3">Envelope</th>
              <th className="px-6 py-3">Account</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Bank ref</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((transaction) => {
              const status = transaction.status?.toLowerCase() ?? "pending";
              return (
                <tr key={transaction.id} className="text-sm align-top">
                  <td className="px-6 py-3 font-medium text-secondary">
                    <div className="flex items-center gap-2">
                      {transaction.merchant_name}
                      {status === "unmatched" ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                          Needs review
                        </span>
                      ) : status === "approved" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          ✓
                        </span>
                      ) : status === "pending" ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          ⏳
                        </span>
                      ) : null}
                    </div>
                    {transaction.description ? (
                      <p className="text-xs text-muted-foreground">{transaction.description}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {transaction.envelope_name ?? "Unassigned"}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {transaction.account_name ?? "—"}
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {formatCurrency(Number(transaction.amount ?? 0))}
                  </td>
                  <td className="px-6 py-3 capitalize text-muted-foreground">{status}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Intl.DateTimeFormat("en-NZ", {
                      dateStyle: "medium",
                    }).format(new Date(transaction.occurred_at))}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    <div className="space-y-1">
                      {transaction.bank_reference ? <p>Ref {transaction.bank_reference}</p> : null}
                      {transaction.bank_memo ? (
                        <p className="text-xs text-muted-foreground">{transaction.bank_memo}</p>
                      ) : null}
                      {transaction.receipt_url ? (
                        <a
                          className="text-xs text-primary underline"
                          href={transaction.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View receipt
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          console.log("Split", transaction.id);
                        }}
                      >
                        Split
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          console.log("Labels", transaction.id);
                        }}
                      >
                        Labels
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => {
                          console.log("Approve", transaction.id);
                        }}
                      >
                        {status === "approved" ? "Update" : "Approve"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!list.length && (
              <tr>
                <td className="px-6 py-10 text-center text-sm text-muted-foreground" colSpan={8}>
                  No transactions yet. Import data from Akahu to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
