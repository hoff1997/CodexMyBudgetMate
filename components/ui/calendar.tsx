"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
          caption_label: props.captionLayout === "dropdown-buttons" || props.captionLayout === "dropdown" ? "sr-only" : "text-sm font-medium text-secondary",
          caption_dropdowns: "flex justify-center gap-1",
          dropdown: "appearance-none bg-transparent border border-input rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
          dropdown_month: "mr-1",
          dropdown_year: "",
          vhidden: "sr-only",
          nav: "space-x-1 flex items-center",
          nav_button: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex text-muted-foreground",
          head_cell: "flex-1 rounded-md text-xs font-medium",
          row: "flex w-full mt-1",
          cell: "relative flex-1 text-center text-sm p-0 focus-within:relative focus-within:z-20",
          day: "flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium text-secondary transition hover:bg-primary/10",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          day_today: "border border-primary text-primary",
          day_outside: "text-muted-foreground/60",
          day_disabled: "opacity-50",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

