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
  const isDropdown = props.captionLayout === "dropdown-buttons" || props.captionLayout === "dropdown";

  return (
    <div ref={ref} className={cn("rounded-2xl border border-border/60 bg-background p-3 shadow-sm", className)}>
      <DayPicker
        {...props}
        showOutsideDays={showOutsideDays}
        className="relative"
        classNames={{
          months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
          month: "space-y-3",
          caption: cn(
            "flex pt-1 items-center mb-2",
            isDropdown ? "justify-between px-1" : "justify-center relative"
          ),
          caption_label: isDropdown ? "sr-only" : "text-sm font-medium text-secondary",
          caption_dropdowns: "flex items-center gap-1",
          dropdown: "appearance-none bg-transparent border border-input rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
          dropdown_month: "",
          dropdown_year: "",
          vhidden: "sr-only",
          nav: cn(
            "flex items-center gap-1",
            !isDropdown && "space-x-1"
          ),
          nav_button: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          nav_button_previous: isDropdown ? "" : "absolute left-1",
          nav_button_next: isDropdown ? "" : "absolute right-1",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7 mb-1",
          head_cell: "text-muted-foreground rounded-md text-xs font-medium text-center py-1",
          row: "grid grid-cols-7 mt-1",
          cell: "relative text-center text-sm p-0 focus-within:relative focus-within:z-20",
          day: "h-9 w-9 mx-auto flex items-center justify-center rounded-lg text-sm font-medium text-secondary transition hover:bg-primary/10",
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

