"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { SummaryEnvelope, EnvelopeSummaryCard } from "@/components/layout/envelopes/envelope-summary-card";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/cn";

interface Props {
  category: {
    id: string;
    name: string;
    envelopes: SummaryEnvelope[];
  };
  collapsedAll?: boolean;
  isDragDisabled?: boolean;
  onSelectEnvelope?: (envelope: SummaryEnvelope) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

export function EnvelopeCategoryGroup({
  category,
  collapsedAll = false,
  isDragDisabled = false,
  onSelectEnvelope,
  onReorder,
}: Props) {
  const [collapsed, setCollapsed] = useState(collapsedAll);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setCollapsed(collapsedAll);
  }, [collapsedAll]);

  const ids = useMemo(() => category.envelopes.map((envelope) => envelope.id), [category.envelopes]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!onReorder || !over || active.id === over.id) return;
    const fromIndex = category.envelopes.findIndex((envelope) => envelope.id === active.id);
    const toIndex = category.envelopes.findIndex((envelope) => envelope.id === over.id);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    onReorder(fromIndex, toIndex);
  };

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <header
        className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted/60"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>{category.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {category.envelopes.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Click to {collapsed ? "expand" : "collapse"}</p>
      </header>
      {!collapsed && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1 px-2 py-2">
              {category.envelopes.map((envelope) => (
                <SortableEnvelopeCard
                  key={envelope.id}
                  envelope={envelope}
                  onSelectEnvelope={onSelectEnvelope}
                  disableDrag={isDragDisabled || !onReorder || category.envelopes.length <= 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortableEnvelopeCard({
  envelope,
  onSelectEnvelope,
  disableDrag,
}: {
  envelope: SummaryEnvelope;
  onSelectEnvelope?: (envelope: SummaryEnvelope) => void;
  disableDrag: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: envelope.id,
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 rounded-lg", isDragging && "opacity-50")}
    >
      {!disableDrag ? (
        <button
          type="button"
          aria-label={`Reorder ${envelope.name}`}
          className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-6" />
      )}
      <div className="flex-1 min-w-0">
        <EnvelopeSummaryCard envelope={envelope} onSelect={onSelectEnvelope} />
      </div>
    </div>
  );
}
