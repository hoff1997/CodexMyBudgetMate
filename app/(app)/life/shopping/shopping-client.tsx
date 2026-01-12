"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  EditCategoriesDialog,
  ManageTemplatesDialog,
  ManageSupermarketsDialog,
} from "@/components/shopping";
import type { ListType } from "@/components/shopping/create-shopping-list-dialog";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { Plus, ShoppingCart, Store, Search, MoreVertical, Settings2, Printer, Share2, FileText } from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";

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
  list_type: ListType;
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
  show_on_hub: boolean;
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
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Edit categories dialog state
  const [showEditCategoriesDialog, setShowEditCategoriesDialog] = useState(false);

  // Template management state
  const [showManageTemplatesDialog, setShowManageTemplatesDialog] = useState(false);
  // Supermarket management state
  const [showManageSupermarketsDialog, setShowManageSupermarketsDialog] = useState(false);
  const [localSupermarkets, setLocalSupermarkets] = useState<Supermarket[]>(supermarkets);
  const { toast } = useToast();

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

  // Check if any grocery lists exist (for showing supermarket controls)
  const hasGroceryLists = useMemo(() => {
    return lists.some((list) => list.list_type === "grocery");
  }, [lists]);

  // Handle category updates from dialog
  const handleCategoriesChange = useCallback((updatedCategories: Category[]) => {
    setLocalCategories(updatedCategories);
  }, []);

  const refreshLists = useCallback(async () => {
    try {
      // Always include checked items - per-list show/hide is handled locally
      const res = await fetch("/api/shopping/lists?includeCompleted=true");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error("Error refreshing lists:", error);
    }
  }, []);

  const refreshSupermarkets = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping/supermarkets");
      if (res.ok) {
        const data = await res.json();
        setLocalSupermarkets(data);
      }
    } catch (error) {
      console.error("Error refreshing supermarkets:", error);
    }
  }, []);

  const handleCreateList = async (data: {
    name: string;
    icon: string;
    list_type: ListType;
    from_template_id?: string;
  }) => {
    try {
      const res = await fetch("/api/shopping/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newList = await res.json();
        // If created from template, refresh to get the items
        if (data.from_template_id) {
          await refreshLists();
        } else {
          setLists((prev) => [
            {
              ...newList,
              list_type: data.list_type,
              items: [],
              itemsByAisle: null,
              totalItems: 0,
              checkedItems: 0,
              estimatedTotal: 0,
              linked_envelope_id: null,
              linked_envelope_name: null,
              is_completed: false,
              show_on_hub: newList.show_on_hub ?? true,
            },
            ...prev,
          ]);
        }
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

  const handleToggleHubVisibility = async (listId: string, showOnHub: boolean) => {
    try {
      const res = await fetch(`/api/shopping/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_on_hub: showOnHub }),
      });

      if (res.ok) {
        setLists((prev) =>
          prev.map((list) =>
            list.id === listId ? { ...list, show_on_hub: showOnHub } : list
          )
        );
      }
    } catch (error) {
      console.error("Error toggling hub visibility:", error);
    }
  };

  // Category update handler (for inline editing from category headers)
  const handleUpdateCategory = async (categoryId: string, updates: { name?: string; icon?: string }) => {
    try {
      const res = await fetch(`/api/shopping/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updatedCategory = await res.json();
        setLocalCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? { ...cat, ...updatedCategory } : cat
          )
        );
      }
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  // Template handlers
  const handleSaveAsTemplate = async (listId: string, listName: string, listIcon: string) => {
    try {
      const res = await fetch("/api/shopping/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listName,
          icon: listIcon,
          from_list_id: listId,
        }),
      });

      if (res.ok) {
        toast({
          title: "Template saved",
          description: `"${listName}" saved as a template`,
        });
      } else {
        throw new Error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
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
        <div className="bg-white border border-silver-light rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-medium" />
              <Input
                placeholder="Search lists and items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasGroceryLists && (
                  <DropdownMenuItem onClick={() => setShowManageSupermarketsDialog(true)}>
                    <Store className="h-4 w-4 mr-2" />
                    Manage Supermarkets
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowManageTemplatesDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Templates
                </DropdownMenuItem>
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
                defaultAisleOrder={defaultAisleOrder}
                categories={localCategories}
                supermarkets={localSupermarkets}
                onAddItem={handleAddItem}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
                onDeleteList={handleDeleteList}
                onToggleHubVisibility={handleToggleHubVisibility}
                onSaveAsTemplate={handleSaveAsTemplate}
                onEditCategories={() => setShowEditCategoriesDialog(true)}
                onUpdateCategory={handleUpdateCategory}
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

      {/* Edit Categories Dialog */}
      <EditCategoriesDialog
        open={showEditCategoriesDialog}
        onOpenChange={setShowEditCategoriesDialog}
        categories={localCategories}
        onCategoriesChange={handleCategoriesChange}
      />

      {/* Manage Templates Dialog */}
      <ManageTemplatesDialog
        open={showManageTemplatesDialog}
        onOpenChange={setShowManageTemplatesDialog}
      />

      {/* Manage Supermarkets Dialog */}
      <ManageSupermarketsDialog
        open={showManageSupermarketsDialog}
        onOpenChange={setShowManageSupermarketsDialog}
        onSupermarketsChange={refreshSupermarkets}
      />
    </div>
  );
}
