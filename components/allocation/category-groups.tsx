"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UnifiedEnvelopeData, IncomeSource, PaySchedule } from "@/lib/types/unified-envelope";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  is_system: boolean;
  display_order: number;
}

interface CategoryGroupsProps {
  envelopes: UnifiedEnvelopeData[];
  categories: Category[];
  incomeSources: IncomeSource[];
  paySchedule: PaySchedule | null;
  enhancedView: boolean;
  onEnvelopeChange: (id: string, field: keyof UnifiedEnvelopeData, value: unknown) => void;
  onFundedByChange: (id: string, value: string) => void;
  calculatePerPay: (envelope: UnifiedEnvelopeData) => number;
  onChangeCategoryClick: (envelope: UnifiedEnvelopeData) => void;
  onArchiveClick: (envelope: UnifiedEnvelopeData) => void;
  renderEnvelopeRow: (
    envelope: UnifiedEnvelopeData,
    options: {
      showCategoryColumn?: boolean;
      onChangeCategoryClick?: (envelope: UnifiedEnvelopeData) => void;
      onArchiveClick?: (envelope: UnifiedEnvelopeData) => void;
    }
  ) => React.ReactNode;
}

// Category color palette - matching priority view styling
const CATEGORY_COLORS = [
  { bgColor: "bg-[#E2EEEC]", borderColor: "border-[#B8D4D0]", dotColor: "bg-[#5A7E7A]" }, // sage
  { bgColor: "bg-[#DDEAF5]", borderColor: "border-[#6B9ECE]", dotColor: "bg-[#6B9ECE]" }, // blue
  { bgColor: "bg-[#F3F4F6]", borderColor: "border-[#E5E7EB]", dotColor: "bg-[#9CA3AF]" }, // silver
  { bgColor: "bg-[#F5E6C4]", borderColor: "border-[#D4A853]", dotColor: "bg-[#D4A853]" }, // gold
  { bgColor: "bg-[#FCE7F3]", borderColor: "border-[#EC4899]", dotColor: "bg-[#EC4899]" }, // pink
  { bgColor: "bg-[#E0E7FF]", borderColor: "border-[#6366F1]", dotColor: "bg-[#6366F1]" }, // indigo
];

export function CategoryGroups({
  envelopes,
  categories,
  enhancedView,
  renderEnvelopeRow,
  onChangeCategoryClick,
  onArchiveClick,
}: CategoryGroupsProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Group envelopes by category
  const envelopesByCategory = useMemo(() => {
    const grouped = new Map<string, UnifiedEnvelopeData[]>();

    // Initialize with all categories
    categories.forEach((cat) => grouped.set(cat.id, []));

    // Add "Uncategorized" group
    grouped.set("uncategorized", []);

    // Group envelopes
    envelopes.forEach((env) => {
      const categoryId = env.category_id || "uncategorized";
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(env);
    });

    // Sort envelopes within each category by category_display_order
    grouped.forEach((envs) => {
      envs.sort((a, b) =>
        (a.category_display_order || 0) - (b.category_display_order || 0)
      );
    });

    return grouped;
  }, [envelopes, categories]);

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Sort categories by display_order
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.display_order - b.display_order);
  }, [categories]);

  // Get color scheme for a category (cycle through palette)
  const getCategoryColors = (index: number) => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };

  // Render a category group (matches priority group structure exactly)
  const renderCategoryGroup = (
    categoryId: string,
    categoryName: string,
    categoryIcon: string | null | undefined,
    categoryEnvelopes: UnifiedEnvelopeData[],
    colorIndex: number
  ) => {
    if (categoryEnvelopes.length === 0) return null;

    const isExpanded = !collapsedCategories.has(categoryId);
    const colors = getCategoryColors(colorIndex);

    return (
      <div key={categoryId} className="mb-5">
        {/* Group Header - matches priority group header */}
        <button
          type="button"
          onClick={() => toggleCategory(categoryId)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-t-md cursor-pointer",
            colors.bgColor,
            "border border-b-0",
            colors.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {categoryIcon ? (
              <span className="text-base">{categoryIcon}</span>
            ) : (
              <span className={cn("w-2 h-2 rounded-full", colors.dotColor)} />
            )}
            <span className="font-semibold text-xs uppercase tracking-wide text-text-dark">
              {categoryName}
            </span>
            <span className="text-xs text-text-medium font-normal">
              ({categoryEnvelopes.length} {categoryEnvelopes.length === 1 ? 'envelope' : 'envelopes'})
            </span>
          </div>
        </button>

        {/* Table - matches priority group table structure exactly */}
        {isExpanded && (
          <div className={cn("border rounded-b-md overflow-hidden", colors.borderColor)}>
            <table className="w-full table-fixed">
              <thead className="bg-silver-very-light border-b border-silver-light">
                <tr>
                  {/* 1. Drag Handle */}
                  <th className="px-1 py-2 w-[24px]"></th>
                  {/* 2. Quick Glance (Dashboard Monitor) */}
                  <th className="px-1 py-2 text-center w-[24px]" title="Quick Glance - Show on Dashboard">
                    <Eye className="h-3 w-3 text-text-light mx-auto" />
                  </th>
                  {/* 3. Priority */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[40px]">Pri</th>
                  {/* 4. Status Icon */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[36px]"></th>
                  {/* 4. Envelope Name */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[160px]">
                    <span className="flex items-center">Envelope</span>
                  </th>
                  {/* 5. Type */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">Type</th>
                  {/* 6. Target */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[80px]">
                    <span className="flex items-center justify-end">Target</span>
                  </th>
                  {/* 7. Frequency */}
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[50px]">Freq</th>
                  {/* 8. Due Date */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[75px]">Due</th>
                  {/* 9. Funded By */}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">Funded</th>
                  {/* 10. Per Pay */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">
                    <span className="flex items-center justify-end">Per Pay</span>
                  </th>
                  {/* 11. Annual */}
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[65px]">Annual</th>
                  {/* Enhanced View Columns */}
                  {enhancedView && (
                    <>
                      {/* 12. Progress Bar */}
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[90px]">Progress</th>
                      {/* 13. Current Balance */}
                      <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[70px]">
                        <span className="flex items-center justify-end">Current</span>
                      </th>
                      {/* 14. Due In */}
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[60px]">Due In</th>
                    </>
                  )}
                  {/* 15. Notes Icon */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[28px]"></th>
                  {/* 16. Actions */}
                  <th className="px-1 py-2 text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[32px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-silver-very-light">
                {categoryEnvelopes.map((envelope) =>
                  renderEnvelopeRow(envelope, {
                    showCategoryColumn: false,
                    onChangeCategoryClick,
                    onArchiveClick,
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Render each category */}
      {sortedCategories.map((category, index) => {
        const categoryEnvelopes = envelopesByCategory.get(category.id) || [];
        return renderCategoryGroup(
          category.id,
          category.name,
          category.icon,
          categoryEnvelopes,
          index
        );
      })}

      {/* Uncategorized envelopes */}
      {(() => {
        const uncategorizedEnvelopes = envelopesByCategory.get("uncategorized") || [];
        if (uncategorizedEnvelopes.length === 0) return null;

        return renderCategoryGroup(
          "uncategorized",
          "Uncategorized",
          "📁",
          uncategorizedEnvelopes,
          sortedCategories.length // Use next color in sequence
        );
      })()}
    </div>
  );
}
