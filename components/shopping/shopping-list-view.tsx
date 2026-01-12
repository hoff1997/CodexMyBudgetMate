"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Minus,
  MoreVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Store,
  DollarSign,
  Wallet,
  CheckCircle,
  Eye,
  EyeOff,
  ShoppingCart,
  FileText,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { searchGroceryItems, type DefaultGroceryItem } from "@/lib/data/default-grocery-items";
import { EditItemDialog } from "./edit-item-dialog";

// Common shopping category icons for emoji picker
const CATEGORY_ICONS = [
  "🥬", "🍎", "🥕", "🥦", "🍌", "🍇", "🥑", "🌽", // Produce
  "🥛", "🧀", "🥚", "🧈", // Dairy
  "🥩", "🍗", "🥓", "🍖", // Meat
  "🐟", "🦐", "🦞", "🦀", // Seafood
  "🥖", "🍞", "🥐", "🥯", // Bakery
  "🧊", "🍦", "🥧", // Frozen
  "🥤", "🧃", "☕", "🍺", // Beverages
  "🍿", "🍪", "🍫", "🧁", // Snacks
  "🥫", "🍝", "🍚", "🥜", // Pantry
  "🧹", "🧽", "🧴", "🧻", // Household/Cleaning
  "👶", "🍼", // Baby
  "🐾", "🦴", // Pet
  "📦", "🛒", "🏠", "💊", // Other
];

