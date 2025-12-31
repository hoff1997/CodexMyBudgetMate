"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, ArrowRight } from "lucide-react";
import { SummaryEnvelope, PRIORITY_CONFIG, type PriorityLevel } from "@/components/layout/envelopes/envelope-summary-card";
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
import { getEnvelopeStatus } from "@/lib/finance";
import { getProgressColor } from "@/lib/utils/progress-colors";
import { calculatePaysUntilDue, getNextDueDate, type PaySchedule } from "@/lib/utils/pays-until-due";
import { PaysUntilDueBadge, PaysUntilDuePlaceholder } from "@/components/shared/pays-until-due-badge";

// Category icon lookup map (used when database doesn't have icons)
export const CATEGORY_ICONS: Record<string, string> = {
  housing: "🏠",
  transport: "🚗",
  transportation: "🚗",
  food: "🍽️",
  groceries: "🛒",
  utilities: "💡",
  insurance: "🛡️",
  healthcare: "🏥",
  health: "🏥",
  entertainment: "🎬",
  shopping: "🛍️",
  subscriptions: "📱",
  personal: "👤",
  education: "📚",
  travel: "✈️",
  savings: "💰",
  debt: "💳",
  gifts: "🎁",
  pets: "🐾",
  kids: "👶",
  children: "👶",
  fitness: "🏃",
  clothing: "👕",
  uncategorised: "📁",
  uncategorized: "📁",
  other: "📁",
};

