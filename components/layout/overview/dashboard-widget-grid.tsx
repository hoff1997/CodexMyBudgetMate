"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";

export type DashboardWidget = {
  id: string;
  className?: string;
  node: React.ReactNode;
};

interface DashboardWidgetGridProps {
  widgets: DashboardWidget[];
  storageKey?: string | null;
  defaultOrder?: string[];
}

export function DashboardWidgetGrid({ widgets, storageKey = null, defaultOrder }: DashboardWidgetGridProps) {
  const widgetIds = useMemo(() => widgets.map((widget) => widget.id), [widgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const resolveDefaultOrder = useCallback((ids: string[]) => {
    if (!defaultOrder?.length) return ids;
    const ordered = defaultOrder.filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  }, [defaultOrder]);

  const readStoredOrder = () => {
    if (!storageKey || typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return null;
      return parsed.filter((id: unknown): id is string => typeof id === "string");
    } catch (error) {
      console.warn("Failed to parse stored widget order", error);
      return null;
    }
  };

  const [order, setOrder] = useState<string[]>(() => {
    const stored = readStoredOrder();
    if (stored?.length) {
      const filtered = stored.filter((id) => widgetIds.includes(id));
      if (filtered.length) {
        const missing = widgetIds.filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
      }
    }
    return resolveDefaultOrder(widgetIds);
  });

  useEffect(() => {
    setOrder((prev) => {
      const filtered = prev.filter((id) => widgetIds.includes(id));
      const missing = widgetIds.filter((id) => !filtered.includes(id));
      const base = filtered.length ? filtered : resolveDefaultOrder(widgetIds);
      return [...base, ...missing];
    });
  }, [widgetIds, resolveDefaultOrder]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(order));
  }, [order, storageKey]);

  const widgetMap = useMemo(() => new Map(widgets.map((widget) => [widget.id, widget])), [widgets]);

  const widgetsToRender = useMemo(() => {
    const ordered = order
      .map((id) => widgetMap.get(id))
      .filter((widget): widget is DashboardWidget => Boolean(widget));
    const missing = widgets.filter((widget) => !order.includes(widget.id));
    return [...ordered, ...missing];
  }, [order, widgetMap, widgets]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((id) => id === active.id);
      const newIndex = prev.findIndex((id) => id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={widgetsToRender.map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-6 lg:grid-cols-3">
          {widgetsToRender.map((widget) => (
            <SortableDashboardWidget key={widget.id} id={widget.id} className={widget.className}>
              {widget.node}
            </SortableDashboardWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableDashboardWidget({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative", className, isDragging && "opacity-60")}
    >
      <button
        type="button"
        aria-label="Reorder dashboard widget"
        className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