// Inline emoji picker for category editing
function CategoryEmojiPicker({
  currentIcon,
  onSelect,
}: {
  currentIcon: string;
  onSelect: (icon: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1 p-2 max-h-48 overflow-y-auto">
      {CATEGORY_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onSelect(icon)}
          className={cn(
            "w-8 h-8 text-lg flex items-center justify-center rounded hover:bg-sage-light transition-colors",
            currentIcon === icon && "bg-sage-light ring-2 ring-sage"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

export type ListType = "basic" | "grocery" | "categorised";

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
  list_type?: ListType;
  store: string | null;
  budget: number | null;
  items: ShoppingItem[];
  itemsByAisle: Record<string, ShoppingItem[]> | null;
  totalItems: number;
  checkedItems: number;
  estimatedTotal: number;
  linked_envelope_id?: string | null;
  linked_envelope_name?: string | null;
  is_completed?: boolean;
  show_on_hub?: boolean;
}

interface Supermarket {
  id: string;
  name: string;
}

interface ShoppingListViewProps {
  list: ShoppingList;
  defaultAisleOrder: string[];
  categories: Category[];
  supermarkets: Supermarket[];
  onAddItem: (listId: string, name: string) => Promise<void>;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<ShoppingItem>) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onLinkEnvelope?: () => void;
  onCompleteList?: () => void;
  onToggleHubVisibility?: (listId: string, showOnHub: boolean) => Promise<void>;
  onSaveAsTemplate?: (listId: string, listName: string, listIcon: string) => Promise<void>;
  onEditCategories?: () => void;
  onUpdateCategory?: (categoryId: string, updates: { name?: string; icon?: string }) => Promise<void>;
}

export function ShoppingListView({
  list,
  defaultAisleOrder,
  categories,
  supermarkets,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onDeleteList,
  onLinkEnvelope,
  onCompleteList,
  onToggleHubVisibility,
  onSaveAsTemplate,
  onEditCategories,
  onUpdateCategory,
}: ShoppingListViewProps) {
  // Build a map of category_id -> category name for quick lookups
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showCheckedItems, setShowCheckedItems] = useState(false);

  // Collapsed categories state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Shopping mode / supermarket selector state
  const [shopPopoverOpen, setShopPopoverOpen] = useState(false);

  // Per-list sort state
  const [sortByCategory, setSortByCategory] = useState(list.list_type === "grocery");
  const [selectedSupermarket, setSelectedSupermarket] = useState<string | null>(null);
  const [aisleOrder, setAisleOrder] = useState<string[]>(defaultAisleOrder);

  // Inline editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Category header editing state
  const [editingCategoryHeader, setEditingCategoryHeader] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryIcon, setEditingCategoryIcon] = useState<string | null>(null);

  // Edit item dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  // Autocomplete state
  interface Suggestion {
    name: string;
    categoryId: string | null;
    aisleName: string | null;
    useCount: number;
    averagePrice?: number;
    source?: "history" | "default";
  }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced fetch for suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      // Fetch user's history suggestions from API
      const res = await fetch(`/api/shopping/suggestions?q=${encodeURIComponent(query)}`);
      let historySuggestions: Suggestion[] = [];
      if (res.ok) {
        const data = await res.json();
        historySuggestions = data.map((s: Suggestion) => ({ ...s, source: "history" }));
      }

      // For grocery lists, also search default grocery items
      let defaultSuggestions: Suggestion[] = [];
      if (list.list_type === "grocery") {
        const groceryMatches = searchGroceryItems(query);
        defaultSuggestions = groceryMatches.map((item: DefaultGroceryItem) => ({
          name: item.name,
          categoryId: null,
          aisleName: item.category,
          useCount: 0,
          averagePrice: item.averagePrice,
          source: "default" as const,
        }));
      }

      // Merge and dedupe by name (history takes priority)
      const historyNames = new Set(historySuggestions.map((s) => s.name.toLowerCase()));
      const filteredDefault = defaultSuggestions.filter(
        (s) => !historyNames.has(s.name.toLowerCase())
      );

      // History first, then defaults (limited to 10 total)
      const allSuggestions = [...historySuggestions, ...filteredDefault].slice(0, 10);

      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [list.list_type]);

  // Debounce effect for fetching suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newItemName.trim()) {
        fetchSuggestions(newItemName.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [newItemName, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsAdding(true);
    try {
      await onAddItem(list.id, suggestion.name);
      setNewItemName("");
      setSuggestions([]);
    } finally {
      setIsAdding(false);
      inputRef.current?.focus();
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    setIsAdding(true);
    setShowSuggestions(false);
    try {
      await onAddItem(list.id, newItemName.trim());
      setNewItemName("");
      setSuggestions([]);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAddItem();
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  const startEditing = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const openEditDialog = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleEditDialogSave = async (itemId: string, updates: Partial<ShoppingItem>) => {
    await onUpdateItem(itemId, updates);
  };

  const handleEditDialogCreate = async (data: { name: string; quantity: number; estimated_price: number | null; notes: string | null; aisle: string | null }) => {
    // For now, we just add the item with the name - the API will handle the rest
    // TODO: Extend API to support all fields on create
    await onAddItem(list.id, data.name);
  };

  // Inline quantity change with auto-save
  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await onUpdateItem(itemId, { quantity: newQuantity });
  };

  // Inline price editing with auto-save
  const startEditingPrice = (item: ShoppingItem) => {
    setEditingPriceId(item.id);
    setEditPrice(item.estimated_price?.toString() || "");
  };

  const savePrice = async (itemId: string) => {
    const price = editPrice ? parseFloat(editPrice) : null;
    await onUpdateItem(itemId, { estimated_price: price });
    setEditingPriceId(null);
    setEditPrice("");
  };

  // Inline category change
  const handleCategoryChange = async (itemId: string, newAisle: string) => {
    await onUpdateItem(itemId, { aisle: newAisle });
    setEditingCategoryId(null);
  };

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

  // Handle supermarket selection from shop popover
  const handleShopSupermarketSelect = (supermarketId: string | null) => {
    handleSupermarketChange(supermarketId);
    setShopPopoverOpen(false);
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

  // Handle supermarket change - fetch category order for that supermarket
  const handleSupermarketChange = useCallback(async (supermarketId: string | null) => {
    setSelectedSupermarket(supermarketId);

    if (!supermarketId || supermarketId === "default") {
      setAisleOrder(defaultAisleOrder);
      return;
    }

    try {
      const res = await fetch(`/api/shopping/categories?supermarket=${supermarketId}`);
      if (res.ok) {
        const orderedCategories = await res.json();
        setAisleOrder(orderedCategories.map((c: { name: string }) => c.name));
      }
    } catch (error) {
      console.error("Error fetching category order:", error);
    }
  }, [defaultAisleOrder]);

  const pendingItems = list.items.filter((i) => !i.checked);
  const checkedItems = list.items.filter((i) => i.checked);

  // Group pending items by category if sorting by category
  const groupedItems: Record<string, ShoppingItem[]> = {};
  if (sortByCategory) {
    pendingItems.forEach((item) => {
      // Use category_id to look up category name, fall back to aisle, then "Uncategorised"
      let categoryName = "Uncategorised";
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

  // Get category icon for display
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find((c) => c.name === categoryName);
    if (category?.icon) return category.icon;
    // Fallback icons based on common category names
    const fallbackIcons: Record<string, string> = {
      "Produce": "🥬",
      "Dairy": "🥛",
      "Meat": "🥩",
      "Seafood": "🐟",
      "Bakery": "🥖",
      "Frozen": "🧊",
      "Deli": "🧀",
      "Beverages": "🥤",
      "Snacks": "🍿",
      "Pantry": "🥫",
      "Household": "🧹",
      "Personal Care": "🧴",
      "Baby": "👶",
      "Pet": "🐾",
      "Uncategorised": "📦",
    };
    return fallbackIcons[categoryName] || "📦";
  };

  // Get category object by name
  const getCategoryByName = (categoryName: string): Category | undefined => {
    return categories.find((c) => c.name === categoryName);
  };

  // Handle category name edit
  const handleStartCategoryNameEdit = (categoryName: string) => {
    setEditingCategoryHeader(categoryName);
    setEditingCategoryName(categoryName);
  };

  const handleSaveCategoryName = async (categoryName: string) => {
    const category = getCategoryByName(categoryName);
    if (category && editingCategoryName.trim() && editingCategoryName !== categoryName) {
      await onUpdateCategory?.(category.id, { name: editingCategoryName.trim() });
    }
    setEditingCategoryHeader(null);
    setEditingCategoryName("");
  };

  const handleCancelCategoryNameEdit = () => {
    setEditingCategoryHeader(null);
    setEditingCategoryName("");
  };

  // Handle category icon change
  const handleCategoryIconChange = async (categoryName: string, newIcon: string) => {
    const category = getCategoryByName(categoryName);
    if (category) {
      await onUpdateCategory?.(category.id, { icon: newIcon });
    }
  };

  const renderItem = (item: ShoppingItem, showAisle = false) => (
    <div
      key={item.id}
      className={cn(
        "flex items-start gap-3 p-2 rounded-lg hover:bg-silver-light/50 group transition-all duration-200",
        item.checked && "opacity-50 bg-silver-light/30"
      )}
    >
      {/* Checkbox - clicking on checked items unchecks them */}
      <Checkbox
        checked={item.checked}
        onCheckedChange={(checked) => onToggleItem(item.id, checked as boolean)}
        className={cn(
          "mt-1 transition-colors cursor-pointer",
          item.checked && "data-[state=checked]:bg-sage data-[state=checked]:border-sage"
        )}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Item name - click to toggle check */}
        <div
          className={cn(
            "text-sm cursor-pointer transition-all duration-200",
            item.checked && "line-through text-text-medium decoration-sage decoration-2"
          )}
          onClick={() => onToggleItem(item.id, !item.checked)}
        >
          {item.name}
          {item.unit && (
            <span className="text-text-medium ml-1">({item.unit})</span>
          )}
        </div>

        {/* Notes display */}
        {item.notes && (
          <p className="text-xs text-text-medium mt-0.5 italic">
            {item.notes}
          </p>
        )}

        {/* Category badge - editable */}
        {showAisle && (
          <div className="mt-1">
            {editingCategoryId === item.id ? (
              <Select
                value={item.aisle || "Uncategorised"}
                onValueChange={(value) => handleCategoryChange(item.id, value)}
                onOpenChange={(open) => {
                  if (!open) setEditingCategoryId(null);
                }}
              >
                <SelectTrigger className="h-6 text-xs w-auto min-w-[100px] max-w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...defaultAisleOrder, ...aisleOrder, item.aisle || "Uncategorised"])].map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {getCategoryIcon(cat)} {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs cursor-pointer transition-colors",
                  !item.checked && "hover:bg-sage-very-light hover:border-sage-light"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.checked) setEditingCategoryId(item.id);
                }}
                title="Click to change category"
              >
                {getCategoryName(item) || "Uncategorised"}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Quantity controls */}
      {!item.checked && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-text-medium hover:text-sage-dark"
            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-text-medium hover:text-sage-dark"
            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Price - editable inline */}
      <div className="w-16 shrink-0">
        {editingPriceId === item.id ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            onBlur={() => savePrice(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") savePrice(item.id);
              if (e.key === "Escape") {
                setEditingPriceId(null);
                setEditPrice("");
              }
            }}
            autoFocus
            className="h-6 text-xs px-1 text-right"
            placeholder="0.00"
          />
        ) : (
          <div
            className={cn(
              "text-xs text-right cursor-pointer hover:text-sage-dark px-1 py-0.5 rounded",
              item.estimated_price ? "text-sage font-medium" : "text-text-light",
              !item.checked && "hover:bg-sage-very-light"
            )}
            onClick={() => !item.checked && startEditingPrice(item)}
            title="Click to edit price"
          >
            {item.estimated_price ? `$${item.estimated_price.toFixed(2)}` : "—"}
          </div>
        )}
      </div>

      {/* Actions menu */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-medium hover:text-sage-dark"
          onClick={() => openEditDialog(item)}
          title="Edit item details"
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-medium hover:text-red-500"
          onClick={() => onDeleteItem(item.id)}
          title="Delete item"
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
          <div className="flex items-center gap-1">
            {/* Shop button - opens supermarket selector popover */}
            {!list.is_completed && list.totalItems > list.checkedItems && supermarkets.length > 0 && (
              <Popover open={shopPopoverOpen} onOpenChange={setShopPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-1",
                      selectedSupermarket ? "text-sage" : "text-gold hover:text-gold-dark"
                    )}
                    title="Select supermarket for aisle ordering"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">
                      {selectedSupermarket
                        ? supermarkets.find((s) => s.id === selectedSupermarket)?.name || "Shop"
                        : "Shop"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <p className="text-xs text-text-medium font-medium px-2 py-1">
                      Select store for aisle order
                    </p>
                    <Button
                      variant={!selectedSupermarket ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => handleShopSupermarketSelect(null)}
                    >
                      <Store className="h-3 w-3 mr-2" />
                      Default order
                    </Button>
                    {supermarkets.map((s) => (
                      <Button
                        key={s.id}
                        variant={selectedSupermarket === s.id ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => handleShopSupermarketSelect(s.id)}
                      >
                        <Store className="h-3 w-3 mr-2" />
                        {s.name}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Link to Envelope button */}
            {onLinkEnvelope && !list.is_completed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLinkEnvelope}
                className={cn(
                  "gap-1",
                  list.linked_envelope_id ? "text-sage" : "text-text-medium"
                )}
                title={list.linked_envelope_name ? `Linked to ${list.linked_envelope_name}` : "Link to budget envelope"}
              >
                <Wallet className="h-4 w-4" />
                {list.linked_envelope_name && (
                  <span className="text-xs max-w-20 truncate hidden sm:inline">
                    {list.linked_envelope_name}
                  </span>
                )}
              </Button>
            )}

            {/* Complete shopping button */}
            {onCompleteList && !list.is_completed && list.checkedItems > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCompleteList}
                className="text-sage hover:text-sage-dark gap-1"
                title="Complete shopping"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Done</span>
              </Button>
            )}

            {list.is_completed && (
              <Badge variant="outline" className="text-xs bg-sage-very-light text-sage border-sage-light">
                Completed
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onLinkEnvelope && !list.is_completed && (
                  <DropdownMenuItem onClick={onLinkEnvelope}>
                    <Wallet className="h-4 w-4 mr-2" />
                    {list.linked_envelope_id ? "Change Envelope" : "Link to Envelope"}
                  </DropdownMenuItem>
                )}
                {onCompleteList && !list.is_completed && (
                  <DropdownMenuItem onClick={onCompleteList}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Shopping
                  </DropdownMenuItem>
                )}
                {onToggleHubVisibility && (
                  <DropdownMenuItem
                    onClick={() => onToggleHubVisibility(list.id, !(list.show_on_hub ?? true))}
                  >
                    {list.show_on_hub ?? true ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide from Hub
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show on Hub
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onSaveAsTemplate && list.totalItems > 0 && (
                  <DropdownMenuItem
                    onClick={() => onSaveAsTemplate(list.id, list.name, list.icon)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Save as Template
                  </DropdownMenuItem>
                )}
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
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {/* Per-list sort controls */}
          <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-silver-light">
            {/* Sort by category toggle */}
            <button
              type="button"
              onClick={() => setSortByCategory(!sortByCategory)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                sortByCategory
                  ? "bg-sage-very-light text-sage-dark"
                  : "text-text-medium hover:bg-silver-light"
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              Sort by category
            </button>

            {/* Supermarket selector - only for grocery lists */}
            {list.list_type === "grocery" && sortByCategory && supermarkets.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Store className="h-3 w-3 text-text-medium" />
                <Select
                  value={selectedSupermarket || "default"}
                  onValueChange={(value) => handleSupermarketChange(value === "default" ? null : value)}
                >
                  <SelectTrigger className="h-7 text-xs w-28 border-silver-light">
                    <SelectValue placeholder="Aisle order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    {supermarkets.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          </div>

          {/* Add new item with autocomplete */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="Add an item..."
                value={newItemName}
                onChange={(e) => {
                  setNewItemName(e.target.value);
                  setSelectedSuggestionIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                disabled={isAdding}
                className="w-full"
              />
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-silver-light rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.name}-${index}`}
                      className={cn(
                        "flex items-center justify-between hover:bg-sage-very-light transition-colors group",
                        index === selectedSuggestionIndex && "bg-sage-very-light"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="flex-1 px-3 py-2 text-left text-sm flex items-center justify-between"
                      >
                        <span className="truncate">{suggestion.name}</span>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {suggestion.averagePrice && (
                            <span className="text-xs text-sage">
                              ~${suggestion.averagePrice.toFixed(2)}
                            </span>
                          )}
                          {suggestion.aisleName && (
                            <span className="text-xs text-text-medium">
                              {suggestion.aisleName}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSuggestions(false);
                          // Create a temporary item to edit
                          const tempItem: ShoppingItem = {
                            id: "new",
                            name: suggestion.name,
                            quantity: 1,
                            unit: null,
                            aisle: suggestion.aisleName,
                            category_id: suggestion.categoryId,
                            estimated_price: suggestion.averagePrice || null,
                            notes: null,
                            checked: false,
                            checked_at: null,
                            sort_order: 0,
                            photo_url: null,
                          };
                          setEditingItem(tempItem);
                          setEditDialogOpen(true);
                          setNewItemName("");
                        }}
                        className="px-2 py-2 text-text-medium hover:text-sage-dark opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit before adding"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Loading indicator */}
              {isLoadingSuggestions && newItemName.length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-text-medium" />
                </div>
              )}
            </div>
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
          {sortByCategory ? (
            // Grouped by aisle/category with light sage sticky headers
            <div className="space-y-3">
              {/* Render categories in aisleOrder first */}
              {aisleOrder
                .filter((aisle) => groupedItems[aisle]?.length > 0)
                .map((aisle) => {
                  const isCollapsed = collapsedCategories.has(aisle);
                  const itemCount = groupedItems[aisle].length;
                  const checkedCount = groupedItems[aisle].filter((i) => i.checked).length;
                  const category = getCategoryByName(aisle);
                  const isEditingName = editingCategoryHeader === aisle;

                  return (
                    <div key={aisle}>
                      <div className="w-full sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-sage-light border border-sage-light/50 rounded-lg">
                        {/* Icon with emoji picker */}
                        {category && onUpdateCategory ? (
                          <Popover
                            open={editingCategoryIcon === aisle}
                            onOpenChange={(open) => setEditingCategoryIcon(open ? aisle : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="text-lg hover:bg-white/40 rounded p-0.5 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getCategoryIcon(aisle)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CategoryEmojiPicker
                                currentIcon={getCategoryIcon(aisle)}
                                onSelect={(icon) => {
                                  handleCategoryIconChange(aisle, icon);
                                  setEditingCategoryIcon(null);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-lg">{getCategoryIcon(aisle)}</span>
                        )}

                        {/* Category name - editable inline */}
                        {isEditingName ? (
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onBlur={() => handleSaveCategoryName(aisle)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCategoryName(aisle);
                              if (e.key === "Escape") handleCancelCategoryNameEdit();
                            }}
                            autoFocus
                            className="h-7 text-sm font-medium bg-white/80 border-sage flex-1 max-w-[150px]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            onClick={() => toggleCategoryCollapse(aisle)}
                            className="font-medium text-sage-dark flex-1 text-left"
                          >
                            {aisle}
                          </button>
                        )}

                        <span className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-sage-dark bg-white/60 px-2 py-0.5 rounded-full">
                            {checkedCount}/{itemCount}
                          </span>

                          {/* Edit dropdown menu - always visible */}
                          {category && onUpdateCategory && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-white/40 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4 text-sage-dark" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStartCategoryNameEdit(aisle)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Use setTimeout to allow dropdown to close first
                                  setTimeout(() => setEditingCategoryIcon(aisle), 100);
                                }}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Icon
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleCategoryCollapse(aisle)}
                            className="p-1 hover:bg-white/40 rounded transition-colors"
                          >
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-sage-dark" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-sage-dark" />
                            )}
                          </button>
                        </span>
                      </div>
                      {!isCollapsed && (
                        <div className="space-y-1 pl-2 mt-2">
                          {groupedItems[aisle].map((item) => renderItem(item, false))}
                        </div>
                      )}
                    </div>
                  );
                })}
              {/* Render any categories with items that aren't in aisleOrder (auto-categorized items) */}
              {Object.keys(groupedItems)
                .filter((aisle) => !aisleOrder.includes(aisle) && groupedItems[aisle]?.length > 0)
                .map((aisle) => {
                  const isCollapsed = collapsedCategories.has(aisle);
                  const itemCount = groupedItems[aisle].length;
                  const checkedCount = groupedItems[aisle].filter((i) => i.checked).length;
                  const category = getCategoryByName(aisle);
                  const isEditingName = editingCategoryHeader === aisle;

                  return (
                    <div key={aisle}>
                      <div className="w-full sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-sage-light border border-sage-light/50 rounded-lg">
                        {/* Icon with emoji picker */}
                        {category && onUpdateCategory ? (
                          <Popover
                            open={editingCategoryIcon === aisle}
                            onOpenChange={(open) => setEditingCategoryIcon(open ? aisle : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="text-lg hover:bg-white/40 rounded p-0.5 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getCategoryIcon(aisle)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CategoryEmojiPicker
                                currentIcon={getCategoryIcon(aisle)}
                                onSelect={(icon) => {
                                  handleCategoryIconChange(aisle, icon);
                                  setEditingCategoryIcon(null);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-lg">{getCategoryIcon(aisle)}</span>
                        )}

                        {/* Category name - editable inline */}
                        {isEditingName ? (
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onBlur={() => handleSaveCategoryName(aisle)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCategoryName(aisle);
                              if (e.key === "Escape") handleCancelCategoryNameEdit();
                            }}
                            autoFocus
                            className="h-7 text-sm font-medium bg-white/80 border-sage flex-1 max-w-[150px]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            onClick={() => toggleCategoryCollapse(aisle)}
                            className="font-medium text-sage-dark flex-1 text-left"
                          >
                            {aisle}
                          </button>
                        )}

                        <span className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-sage-dark bg-white/60 px-2 py-0.5 rounded-full">
                            {checkedCount}/{itemCount}
                          </span>

                          {/* Edit dropdown menu - always visible */}
                          {category && onUpdateCategory && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-white/40 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4 text-sage-dark" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStartCategoryNameEdit(aisle)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Use setTimeout to allow dropdown to close first
                                  setTimeout(() => setEditingCategoryIcon(aisle), 100);
                                }}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Icon
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleCategoryCollapse(aisle)}
                            className="p-1 hover:bg-white/40 rounded transition-colors"
                          >
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-sage-dark" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-sage-dark" />
                            )}
                          </button>
                        </span>
                      </div>
                      {!isCollapsed && (
                        <div className="space-y-1 pl-2 mt-2">
                          {groupedItems[aisle].map((item) => renderItem(item, false))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            // Flat list
            <div className="space-y-1">
              {pendingItems.map((item) => renderItem(item, true))}
            </div>
          )}

          {/* Checked items toggle and list */}
          {checkedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-silver-light">
              <button
                type="button"
                onClick={() => setShowCheckedItems(!showCheckedItems)}
                className="flex items-center gap-2 text-xs text-text-medium mb-2 font-medium hover:text-sage-dark transition-colors w-full"
              >
                {showCheckedItems ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>In Cart ({checkedItems.length})</span>
              </button>
              {showCheckedItems && (
                <div className="space-y-1">
                  {checkedItems.map((item) => renderItem(item, !sortByCategory))}
                </div>
              )}
            </div>
          )}

          {pendingItems.length === 0 && checkedItems.length === 0 && (
            <div className="text-center py-6 text-text-medium">
              <span className="text-3xl mb-2 block">🛒</span>
              Your list is empty
            </div>
          )}

          {pendingItems.length === 0 && checkedItems.length > 0 && !showCheckedItems && (
            <div className="text-center py-6 text-text-medium">
              <span className="text-3xl mb-2 block">✅</span>
              All items obtained!
            </div>
          )}
        </CardContent>
      )}

      {/* Edit Item Dialog */}
      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={editingItem}
        categories={categories}
        onSave={handleEditDialogSave}
        onCreate={handleEditDialogCreate}
      />
    </Card>
  );
}
