"use client";

import { useState, useMemo } from "react";
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
  DropdownMenuSeparator,
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
  Calendar,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Edit2,
  FolderPlus,
  Tag,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { format } from "date-fns";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_type: "parent" | "child" | "family" | null;
  category: string | null;
  notes: string | null;
  sort_order: number;
}

interface TodoList {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: TodoItem[];
  totalItems: number;
  completedItems: number;
  shared_with_children: string[];
}

interface ChildProfile {
  id: string;
  name: string;
}

interface TodoListViewProps {
  list: TodoList;
  childProfiles: ChildProfile[];
  onAddItem: (listId: string, text: string, category?: string) => Promise<void>;
  onToggleItem: (itemId: string, completed: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onResetList: (listId: string) => Promise<void>;
  showCompleted: boolean;
}

export function TodoListView({
  list,
  childProfiles,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onDeleteList,
  onResetList,
  showCompleted,
}: TodoListViewProps) {
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    list.items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [list.items]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, TodoItem[]> = {};
    const uncategorized: TodoItem[] = [];

    list.items.forEach((item) => {
      if (item.category) {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      } else {
        uncategorized.push(item);
      }
    });

    return { grouped, uncategorized };
  }, [list.items]);

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    setIsAdding(true);
    try {
      const category = selectedCategory || (newCategory.trim() || undefined);
      await onAddItem(list.id, newItemText.trim(), category);
      setNewItemText("");
      // Keep the category for next item in case user is adding multiple items to same category
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setSelectedCategory(newCategory.trim());
      setNewCategory("");
      setShowCategoryInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  const startEditing = (item: TodoItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = async (itemId: string) => {
    if (editText.trim()) {
      await onUpdateItem(itemId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText("");
  };

  const getChildName = (childId: string) => {
    return childProfiles.find((c) => c.id === childId)?.name || "Unknown";
  };

  const progress =
    list.totalItems > 0
      ? Math.round((list.completedItems / list.totalItems) * 100)
      : 0;

  const pendingItems = list.items.filter((i) => !i.completed);
  const completedItems = list.items.filter((i) => i.completed);

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
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-text-medium" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-medium" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-silver-light rounded-full overflow-hidden max-w-32">
                  <div
                    className="h-full bg-sage transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-text-medium">
                  {list.completedItems}/{list.totalItems}
                </span>
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
                onClick={() => onResetList(list.id)}
                disabled={list.completedItems === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAdding}
                className="flex-1"
              />
              <Button
                onClick={handleAddItem}
                disabled={isAdding || !newItemText.trim()}
                size="sm"
                className="bg-sage hover:bg-sage-dark"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Category selector */}
            <div className="flex items-center gap-2">
              {categories.length > 0 || showCategoryInput ? (
                <>
                  <Tag className="h-3.5 w-3.5 text-text-medium" />
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}

              {showCategoryInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="New category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory();
                      if (e.key === "Escape") {
                        setShowCategoryInput(false);
                        setNewCategory("");
                      }
                    }}
                    className="h-7 text-xs w-32"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim()}
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-text-medium"
                  onClick={() => setShowCategoryInput(true)}
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-1" />
                  Add Category
                </Button>
              )}
            </div>
          </div>

          {/* Pending items - grouped by category */}
          {categories.length > 0 ? (
            <div className="space-y-4">
              {/* Categorized items */}
              {Object.entries(itemsByCategory.grouped).map(([category, items]) => {
                const pendingInCat = items.filter((i) => !i.completed);
                if (pendingInCat.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-3.5 w-3.5 text-sage" />
                      <span className="text-sm font-medium text-text-dark">{category}</span>
                      <span className="text-xs text-text-light">({pendingInCat.length})</span>
                    </div>
                    <div className="space-y-1 pl-5 border-l-2 border-sage-light">
                      {pendingInCat.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          editingId={editingId}
                          editText={editText}
                          setEditText={setEditText}
                          startEditing={startEditing}
                          saveEdit={saveEdit}
                          setEditingId={setEditingId}
                          onToggleItem={onToggleItem}
                          onDeleteItem={onDeleteItem}
                          onUpdateItem={onUpdateItem}
                          getChildName={getChildName}
                          childProfiles={childProfiles}
                          categories={categories}
                          showCategoryBadge={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Uncategorized items */}
              {itemsByCategory.uncategorized.filter((i) => !i.completed).length > 0 && (
                <div>
                  {categories.length > 0 && (
                    <div className="text-xs text-text-medium mb-2 font-medium">
                      Uncategorized
                    </div>
                  )}
                  <div className="space-y-2">
                    {itemsByCategory.uncategorized
                      .filter((i) => !i.completed)
                      .map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          editingId={editingId}
                          editText={editText}
                          setEditText={setEditText}
                          startEditing={startEditing}
                          saveEdit={saveEdit}
                          setEditingId={setEditingId}
                          onToggleItem={onToggleItem}
                          onDeleteItem={onDeleteItem}
                          onUpdateItem={onUpdateItem}
                          getChildName={getChildName}
                          childProfiles={childProfiles}
                          categories={categories}
                          showCategoryBadge={false}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  editText={editText}
                  setEditText={setEditText}
                  startEditing={startEditing}
                  saveEdit={saveEdit}
                  setEditingId={setEditingId}
                  onToggleItem={onToggleItem}
                  onDeleteItem={onDeleteItem}
                  onUpdateItem={onUpdateItem}
                  getChildName={getChildName}
                  childProfiles={childProfiles}
                  categories={categories}
                  showCategoryBadge={true}
                />
              ))}
            </div>
          )}

          {/* Completed items */}
          {showCompleted && completedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-silver-light">
              <div className="text-xs text-text-medium mb-2 font-medium">
                Completed ({completedItems.length})
              </div>
              <div className="space-y-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg opacity-50"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={(checked) =>
                        onToggleItem(item.id, checked as boolean)
                      }
                    />
                    <span className="text-sm line-through flex-1">
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingItems.length === 0 && !showCompleted && (
            <div className="text-center py-6 text-text-medium">
              <span className="text-3xl mb-2 block">✨</span>
              All done!
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Extracted item row component for reuse
interface ItemRowProps {
  item: TodoItem;
  editingId: string | null;
  editText: string;
  setEditText: (text: string) => void;
  startEditing: (item: TodoItem) => void;
  saveEdit: (itemId: string) => Promise<void>;
  setEditingId: (id: string | null) => void;
  onToggleItem: (itemId: string, completed: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => Promise<void>;
  getChildName: (childId: string) => string;
  childProfiles: ChildProfile[];
  categories: string[];
  showCategoryBadge: boolean;
}

function ItemRow({
  item,
  editingId,
  editText,
  setEditText,
  startEditing,
  saveEdit,
  setEditingId,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  getChildName,
  childProfiles,
  categories,
  showCategoryBadge,
}: ItemRowProps) {
  // Helper to get assignment label
  const getAssignmentLabel = () => {
    if (!item.assigned_to) {
      if (item.assigned_to_type === "family") return "Everyone";
      return null;
    }
    if (item.assigned_to_type === "parent") return "Me";
    if (item.assigned_to_type === "child") return getChildName(item.assigned_to);
    return null;
  };

  const assignmentLabel = getAssignmentLabel();
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-silver-light/50 group">
      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => onToggleItem(item.id, checked as boolean)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {editingId === item.id ? (
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => saveEdit(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(item.id);
              if (e.key === "Escape") setEditingId(null);
            }}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <div className="text-sm cursor-pointer" onClick={() => startEditing(item)}>
            {item.text}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.due_date && (
            <Badge variant="outline" className="text-xs gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(item.due_date), "MMM d")}
            </Badge>
          )}
          {assignmentLabel && (
            <Badge variant="outline" className="text-xs gap-1">
              {item.assigned_to_type === "family" ? (
                <Users className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {assignmentLabel}
            </Badge>
          )}
          {showCategoryBadge && item.category && (
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
          )}
          {/* Category dropdown for changing category */}
          {categories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs text-text-light opacity-0 group-hover:opacity-100"
                >
                  <Tag className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => onUpdateItem(item.id, { category: null })}
                  className={!item.category ? "bg-sage-very-light" : ""}
                >
                  No category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categories.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => onUpdateItem(item.id, { category: cat })}
                    className={item.category === cat ? "bg-sage-very-light" : ""}
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* User assignment dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs text-text-light opacity-0 group-hover:opacity-100"
              >
                <UserPlus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onUpdateItem(item.id, { assigned_to: null, assigned_to_type: null })}
                className={!item.assigned_to && !item.assigned_to_type ? "bg-sage-very-light" : ""}
              >
                <span className="text-text-medium">Unassigned</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onUpdateItem(item.id, { assigned_to: null, assigned_to_type: "family" })}
                className={item.assigned_to_type === "family" ? "bg-sage-very-light" : ""}
              >
                <Users className="h-3.5 w-3.5 mr-2" />
                Everyone
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateItem(item.id, { assigned_to: "parent", assigned_to_type: "parent" })}
                className={item.assigned_to_type === "parent" ? "bg-sage-very-light" : ""}
              >
                <User className="h-3.5 w-3.5 mr-2" />
                Me
              </DropdownMenuItem>
              {childProfiles.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {childProfiles.map((child) => (
                    <DropdownMenuItem
                      key={child.id}
                      onClick={() => onUpdateItem(item.id, { assigned_to: child.id, assigned_to_type: "child" })}
                      className={item.assigned_to === child.id ? "bg-sage-very-light" : ""}
                    >
                      <User className="h-3.5 w-3.5 mr-2" />
                      {child.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => startEditing(item)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
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
}
