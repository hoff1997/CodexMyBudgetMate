"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/cn";

export type CalendarProps = DayPickerProps & {
  className?: string;
};

export function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  return (
    <div ref={ref} className={cn("rounded-2xl border border-border/60 bg-background p-3 shadow-sm", className)}>
      <DayPicker
        {...props}
        showOutsideDays={showOutsideDays}
        className="relative"
        classNames={{
          months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium text-secondary",
          nav: "flex items-center",
          nav_button: "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition",
          table: "w-full border-collapse space-y-1",
          head_row: "flex text-muted-foreground",
          head_cell: "flex-1 rounded-md text-xs font-medium",
          row: "flex w-full mt-1",
          cell: "relative flex-1",
          day: "flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium text-secondary transition hover:bg-primary/10",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          day_today: "border border-primary text-primary",
          day_outside: "text-muted-foreground/60",
          day_disabled: "opacity-50",
        }}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

