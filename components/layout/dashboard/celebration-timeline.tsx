import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export type CelebrationEvent = {
  id: string;
  title: string;
  description: string;
  achievedAt: Date;
};

interface Props {
  events: CelebrationEvent[];
}

export function CelebrationTimeline({ events }: Props) {
  const sorted = [...events].sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime()).slice(0, 5);

  return (
    <Card className="h-full border border-emerald-100 bg-emerald-50/60">
      <CardHeader>
        <CardTitle className="text-lg text-emerald-800">Recent celebrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length ? (
          <ol className="space-y-3 text-sm text-emerald-900">
            {sorted.map((event) => (
              <li key={event.id} className="rounded-lg border border-emerald-200 bg-white/70 p-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-emerald-700">{format(event.achievedAt, "dd MMM yyyy")}</p>
                <p className="mt-2 text-xs text-emerald-800">{event.description}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-lg border border-dashed border-emerald-300 bg-white/70 p-4 text-xs text-emerald-800">
            Fund an envelope or complete a reconciliation to unlock celebration milestones. We&apos;ll log
            them here once the planner detects milestones.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
