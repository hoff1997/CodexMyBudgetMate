import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type OverdueEnvelope = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: Date;
  dueInDays: number;
  fundingGap: number;
};

interface Props {
  envelopes: OverdueEnvelope[];
}

export function OverdueEnvelopesCard({ envelopes }: Props) {
  const list = envelopes.slice(0, 4);

  return (
    <Card className="h-full border border-rose-100 bg-white/80">
      <CardHeader>
        <CardTitle className="text-lg text-rose-700">Envelopes needing attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length ? (
          list.map((env) => (
            <div key={env.id} className="rounded-xl border border-rose-100 bg-rose-50/70 p-4">
              <div className="flex items-center justify-between text-sm font-medium text-rose-800">
                <span>{env.name}</span>
                <span>{format(env.dueDate, "dd/MM/yyyy")}</span>
              </div>
              <p className="mt-2 text-xs text-rose-600">
                {env.dueInDays <= 0
                  ? "Due now"
                  : `${env.dueInDays} day${env.dueInDays === 1 ? "" : "s"} until due`}
              </p>
              <p className="mt-2 text-sm text-secondary">
                Funding gap: ${env.fundingGap.toFixed(2)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-muted bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            All envelopes are on track. Keep an eye on the planner if your pay changes.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
