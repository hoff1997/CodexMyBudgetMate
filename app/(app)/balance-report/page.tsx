import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BalanceReportPage() {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, type, current_balance")
    .order("type", { ascending: true });

  const list = error ? [] : accounts ?? [];
  const totals = list.reduce(
    (acc, account) => {
      const balance = Number(account.current_balance ?? 0);
      if (account.type === "debt") {
        acc.liabilities += balance;
      } else {
        acc.assets += balance;
      }
      return acc;
    },
    { assets: 0, liabilities: 0 },
  );

  const netBalance = totals.assets - totals.liabilities;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-10 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-secondary">Balance report</h1>
        <p className="text-base text-muted-foreground">
          Live view of account balances grouped by assets and liabilities. Use it to understand
          how envelopes reconcile to real-world totals.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totals.assets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totals.liabilities)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net position</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(netBalance)}</p>
          </CardContent>
        </Card>
      </section>
      <section className="overflow-hidden rounded-xl border">
        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
            Accounts data is unavailable right now. Add the accounts table or sync from Supabase to
            enable this report.
          </div>
        )}
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-6 py-3">Account</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((account) => (
              <tr key={account.id} className="text-sm">
                <td className="px-6 py-3 font-medium text-secondary">{account.name}</td>
                <td className="px-6 py-3 capitalize text-muted-foreground">{account.type}</td>
                <td className="px-6 py-3">{formatCurrency(Number(account.current_balance ?? 0))}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className="px-6 py-10 text-center text-sm text-muted-foreground" colSpan={3}>
                  No accounts yet. Add them to unlock balance reporting.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
