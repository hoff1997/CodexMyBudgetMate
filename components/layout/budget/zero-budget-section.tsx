"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { ZeroBudgetEnvelopeCard } from "./zero-budget-envelope-card";
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

interface ZeroBudgetEnvelope {
  id: string;
  name: string;
  icon?: string | null;
  envelope_type?: string;
  target_amount?: number | string;
  pay_cycle_amount?: number | string;
  current_amount?: number | string;
  opening_balance?: number | string;
  frequency?: string;
  next_payment_due?: string;
  notes?: string | null;
}

interface Props {
  title: string;
  type: "income" | "expense";
  envelopes: ZeroBudgetEnvelope[];
  payCycle: string;
  collapsedAll?: boolean;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

export function ZeroBudgetSection({
  title,
  type,
  envelopes,
  payCycle,
  collapsedAll = false,
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

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

  const ids = useMemo(() => envelopes.map((envelope) => envelope.id), [envelopes]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!onReorder || !over || active.id === over.id) return;
    const fromIndex = envelopes.findIndex((envelope) => envelope.id === active.id);
    const toIndex = envelopes.findIndex((envelope) => envelope.id === over.id);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    onReorder(fromIndex, toIndex);
  };

  const isCollapsed = collapsedAll || collapsed;
  const Icon = type === "income" ? ArrowUpCircle : ArrowDownCircle;
  const iconColor = type === "income" ? "text-green-600" : "text-red-600";
  const titleColor = type === "income" ? "text-green-600" : "text-red-600";

  // Calculate subtotals
  const subtotals = {
    payCycle: envelopes.reduce((sum, env) => sum + Number(env.pay_cycle_amount ?? 0), 0),
    opening: envelopes.reduce((sum, env) => sum + Number(env.opening_balance ?? 0), 0),
    current: envelopes.reduce((sum, env) => sum + Number(env.current_amount ?? 0), 0),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", iconColor)} />
          <h3 className={cn("text-lg font-semibold", titleColor)}>{title}</h3>
          <span className="text-sm text-muted-foreground">({envelopes.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-muted-foreground transition hover:bg-muted"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Expand
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {envelopes.map((envelope) => (
                <SortableEnvelopeCard
                  key={envelope.id}
                  envelope={envelope}
                  payCycle={payCycle}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  disableDrag={!onReorder || envelopes.length <= 1}
                />
              ))}

            </div>
          </SortableContext>
        </DndContext>
      )}

      {!isCollapsed && envelopes.length > 0 && (
        <div
          className={cn(
            "rounded-lg border-2 p-3 mt-2",
            type === "income"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
            <span className={type === "income" ? "text-green-700" : "text-red-700"}>
              {title} Subtotal
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className={type === "income" ? "text-green-700" : "text-red-700"}>
                <span className="text-xs text-muted-foreground mr-1">Per {payCycle}:</span>
                ${subtotals.payCycle.toFixed(2)}
              </div>
              <div className={type === "income" ? "text-green-700" : "text-red-700"}>
                <span className="text-xs text-muted-foreground mr-1">Opening:</span>
                ${subtotals.opening.toFixed(2)}
              </div>
              <div className={type === "income" ? "text-green-700" : "text-red-700"}>
                <span className="text-xs text-muted-foreground mr-1">Current:</span>
                ${subtotals.current.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCollapsed && envelopes.length > 0 && (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            type === "income"
              ? "border-green-200 bg-green-50/50"
              : "border-red-200 bg-red-50/50"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Collapsed — {envelopes.length} envelopes</span>
            <span className={type === "income" ? "text-green-700" : "text-red-700"}>
              Total: ${subtotals.payCycle.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableEnvelopeCard({
  envelope,
  payCycle,
  onUpdate,
  onDelete,
  disableDrag,
}: {
  envelope: ZeroBudgetEnvelope;
  payCycle: string;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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
    <div ref={setNodeRef} style={style}>
      <ZeroBudgetEnvelopeCard
        envelope={envelope}
        payCycle={payCycle}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
}
