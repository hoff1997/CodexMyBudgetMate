import { Lightbulb } from "lucide-react";

interface Props {
  count: number;
}

export function SmartSuggestionsBanner({ count }: Props) {
  if (!count) return null;

  return (
    <div className="rounded-3xl border border-primary/40 bg-primary/5 p-4 text-sm text-primary">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5" />
        <p>
          Based on your recent approvals we found {count} transactions with matching merchant memory
          suggestions. Use the Assign button to accept or tweak the suggested envelope before
          approving.
        </p>
      </div>
    </div>
  );
}
