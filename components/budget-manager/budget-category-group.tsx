"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { UnifiedEnvelopeTable } from "@/components/shared/unified-envelope-table";
import type { UnifiedEnvelopeData, IncomeSource, GapAnalysisData, CategoryOption, PaySchedule } from "@/lib/types/unified-envelope";
import { cn } from "@/lib/cn";

type SortColumn = 'name' | 'category' | 'priority' | 'subtype' | 'targetAmount' | 'frequency' | 'dueDate' | 'dueIn' | 'currentAmount' | 'totalFunded' | null;
type SortDirection = 'asc' | 'desc';

interface BudgetCategoryGroupProps {
  category: {
    id: string;
    name: string;
    envelopes: UnifiedEnvelopeData[];
  };
  allCategories: CategoryOption[];
  incomeSources: IncomeSource[];
  payCycle: 'weekly' | 'fortnightly' | 'monthly';
  paySchedule?: PaySchedule | null;
  gapAnalysisData?: GapAnalysisData[];
  collapsedAll?: boolean;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  enableDragAndDrop?: boolean;
  isDragDisabled?: boolean;
  showOpeningBalance?: boolean;
  showCurrentBalance?: boolean;
  isOnboarding?: boolean;
  onEnvelopeUpdate: (id: string, updates: Partial<UnifiedEnvelopeData>) => void | Promise<void>;
  onEnvelopeDelete: (id: string) => void | Promise<void>;
  onAllocationUpdate?: (envelopeId: string, incomeSourceId: string, amount: number) => void | Promise<void>;
  onReorder?: (fromIndex: number, toIndex: number) => void | Promise<void>;
}

export function BudgetCategoryGroup({
  category,
  allCategories,
  incomeSources,
  payCycle,
  paySchedule,
  gapAnalysisData,
  collapsedAll = false,
  sortColumn,
  sortDirection,
  enableDragAndDrop = false,
  isDragDisabled = false,
  showOpeningBalance = true,
  showCurrentBalance = true,
  isOnboarding = false,
  onEnvelopeUpdate,
  onEnvelopeDelete,
  onAllocationUpdate,
  onReorder,
}: BudgetCategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(collapsedAll);

  // Make category a droppable target for cross-category moves
  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: {
      type: 'category',
      categoryId: category.id,
    },
  });

  // Get envelope IDs for sortable context
  const envelopeIds = category.envelopes.map(e => e.id);

  useEffect(() => {
    setCollapsed(collapsedAll);
  }, [collapsedAll]);

  // Calculate category totals
  const categoryTotalAllocated = category.envelopes.reduce((sum, env) => {
    const envTotal = Object.values(env.incomeAllocations || {}).reduce((s, amt) => s + amt, 0);
    return sum + envTotal;
  }, 0);

  const categoryTotalTarget = category.envelopes.reduce((sum, env) => sum + (env.targetAmount || 0), 0);

  // Filter gap analysis data for this category's envelopes
  const categoryEnvelopeIds = category.envelopes.map(e => e.id);
  const categoryGapData = gapAnalysisData?.filter(g => categoryEnvelopeIds.includes(g.envelope_id));

  // Get total allocation for sorting
  const getTotalAllocation = (envelope: UnifiedEnvelopeData): number => {
    return Object.values(envelope.incomeAllocations || {}).reduce((sum, amt) => sum + amt, 0);
  };

  // Sort envelopes based on parent's sort state
  const sortedEnvelopes = useMemo(() => {
    if (!sortColumn) return category.envelopes;

    const priorityOrder: Record<string, number> = { essential: 0, important: 1, discretionary: 2 };
    const frequencyOrder: Record<string, number> = { weekly: 0, fortnightly: 1, monthly: 2, quarterly: 3, annually: 4 };

    return [...category.envelopes].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          const catNameA = allCategories.find(c => c.id === a.categoryId)?.name || 'Uncategorised';
          const catNameB = allCategories.find(c => c.id === b.categoryId)?.name || 'Uncategorised';
          comparison = catNameA.localeCompare(catNameB);
          break;
        case 'priority':
          const priorityA = priorityOrder[a.priority || 'important'] ?? 1;
          const priorityB = priorityOrder[b.priority || 'important'] ?? 1;
          comparison = priorityA - priorityB;
          break;
        case 'subtype':
          comparison = (a.subtype || '').localeCompare(b.subtype || '');
          break;
        case 'targetAmount':
          comparison = (a.targetAmount || 0) - (b.targetAmount || 0);
          break;
        case 'frequency':
          const freqA = frequencyOrder[a.frequency || 'monthly'] ?? 2;
          const freqB = frequencyOrder[b.frequency || 'monthly'] ?? 2;
          comparison = freqA - freqB;
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'currentAmount':
          comparison = (a.currentAmount || 0) - (b.currentAmount || 0);
          break;
        case 'totalFunded':
          const totalA = getTotalAllocation(a);
          const totalB = getTotalAllocation(b);
          comparison = totalA - totalB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [category.envelopes, sortColumn, sortDirection, allCategories]);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm transition-colors",
        isOver && enableDragAndDrop && !isDragDisabled && "border-primary/50 bg-primary/5"
      )}
    >
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
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="text-muted-foreground/60">Click to {collapsed ? "expand" : "collapse"}</span>
        </div>
      </header>
      {!collapsed && (
        <div className="px-2 pb-2">
          <SortableContext items={envelopeIds} strategy={verticalListSortingStrategy}>
            <UnifiedEnvelopeTable
              envelopes={sortedEnvelopes}
              incomeSources={incomeSources}
              mode={isOnboarding ? 'onboarding' : 'maintenance'}
              payCycle={payCycle}
              paySchedule={paySchedule}
              categories={allCategories}
              showCategories={false}
              showIncomeColumns={true}
              showOpeningBalance={showOpeningBalance}
              showCurrentBalance={showCurrentBalance}
              showDueIn={!!paySchedule && !isOnboarding}
              showNotes={true}
              enableDragAndDrop={enableDragAndDrop}
              isDragDisabled={isDragDisabled}
              hideHeader={true}
              gapAnalysisData={categoryGapData}
              onEnvelopeUpdate={onEnvelopeUpdate}
              onEnvelopeDelete={onEnvelopeDelete}
              onAllocationUpdate={onAllocationUpdate}
              onReorder={onReorder}
            />
          </SortableContext>
        </div>
      )}
    </section>
  );
}
