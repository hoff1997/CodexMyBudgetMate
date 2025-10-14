"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SummaryEnvelope, EnvelopeSummaryCard } from "@/components/layout/envelopes/envelope-summary-card";

interface Props {
  category: {
    id: string;
    name: string;
    envelopes: SummaryEnvelope[];
  };
  collapsedAll?: boolean;
  onSelectEnvelope?: (envelope: SummaryEnvelope) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

export function EnvelopeCategoryGroup({
  category,
  collapsedAll = false,
  onSelectEnvelope,
  onReorder,
}: Props) {
  const [collapsed, setCollapsed] = useState(collapsedAll);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setCollapsed(collapsedAll);
  }, [collapsedAll]);

  function handleDragStart(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!onReorder) return;
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!onReorder || dragIndex === null) return;
    event.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!onReorder || dragIndex === null) return;
    event.preventDefault();
    setOverIndex(null);
    if (index !== dragIndex) {
      onReorder(dragIndex, index);
    }
    setDragIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <header
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-muted/60"
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
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          {category.envelopes.map((envelope, index) => (
            <div
              key={envelope.id}
              draggable={Boolean(onReorder) && category.envelopes.length > 1}
              onDragStart={(event) => handleDragStart(index, event)}
              onDragOver={(event) => handleDragOver(index, event)}
              onDrop={(event) => handleDrop(index, event)}
              onDragEnd={handleDragEnd}
              className={
                overIndex === index && dragIndex !== null
                  ? "rounded-2xl border border-dashed border-primary/60 bg-primary/5 transition"
                  : undefined
              }
            >
              <EnvelopeSummaryCard envelope={envelope} onSelect={onSelectEnvelope} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
