"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingListView,
  CreateShoppingListDialog,
  LinkEnvelopeDialog,
  CompleteListDialog,
  EditCategoriesDialog,
} from "@/components/shopping";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { Plus, ShoppingCart, ArrowUpDown, Store, Search, Filter, MoreVertical, Settings2, Printer, Share2, Trash2 } from "lucide-react";

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
  linked_envelope_id: string | null;
  linked_envelope_name: string | null;
  is_completed: boolean;
}

const HELP_CONTENT = {
  tips: [
    "Create separate lists for different shops or meal plans",
    "Add estimated prices to stay within budget",
    "Link your list to a budget envelope to track spending",
    "Check items off as you shop to stay organised",
  ],
  features: [
    "Auto-sort items by category or aisle",
    "Generate shopping lists from meal plans",
    "Link lists to budget envelopes for spending tracking",
    "Mark lists complete and record actual spending",
  ],
  faqs: [
    {
      question: "How do I link a list to my budget?",
      answer: "Click the wallet icon on any list to link it to a budget envelope. When you complete shopping, the amount is automatically deducted from that envelope.",
    },
    {
      question: "Can I generate lists from recipes?",
      answer: "Yes! In the Meal Planner, click 'Generate Shopping List' to create a list with all ingredients from your planned meals.",
    },
    {
      question: "What happens when I complete a list?",
      answer: "Enter your actual total spent. If linked to an envelope, the amount will be deducted from your budget automatically.",
    },
  ],
};

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
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Edit categories dialog state
  const [showEditCategoriesDialog, setShowEditCategoriesDialog] = useState(false);

  // Envelope linking state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedListForLink, setSelectedListForLink] = useState<ShoppingList | null>(null);

  // Complete list state
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedListForComplete, setSelectedListForComplete] = useState<ShoppingList | null>(null);

  // Filter lists by search query
  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    const query = searchQuery.toLowerCase();
    return lists.filter((list) => {
      // Match list name
      if (list.name.toLowerCase().includes(query)) return true;
      // Match any item in the list
      return list.items.some((item) => item.name.toLowerCase().includes(query));
    });
  }, [lists, searchQuery]);

  // Handle category updates from dialog
  const handleCategoriesChange = useCallback((updatedCategories: Category[]) => {
    setLocalCategories(updatedCategories);
    setCategoryOrder(updatedCategories.map((c) => c.name));
  }, []);

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

  // Envelope linking handlers
  const handleOpenLinkDialog = (list: ShoppingList) => {
    setSelectedListForLink(list);
    setShowLinkDialog(true);
  };

  const handleEnvelopeLinked = (envelopeId: string | null, envelopeName: string | null) => {
    if (selectedListForLink) {
      setLists((prev) =>
        prev.map((list) =>
          list.id === selectedListForLink.id
            ? { ...list, linked_envelope_id: envelopeId, linked_envelope_name: envelopeName }
            : list
        )
      );
    }
  };

  // Complete list handlers
  const handleOpenCompleteDialog = (list: ShoppingList) => {
    setSelectedListForComplete(list);
    setShowCompleteDialog(true);
  };

  const handleListCompleted = () => {
    if (selectedListForComplete) {
      setLists((prev) =>
        prev.map((list) =>
          list.id === selectedListForComplete.id
            ? { ...list, is_completed: true }
            : list
        )
      );
    }
    refreshLists();
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
          <div className="flex items-center gap-2">
            <RemyHelpButton title="Shopping Lists" content={HELP_CONTENT} />
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              New List
            </Button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white border border-silver-light rounded-lg p-3 mb-6 space-y-3">
          {/* Search Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-medium" />
              <Input
                placeholder="Search lists and items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Supermarket filter */}
            {supermarkets.length > 0 && (
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-text-medium" />
                <Select
                  value={selectedSupermarket || "default"}
                  onValueChange={(value) => handleSupermarketChange(value === "default" ? null : value)}
                >
                  <SelectTrigger className="w-36 h-8">
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

            {/* Sort by category toggle */}
            <div className="flex items-center gap-2 border-l border-silver-light pl-3">
              <Switch
                id="sort-by-aisle"
                checked={sortByAisle}
                onCheckedChange={setSortByAisle}
              />
              <Label htmlFor="sort-by-aisle" className="text-sm text-text-medium flex items-center gap-1 cursor-pointer">
                <ArrowUpDown className="h-3 w-3" />
                Sort by category
              </Label>
            </div>

            {/* Show checked toggle */}
            <div className="flex items-center gap-2 border-l border-silver-light pl-3">
              <Switch
                id="show-checked"
                checked={showChecked}
                onCheckedChange={(checked) => {
                  setShowChecked(checked);
                  refreshLists();
                }}
              />
              <Label htmlFor="show-checked" className="text-sm text-text-medium cursor-pointer">
                Show checked
              </Label>
            </div>

            {/* More options menu */}
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditCategoriesDialog(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Edit Categories
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share List (coming soon)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Printer className="h-4 w-4 mr-2" />
                    Print List (coming soon)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
        ) : filteredLists.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-text-dark mb-2">
              No results found
            </h2>
            <p className="text-text-medium mb-6">
              No lists or items match "{searchQuery}"
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLists.map((list) => (
              <ShoppingListView
                key={list.id}
                list={list}
                sortByAisle={sortByAisle}
                aisleOrder={categoryOrder}
                categories={localCategories}
                onAddItem={handleAddItem}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
                onDeleteList={handleDeleteList}
                onLinkEnvelope={() => handleOpenLinkDialog(list)}
                onCompleteList={() => handleOpenCompleteDialog(list)}
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

      {/* Link Envelope Dialog */}
      {selectedListForLink && (
        <LinkEnvelopeDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          listId={selectedListForLink.id}
          listName={selectedListForLink.name}
          currentEnvelopeId={selectedListForLink.linked_envelope_id}
          onLinked={handleEnvelopeLinked}
        />
      )}

      {/* Complete List Dialog */}
      {selectedListForComplete && (
        <CompleteListDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          listId={selectedListForComplete.id}
          listName={selectedListForComplete.name}
          estimatedTotal={selectedListForComplete.estimatedTotal}
          linkedEnvelopeId={selectedListForComplete.linked_envelope_id}
          linkedEnvelopeName={selectedListForComplete.linked_envelope_name}
          onCompleted={handleListCompleted}
        />
      )}

      {/* Edit Categories Dialog */}
      <EditCategoriesDialog
        open={showEditCategoriesDialog}
        onOpenChange={setShowEditCategoriesDialog}
        categories={localCategories}
        onCategoriesChange={handleCategoriesChange}
      />
    </div>
  );
}
