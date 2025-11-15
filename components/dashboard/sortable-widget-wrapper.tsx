"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DashboardWidgetConfig } from "@/lib/dashboard/widget-config";

interface SortableWidgetWrapperProps {
  widget: DashboardWidgetConfig;
  children: React.ReactNode;
}

export function SortableWidgetWrapper({ widget, children }: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-60 z-50"
      )}
    >
      {/* Drag handle - appears on hover */}
      <button
        type="button"
        aria-label={`Reorder ${widget.title}`}
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 z-10",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "rounded-md p-2 bg-background border shadow-sm",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Widget content */}
      <div className="w-full">{children}</div>
    </div>
  );
}
