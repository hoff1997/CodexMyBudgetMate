"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Store,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/cn";

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

interface Category {
  id: string;
  name: string;
  icon: string | null;
  default_sort_order: number;
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

interface ShoppingListViewProps {
  list: ShoppingList;
  sortByAisle: boolean;
  aisleOrder: string[];
  categories: Category[];
  onAddItem: (listId: string, name: string) => Promise<void>;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<ShoppingItem>) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  showChecked: boolean;
}

export function ShoppingListView({
  list,
  sortByAisle,
  aisleOrder,
  categories,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onDeleteList,
  showChecked,
}: ShoppingListViewProps) {
  // Build a map of category_id -> category name for quick lookups
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    setIsAdding(true);
    try {
      await onAddItem(list.id, newItemName.trim());
      setNewItemName("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  const startEditing = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const saveEdit = async (itemId: string) => {
    if (editName.trim()) {
      await onUpdateItem(itemId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName("");
  };

  const progress =
    list.totalItems > 0
      ? Math.round((list.checkedItems / list.totalItems) * 100)
      : 0;

  const pendingItems = list.items.filter((i) => !i.checked);
  const checkedItems = list.items.filter((i) => i.checked);

  // Group pending items by category if sorting by aisle/category
  const groupedItems: Record<string, ShoppingItem[]> = {};
  if (sortByAisle) {
    pendingItems.forEach((item) => {
      // Use category_id to look up category name, fall back to aisle, then "Other"
      let categoryName = "Other";
      if (item.category_id && categoryMap.has(item.category_id)) {
        categoryName = categoryMap.get(item.category_id)!.name;
      } else if (item.aisle) {
        categoryName = item.aisle;
      }
      if (!groupedItems[categoryName]) {
        groupedItems[categoryName] = [];
      }
      groupedItems[categoryName].push(item);
    });
  }

  // Get category name for display
  const getCategoryName = (item: ShoppingItem): string | null => {
    if (item.category_id && categoryMap.has(item.category_id)) {
      return categoryMap.get(item.category_id)!.name;
    }
    return item.aisle;
  };

  const renderItem = (item: ShoppingItem, showAisle = false) => (
    <div
      key={item.id}
      className={cn(
        "flex items-start gap-3 p-2 rounded-lg hover:bg-silver-light/50 group",
        item.checked && "opacity-50"
      )}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={(checked) => onToggleItem(item.id, checked as boolean)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {editingId === item.id ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => saveEdit(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(item.id);
              if (e.key === "Escape") setEditingId(null);
            }}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <div
            className={cn(
              "text-sm cursor-pointer",
              item.checked && "line-through"
            )}
            onClick={() => !item.checked && startEditing(item)}
          >
            {item.quantity > 1 && (
              <span className="font-medium mr-1">{item.quantity}x</span>
            )}
            {item.name}
            {item.unit && (
              <span className="text-text-medium ml-1">({item.unit})</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          {showAisle && getCategoryName(item) && (
            <Badge variant="outline" className="text-xs">
              {getCategoryName(item)}
            </Badge>
          )}
          {item.estimated_price && (
            <Badge variant="secondary" className="text-xs">
              ${item.estimated_price.toFixed(2)}
            </Badge>
          )}
          {item.photo_url && (
            <Badge variant="outline" className="text-xs">
              📷
            </Badge>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {!item.checked && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => startEditing(item)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-500"
          onClick={() => onDeleteItem(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-2xl">{list.icon}</span>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {list.name}
                {list.store && (
                  <Badge variant="outline" className="text-xs font-normal">
                    <Store className="h-3 w-3 mr-1" />
                    {list.store}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-text-medium" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-medium" />
                )}
              </CardTitle>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-silver-light rounded-full overflow-hidden w-24">
                    <div
                      className="h-full bg-sage transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-medium">
                    {list.checkedItems}/{list.totalItems}
                  </span>
                </div>
                {list.estimatedTotal > 0 && (
                  <div className="flex items-center text-xs text-text-medium">
                    <DollarSign className="h-3 w-3" />
                    {list.estimatedTotal.toFixed(2)}
                    {list.budget && (
                      <span className="ml-1">/ ${list.budget}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDeleteList(list.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {/* Add new item */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add an item..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAdding}
              className="flex-1"
            />
            <Button
              onClick={handleAddItem}
              disabled={isAdding || !newItemName.trim()}
              size="sm"
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Items */}
          {sortByAisle ? (
            // Grouped by aisle
            <div className="space-y-4">
              {aisleOrder
                .filter((aisle) => groupedItems[aisle]?.length > 0)
                .map((aisle) => (
                  <div key={aisle}>
                    <div className="text-xs font-medium text-text-medium mb-2 uppercase tracking-wide">
                      {aisle}
                    </div>
                    <div className="space-y-1">
                      {groupedItems[aisle].map((item) => renderItem(item, false))}
                    </div>
                  </div>
                ))}
              {groupedItems["Other"]?.length > 0 &&
                !aisleOrder.includes("Other") && (
                  <div>
                    <div className="text-xs font-medium text-text-medium mb-2 uppercase tracking-wide">
                      Other
                    </div>
                    <div className="space-y-1">
                      {groupedItems["Other"].map((item) => renderItem(item, false))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            // Flat list
            <div className="space-y-1">
              {pendingItems.map((item) => renderItem(item, true))}
            </div>
          )}

          {/* Checked items */}
          {showChecked && checkedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-silver-light">
              <div className="text-xs text-text-medium mb-2 font-medium">
                In Cart ({checkedItems.length})
              </div>
              <div className="space-y-1">
                {checkedItems.map((item) => renderItem(item, !sortByAisle))}
              </div>
            </div>
          )}

          {pendingItems.length === 0 && !showChecked && (
            <div className="text-center py-6 text-text-medium">
              <span className="text-3xl mb-2 block">🛒</span>
              All done shopping!
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
