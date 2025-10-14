import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import type { TransactionRow } from "@/lib/auth/types";

interface Props {
  transactions: TransactionRow[];
}

export function RecentTransactions({ transactions }: Props) {
  if (!transactions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your Akahu account to start importing transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{tx.merchant_name}</p>
                {tx.description ? (
                  <p className="text-xs text-muted-foreground">{tx.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(
                    new Date(tx.occurred_at),
                  )}
                  {tx.account_name ? ` · ${tx.account_name}` : null}
                  {tx.bank_reference ? ` · Ref ${tx.bank_reference}` : null}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-medium">
                  {formatCurrency(Number(tx.amount ?? 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.envelope_name ?? "Unassigned"}
                  {tx.status ? ` · ${tx.status}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