interface Props {
  category: {
    id: string;
    name: string;
    icon?: string;
    envelopes: SummaryEnvelope[];
  };
  collapsedAll?: boolean;
  isDragDisabled?: boolean;
  paySchedule?: PaySchedule | null;
  onSelectEnvelope?: (envelope: SummaryEnvelope) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

export function EnvelopeCategoryGroup({
  category,
  collapsedAll = false,
  isDragDisabled = false,
  paySchedule,
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

  // Get category icon
  const categoryIcon = category.icon || CATEGORY_ICONS[category.name.toLowerCase()] || "📁";

  return (
    <section className="overflow-hidden rounded-2xl border border-silver-light bg-white shadow-sm">
      <header
        className="flex cursor-pointer items-center justify-between bg-silver-very-light px-4 py-3 hover:bg-silver-light/60 border-b border-silver-light"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="h-4 w-4 text-text-medium" /> : <ChevronDown className="h-4 w-4 text-text-medium" />}
          <span className="text-lg">{categoryIcon}</span>
          <span className="font-semibold text-text-dark uppercase">{category.name}</span>
          <span className="text-text-light text-sm">
            ({category.envelopes.length} {category.envelopes.length === 1 ? 'envelope' : 'envelopes'})
          </span>
        </div>
        <span className="text-xs text-text-light">Click to {collapsed ? "expand" : "collapse"}</span>
      </header>
      {!collapsed && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {/* Table Header */}
            <div
              className="grid items-center border-b border-silver-light bg-silver-very-light/50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-text-light"
              style={{
                gridTemplateColumns: "4% 6% 22% 18% 12% 10% 16% 12%",
              }}
            >
              <div></div>
              <div className="text-center">Priority</div>
              <div>Envelope</div>
              <div className="text-center">Progress</div>
              <div className="text-right">Current</div>
              <div className="text-center">Due In</div>
              <div>Status</div>
              <div className="text-center">Gap</div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-silver-light/60">
              {category.envelopes.map((envelope) => (
                <SortableEnvelopeRow
                  key={envelope.id}
                  envelope={envelope}
                  paySchedule={paySchedule}
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

// Priority dot component for traffic light column
function PriorityDot({ priority }: { priority?: PriorityLevel | null }) {
  const level = priority ?? "discretionary";
  const config = PRIORITY_CONFIG[level];

  return (
    <div
      className={cn(
        "h-3 w-3 rounded-full flex-shrink-0",
        config.dotColor
      )}
      title={config.label}
    />
  );
}

// Status indicator component
function StatusIndicator({ status }: { status: string }) {
  const tone = status.toLowerCase();

  let dotColor = "bg-sage";
  let textColor = "text-sage-dark";

  if (tone.includes("over") || tone.includes("surplus")) {
    dotColor = "bg-sage-dark";
    textColor = "text-sage-dark";
  } else if (tone.includes("needs") || tone.includes("under") || tone.includes("attention")) {
    dotColor = "bg-blue";
    textColor = "text-blue";
  } else if (tone.includes("spending") || tone.includes("tracking")) {
    dotColor = "bg-silver";
    textColor = "text-text-medium";
  } else if (tone.includes("no target")) {
    dotColor = "bg-silver";
    textColor = "text-text-medium";
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-2 w-2 rounded-full flex-shrink-0", dotColor)} />
      <span className={cn("text-xs font-medium truncate", textColor)}>
        {status}
      </span>
    </div>
  );
}

function SortableEnvelopeRow({
  envelope,
  paySchedule,
  onSelectEnvelope,
  disableDrag,
}: {
  envelope: SummaryEnvelope;
  paySchedule?: PaySchedule | null;
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

  const isSpending = Boolean(envelope.is_spending);
  const status = getEnvelopeStatus(envelope);
  const statusLabel = isSpending ? "Spending" : status.label;
  const current = Number(envelope.current_amount ?? 0);
  const target = Number(envelope.target_amount ?? 0);
  const percentage = target ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;
  const gap = target - current;
  const hasGap = !isSpending && target > 0 && gap > 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid items-center px-4 py-2 hover:bg-sage-very-light/40 transition-colors cursor-pointer",
        isDragging && "opacity-50 bg-sage-very-light/60"
      )}
      onClick={() => onSelectEnvelope?.(envelope)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectEnvelope?.(envelope);
        }
      }}
      style={{
        ...style,
        gridTemplateColumns: "4% 6% 22% 18% 12% 10% 16% 12%",
        height: "44px",
      }}
    >
      {/* Drag Handle */}
      <div className="flex items-center justify-center">
        {!disableDrag ? (
          <button
            type="button"
            aria-label={`Reorder ${envelope.name}`}
            className="rounded-md p-1 text-silver hover:text-text-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Priority Dot */}
      <div className="flex items-center justify-center">
        <PriorityDot priority={envelope.priority} />
      </div>

      {/* Envelope Name + Icon + Target/Frequency */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0">{envelope.icon ?? "💼"}</span>
        <span className="font-medium text-text-dark truncate">{envelope.name}</span>
        {!isSpending && target > 0 && (
          <span className="text-text-light text-xs flex-shrink-0">
            ${target.toFixed(0)}/{(envelope.frequency ?? "mo").toString().replace("ly", "").slice(0, 2)}
          </span>
        )}
        {isSpending && (
          <span className="text-text-light text-xs bg-silver-very-light px-2 py-0.5 rounded flex-shrink-0">
            spending
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {!isSpending && target > 0 ? (
          <>
            <div className="flex-1 h-2 bg-silver-very-light rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: getProgressColor(percentage),
                }}
              />
            </div>
            <span className="text-xs text-text-light w-10 text-right">{percentage}%</span>
          </>
        ) : (
          <span className="text-text-light">—</span>
        )}
      </div>

      {/* Current Amount */}
      <div className="text-right text-text-dark">
        ${current.toLocaleString()}
      </div>

      {/* Due In - Pays until due */}
      <div className="flex items-center justify-center">
        {envelope.due_date && paySchedule && !isSpending ? (
          (() => {
            const nextDue = getNextDueDate(envelope.due_date);
            if (!nextDue) return <PaysUntilDuePlaceholder />;
            const isFunded = current >= target;
            const result = calculatePaysUntilDue(nextDue, paySchedule, isFunded);
            return (
              <PaysUntilDueBadge
                urgency={result.urgency}
                displayText={result.displayText}
                isFunded={isFunded}
              />
            );
          })()
        ) : (
          <PaysUntilDuePlaceholder />
        )}
      </div>

      {/* Status */}
      <div>
        <StatusIndicator status={statusLabel} />
      </div>

      {/* Gap + Navigation Arrow */}
      <div className="flex items-center justify-center gap-1 group">
        <span className="text-center">
          {hasGap ? (
            <span className="text-sm font-medium text-blue">
              -${gap.toFixed(0)}
            </span>
          ) : !isSpending && target > 0 && gap < 0 ? (
            <span className="text-sm font-medium text-sage-dark">
              +${Math.abs(gap).toFixed(0)}
            </span>
          ) : (
            <span className="text-[11px] text-text-light">—</span>
          )}
        </span>
        <ArrowRight className="h-4 w-4 text-text-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </div>
  );
}
