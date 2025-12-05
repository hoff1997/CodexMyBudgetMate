import * as React from "react";

import { cn } from "@/lib/cn";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sage-very-light", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-sage transition-all", indicatorClassName)}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
