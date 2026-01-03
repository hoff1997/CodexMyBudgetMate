"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingListView,
  CreateShoppingListDialog,
} from "@/components/shopping";
import { Plus, ShoppingCart, ArrowUpDown, Store } from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  aisle: string | null;
  category_id: string | null;
  estimated_price: number | null;
  notes: string | null;
  checked: boolean;
  checked_at: string | null;
  sort_order: number;
  photo_url: string | null;
}

interface ShoppingList {
  id: string;
  name: string;
  icon: string;
  store: string | null;
  budget: number | null;
  items: ShoppingItem[];
  itemsByAisle: Record<string, ShoppingItem[]> | null;
  totalItems: number;
  checkedItems: number;
  estimatedTotal: number;
}

interface Supermarket {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  default_sort_order: number;
}

interface ShoppingClientProps {
  initialLists: ShoppingList[];
  supermarkets: Supermarket[];
  defaultAisleOrder: string[];
  categories: Category[];
}

export function ShoppingClient({
  initialLists,
  supermarkets,
  defaultAisleOrder,
  categories,
}: ShoppingClientProps) {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [showChecked, setShowChecked] = useState(false);
  const [sortByAisle, setSortByAisle] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSupermarket, setSelectedSupermarket] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(defaultAisleOrder);

  // Fetch category order when supermarket changes
  const handleSupermarketChange = useCallback(async (supermarketId: string | null) => {
    setSelectedSupermarket(supermarketId);

    if (!supermarketId || supermarketId === "default") {
      setCategoryOrder(defaultAisleOrder);
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
  }, [defaultAisleOrder]);

  const refreshLists = useCallback(async () => {
    try {
      const res = await fetch(`/api/shopping/lists?includeCompleted=${showChecked}`);
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error("Error refreshing lists:", error);
    }
  }, [showChecked]);

  const handleCreateList = async (data: {
    name: string;
    icon: string;
  }) => {
    try {
      const res = await fetch("/api/shopping/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newList = await res.json();
        setLists((prev) => [
          {
            ...newList,
            items: [],
            itemsByAisle: null,
            totalItems: 0,
            checkedItems: 0,
            estimatedTotal: 0,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  const handleAddItem = async (listId: string, name: string) => {
    try {
      const res = await fetch("/api/shopping/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: listId, name }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: [...list.items, newItem],
                  totalItems: list.totalItems + 1,
                }
              : list
          )
        );
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    try {
      const res = await fetch(`/api/shopping/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });

      if (res.ok) {
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
            checkedItems: list.items.filter((item) =>
              item.id === itemId ? checked : item.checked
            ).length,
          }))
        );
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/shopping/items/${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLists((prev) =>
          prev.map((list) => {
            const itemToDelete = list.items.find((i) => i.id === itemId);
            if (!itemToDelete) return list;
            return {
              ...list,
              items: list.items.filter((item) => item.id !== itemId),
              totalItems: list.totalItems - 1,
              checkedItems: itemToDelete.checked
                ? list.checkedItems - 1
                : list.checkedItems,
              estimatedTotal:
                list.estimatedTotal -
                (itemToDelete.estimated_price || 0) *
                  (itemToDelete.quantity || 1),
            };
          })
        );
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: Partial<ShoppingItem>
  ) => {
    try {
      const res = await fetch(`/api/shopping/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? updatedItem : item
            ),
          }))
        );
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;

    try {
      const res = await fetch(`/api/shopping/lists/${listId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLists((prev) => prev.filter((list) => list.id !== listId));
      }
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-light flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-gold-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">Shopping Lists</h1>
              <p className="text-text-medium">Smart lists sorted by aisle</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-sage hover:bg-sage-dark"
          >
            <Plus className="h-4 w-4 mr-2" />
            New List
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Supermarket filter */}
          {supermarkets.length > 0 && (
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-text-medium" />
              <Select
                value={selectedSupermarket || "default"}
                onValueChange={(value) => handleSupermarketChange(value === "default" ? null : value)}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Default order" />
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
          <div className="flex items-center gap-2">
            <Switch
              id="sort-by-aisle"
              checked={sortByAisle}
              onCheckedChange={setSortByAisle}
            />
            <Label htmlFor="sort-by-aisle" className="text-sm text-text-medium flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Sort by category
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-checked"
              checked={showChecked}
              onCheckedChange={(checked) => {
                setShowChecked(checked);
                refreshLists();
              }}
            />
            <Label htmlFor="show-checked" className="text-sm text-text-medium">
              Show checked items
            </Label>
          </div>
        </div>

        {/* Lists */}
        {lists.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-text-dark mb-2">
              No shopping lists yet
            </h2>
            <p className="text-text-medium mb-6">
              Create your first shopping list to get started
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => (
              <ShoppingListView
                key={list.id}
                list={list}
                sortByAisle={sortByAisle}
                aisleOrder={categoryOrder}
                categories={categories}
                onAddItem={handleAddItem}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
                onDeleteList={handleDeleteList}
                showChecked={showChecked}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateShoppingListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateList={handleCreateList}
      />
    </div>
  );
}
