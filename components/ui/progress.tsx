import * as React from "react";

import { cn } from "@/lib/cn";
import { getProgressColor } from "@/lib/utils/progress-colors";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
  /** Use sage gradient that intensifies with percentage */
  useGradient?: boolean;
}

export function Progress({ value, className, indicatorClassName, useGradient = true, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100);

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
        className={cn("h-full rounded-full transition-all", !useGradient && "bg-sage", indicatorClassName)}
        style={{
          width: `${percentage}%`,
          ...(useGradient && !indicatorClassName ? { backgroundColor: getProgressColor(percentage) } : {}),
        }}
      />
    </div>
  );
}
