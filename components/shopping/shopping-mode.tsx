"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { ArrowLeft, Check, ChevronDown, ChevronUp, ShoppingCart, Store } from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  checked: boolean;
  sortOrder: number;
}

interface Supermarket {
  id: string;
  name: string;
}

interface ShoppingModeProps {
  listId: string;
  listName: string;
  listIcon: string;
  initialItems: ShoppingItem[];
  categoryOrder: string[];
  categoryIcons: Record<string, string>;
  supermarkets?: Supermarket[];
  defaultCategoryOrder: string[];
}

export function ShoppingMode({
  listId,
  listName,
  listIcon,
  initialItems,
  categoryOrder: initialCategoryOrder,
  categoryIcons,
  supermarkets = [],
  defaultCategoryOrder,
}: ShoppingModeProps) {
  const router = useRouter();
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedSupermarket, setSelectedSupermarket] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(initialCategoryOrder);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Toggle category collapse
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle supermarket change - fetch category order for that supermarket
  const handleSupermarketChange = useCallback(async (supermarketId: string | null) => {
    setSelectedSupermarket(supermarketId);

    if (!supermarketId || supermarketId === "default") {
      setCategoryOrder(initialCategoryOrder);
      return;
    }

    try {
      const res = await fetch(`/api/shopping/categories?supermarket=${supermarketId}`);
      if (res.ok) {
        const orderedCategories = await res.json();
        setCategoryOrder(orderedCategories.map((c: { name: string }) => c.name));
      }
    } catch (error) {
      console.error("Error fetching category order:", error);
    }
  }, [initialCategoryOrder]);

  // Calculate progress
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Build full category list (all categories, for showing placeholders)
  const allCategories = useMemo(() => {
    // Combine categoryOrder with defaultCategoryOrder, removing duplicates
    const combined = [...categoryOrder];
    defaultCategoryOrder.forEach((cat) => {
      if (!combined.includes(cat)) {
        combined.push(cat);
      }
    });
    // Add "Uncategorised" at the end if not present
    if (!combined.includes("Uncategorised")) {
      combined.push("Uncategorised");
    }
    return combined;
  }, [categoryOrder, defaultCategoryOrder]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};

    // Initialize ALL groups (for placeholder display)
    allCategories.forEach((cat) => {
      groups[cat] = [];
    });

    // Sort items into groups
    items.forEach((item) => {
      const category = item.category || "Uncategorised";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    // Sort items within each group: unchecked first, then by sortOrder
    Object.keys(groups).forEach((cat) => {
      if (groups[cat].length > 0) {
        groups[cat].sort((a, b) => {
          if (a.checked !== b.checked) {
            return a.checked ? 1 : -1;
          }
          return a.sortOrder - b.sortOrder;
        });
      }
    });

    return groups;
  }, [items, allCategories]);

  // Find current category (first one with unchecked items)
  const currentCategory = useMemo(() => {
    for (const cat of allCategories) {
      if (groupedItems[cat]?.some((item) => !item.checked)) {
        return cat;
      }
    }
    return null;
  }, [allCategories, groupedItems]);

  // Find next category with unchecked items
  const nextCategory = useMemo(() => {
    if (!currentCategory) return null;
    const currentIndex = allCategories.indexOf(currentCategory);
    for (let i = currentIndex + 1; i < allCategories.length; i++) {
      if (groupedItems[allCategories[i]]?.some((item) => !item.checked)) {
        return allCategories[i];
      }
    }
    return null;
  }, [currentCategory, allCategories, groupedItems]);

  const handleToggleItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newChecked = !item.checked;
    setIsUpdating(itemId);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked: newChecked } : i))
    );

    try {
      const res = await fetch(`/api/shopping/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: newChecked }),
      });

      if (!res.ok) {
        // Revert on error
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, checked: !newChecked } : i))
        );
      }
    } catch (error) {
      console.error("Error toggling item:", error);
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, checked: !newChecked } : i))
      );
    } finally {
      setIsUpdating(null);
    }
  }, [items]);

  const handleBack = () => {
    router.push("/life/shopping");
  };

  const allDone = checkedItems === totalItems && totalItems > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-silver-light shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </Button>

          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="text-xl">{listIcon}</span>
            <h1 className="font-semibold text-text-dark truncate max-w-[180px] sm:max-w-none">
              {listName}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-medium">
            <span className="font-medium">
              {checkedItems}/{totalItems}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Supermarket Selector & Next Category */}
        <div className="px-4 pb-3 flex items-center justify-between gap-4">
          {/* Supermarket selector */}
          {supermarkets.length > 0 && (
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-text-medium" />
              <Select
                value={selectedSupermarket || "default"}
                onValueChange={(value) => handleSupermarketChange(value === "default" ? null : value)}
              >
                <SelectTrigger className="h-8 text-xs w-32 border-silver-light">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default order</SelectItem>
                  {supermarkets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Next Category Indicator */}
          {nextCategory && !allDone && (
            <div className="text-xs text-text-medium flex items-center gap-1 ml-auto">
              <span>Next:</span>
              <span className="font-medium">
                {categoryIcons[nextCategory] || "📦"} {nextCategory}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {allDone ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center mb-4">
              <Check className="h-10 w-10 text-sage-dark" />
            </div>
            <h2 className="text-2xl font-bold text-text-dark mb-2">
              All Done!
            </h2>
            <p className="text-text-medium text-center mb-6">
              You've checked off all {totalItems} items.
            </p>
            <Button onClick={handleBack} className="bg-sage hover:bg-sage-dark">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Back to Lists
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-4">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-text-dark mb-2">
              List is Empty
            </h2>
            <p className="text-text-medium text-center mb-6">
              Add some items to this list before shopping.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lists
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-silver-light">
            {allCategories.map((category) => {
              const categoryItems = groupedItems[category] || [];
              const hasItems = categoryItems.length > 0;
              const isCurrentCategory = category === currentCategory;
              const allCheckedInCategory = hasItems && categoryItems.every((i) => i.checked);
              const isCollapsed = collapsedCategories.has(category);

              return (
                <div key={category} className="relative">
                  {/* Sticky Category Header - light sage, collapsible */}
                  <button
                    onClick={() => hasItems && toggleCategoryCollapse(category)}
                    disabled={!hasItems}
                    className={cn(
                      "w-full sticky top-[120px] z-40 flex items-center gap-2 px-4 py-2.5",
                      "bg-sage-light border-b border-sage-light/50",
                      hasItems && "cursor-pointer",
                      !hasItems && "opacity-50 cursor-default"
                    )}
                  >
                    <span className="text-lg">
                      {categoryIcons[category] || "📦"}
                    </span>
                    <span className="font-medium text-sage-dark">
                      {category}
                    </span>
                    {hasItems ? (
                      <span className="ml-auto flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          allCheckedInCategory
                            ? "bg-sage text-white"
                            : isCurrentCategory
                              ? "bg-sage-dark/20 text-sage-dark font-medium"
                              : "bg-white/60 text-sage-dark"
                        )}>
                          {categoryItems.filter((i) => i.checked).length}/
                          {categoryItems.length}
                        </span>
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4 text-sage-dark" />
                        ) : (
                          <ChevronUp className="h-4 w-4 text-sage-dark" />
                        )}
                      </span>
                    ) : (
                      <span className="ml-auto text-xs text-sage-dark/60 italic">
                        No items
                      </span>
                    )}
                  </button>

                  {/* Items - only show if not collapsed */}
                  {hasItems && !isCollapsed && (
                    <div className="divide-y divide-silver-light/50">
                      {categoryItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleToggleItem(item.id)}
                          disabled={isUpdating === item.id}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-4 text-left transition-all duration-200",
                            "active:bg-silver-light focus:outline-none focus:bg-silver-light/50",
                            item.checked && "bg-silver-light/30"
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                              item.checked
                                ? "bg-sage border-sage"
                                : "border-silver-dark hover:border-sage"
                            )}
                          >
                            {item.checked && (
                              <Check className="h-5 w-5 text-white" />
                            )}
                          </div>

                          {/* Item Text */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                "text-base transition-all duration-200",
                                item.checked
                                  ? "line-through text-text-medium decoration-sage decoration-2"
                                  : "text-text-dark"
                              )}
                            >
                              {item.quantity > 1 && (
                                <span className="font-semibold mr-1">
                                  {item.quantity}x
                                </span>
                              )}
                              {item.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Action Bar (when shopping) */}
      {!allDone && items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-silver-light p-4 safe-area-inset-bottom">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="text-sm text-text-medium">
              <span className="font-semibold text-sage-dark">{checkedItems}</span>
              <span> of </span>
              <span className="font-semibold">{totalItems}</span>
              <span> items</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              Done Shopping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
