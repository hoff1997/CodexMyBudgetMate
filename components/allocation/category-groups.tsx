"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UnifiedEnvelopeData, IncomeSource, PaySchedule } from "@/lib/types/unified-envelope";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
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
  onEditCategory?: (categoryId: string, updates: { name?: string; color?: string }) => void;
  renderEnvelopeRow: (
    envelope: UnifiedEnvelopeData,
    options: {
      showCategoryColumn?: boolean;
      onChangeCategoryClick?: (envelope: UnifiedEnvelopeData) => void;
      onArchiveClick?: (envelope: UnifiedEnvelopeData) => void;
    }
  ) => React.ReactNode;
  /** If true, preserves the order of envelopes as passed (for external sorting) */
  preserveOrder?: boolean;
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
  onEditCategory,
  preserveOrder = false,
}: CategoryGroupsProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3b82f6");

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

    // Only sort within categories if not preserving external order
    if (!preserveOrder) {
      grouped.forEach((envs) => {
        envs.sort((a, b) =>
          (a.category_display_order || 0) - (b.category_display_order || 0)
        );
      });
    }

    return grouped;
  }, [envelopes, categories, preserveOrder]);

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

  // Handle opening edit dialog
  const handleEditClick = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(category);
    setEditName(category.name);
    setEditColor(category.color || "#3b82f6");
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!editingCategory || !onEditCategory) return;

    // For system categories like "Celebrations", only allow color changes
    const isSystemCategory = editingCategory.is_system ||
      editingCategory.name.toLowerCase() === "celebrations";

    onEditCategory(editingCategory.id, {
      name: isSystemCategory ? undefined : editName,
      color: editColor,
    });
    setEditingCategory(null);
  };

  // Render a category group (matches priority group structure exactly)
  const renderCategoryGroup = (
    category: Category | null,
    categoryEnvelopes: UnifiedEnvelopeData[],
    colorIndex: number
  ) => {
    if (categoryEnvelopes.length === 0) return null;

    const categoryId = category?.id || "uncategorized";
    const categoryName = category?.name || "Uncategorized";
    const categoryIcon = category?.icon || (category ? null : "📁");
    const isSystemCategory = category?.is_system || categoryName.toLowerCase() === "celebrations";
    const isExpanded = !collapsedCategories.has(categoryId);
    const colors = getCategoryColors(colorIndex);

    return (
      <div key={categoryId} className="mb-5">
        {/* Group Header - matches priority group header */}
        <div
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-t-md",
            colors.bgColor,
            "border border-b-0",
            colors.borderColor
          )}
        >
          <button
            type="button"
            onClick={() => toggleCategory(categoryId)}
            className="flex items-center gap-2 cursor-pointer"
          >
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
          </button>
          {/* Edit button - only show for real categories (not uncategorized) */}
          {category && onEditCategory && (
            <button
              type="button"
              onClick={(e) => handleEditClick(category, e)}
              className="p-1 rounded hover:bg-black/10 transition-colors"
              title="Edit category"
            >
              <Edit className="h-3.5 w-3.5 text-text-medium" />
            </button>
          )}
        </div>

        {/* Table - matches priority group table structure exactly */}
        {isExpanded && (
          <div className={cn("border rounded-b-md overflow-x-auto", colors.borderColor)}>
            <table className="w-full table-fixed min-w-[900px]">
              <thead className="bg-silver-very-light border-b border-silver-light">
                <tr>
                  {/* 1. Drag Handle */}
                  <th className="px-1 py-2 w-[24px]"></th>
                  {/* 2. Quick Glance (Dashboard Monitor) */}
                  <th className="px-1 py-2 text-center w-[24px]" title="Quick Glance - Show on Dashboard">
                    <Eye className="h-3 w-3 text-text-light mx-auto" />
                  </th>
                  {/* 3. Priority */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[50px]">Priority</th>
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
                  {/* 15. Notes */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[28px]">Notes</th>
                  {/* 16. Status */}
                  <th className="px-1 py-2 text-center text-[10px] font-semibold text-text-medium uppercase tracking-wide w-[45px]">Status</th>
                  {/* 17. Actions - last column, always visible */}
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

  // Check if editing a system category
  const isEditingSystemCategory = editingCategory
    ? (editingCategory.is_system || editingCategory.name.toLowerCase() === "celebrations")
    : false;

  return (
    <div>
      {/* Render each category */}
      {sortedCategories.map((category, index) => {
        const categoryEnvelopes = envelopesByCategory.get(category.id) || [];
        return renderCategoryGroup(
          category,
          categoryEnvelopes,
          index
        );
      })}

      {/* Uncategorized envelopes */}
      {(() => {
        const uncategorizedEnvelopes = envelopesByCategory.get("uncategorized") || [];
        if (uncategorizedEnvelopes.length === 0) return null;

        return renderCategoryGroup(
          null,
          uncategorizedEnvelopes,
          sortedCategories.length // Use next color in sequence
        );
      })()}

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name field - disabled for system categories */}
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isEditingSystemCategory}
                placeholder="Category name"
              />
              {isEditingSystemCategory && (
                <p className="text-xs text-text-medium">
                  System category names cannot be changed.
                </p>
              )}
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer"
                    style={{ backgroundColor: editColor }}
                  />
                </div>
                <Input
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="w-28 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-sage hover:bg-sage-dark">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
