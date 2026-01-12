"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  default_sort_order: number;
}

interface EditCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

// Common shopping category icons
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

// Default icons for standard categories
const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  "Produce": "🥬",
  "Bakery": "🥖",
  "Deli": "🧀",
  "Meat": "🥩",
  "Seafood": "🐟",
  "Dairy": "🥛",
  "Frozen": "🧊",
  "Pantry": "🥫",
  "Snacks": "🍿",
  "Beverages": "🥤",
  "Health & Beauty": "🧴",
  "Cleaning": "🧹",
  "Household": "🧹",
  "Baby": "👶",
  "Pet": "🐾",
  "Uncategorised": "📦",
};

function EmojiPicker({
  currentIcon,
  onSelect
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

export function EditCategoriesDialog({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
}: EditCategoriesDialogProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalCategories(categories);
    }
  }, [open, categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update sort orders
        return reordered.map((item, index) => ({
          ...item,
          default_sort_order: index,
        }));
      });
    }
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch("/api/shopping/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          default_sort_order: localCategories.length,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setLocalCategories((prev) => [...prev, created]);
        setNewCategoryName("");
        setNewCategoryIcon("📦");
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const res = await fetch(`/api/shopping/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setLocalCategories((prev) =>
          prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
        );
      }
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Items using it will move to 'Uncategorised'.")) return;

    try {
      const res = await fetch(`/api/shopping/categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLocalCategories((prev) => prev.filter((cat) => cat.id !== id));
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/shopping/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: localCategories.map((cat, index) => ({
            id: cat.id,
            sort_order: index,
          })),
        }),
      });

      if (res.ok) {
        onCategoriesChange(localCategories);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving category order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      handleUpdateCategory(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Categories</span>
            <Button
              onClick={handleSaveOrder}
              disabled={isSaving}
              size="sm"
              className="bg-sage hover:bg-sage-dark"
            >
              <Check className="h-4 w-4 mr-1" />
              Done
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new category button/form */}
          {isAddingNew ? (
            <div className="flex items-center gap-2 p-2 bg-sage-very-light rounded-lg">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg">
                    {newCategoryIcon}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <EmojiPicker
                    currentIcon={newCategoryIcon}
                    onSelect={setNewCategoryIcon}
                  />
                </PopoverContent>
              </Popover>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                autoFocus
                className="flex-1 h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") setIsAddingNew(false);
                }}
              />
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                size="sm"
                className="h-8 bg-sage hover:bg-sage-dark"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsAddingNew(false)}
                variant="ghost"
                size="sm"
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddingNew(true)}
              variant="outline"
              className="w-full border-dashed border-sage text-sage hover:bg-sage-very-light"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}

          {/* Category list with drag and drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localCategories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {localCategories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    isEditing={editingId === category.id}
                    editName={editName}
                    onEditNameChange={setEditName}
                    onStartEdit={() => startEditing(category)}
                    onSaveEdit={() => saveEdit(category.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={() => handleDeleteCategory(category.id)}
                    onIconChange={(icon) => handleUpdateCategory(category.id, { icon })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {localCategories.length === 0 && (
            <div className="text-center py-8 text-text-medium">
              <span className="text-3xl block mb-2">📦</span>
              No categories yet. Add one to get started.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SortableCategoryItemProps {
  category: Category;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onIconChange: (icon: string) => void;
}

function SortableCategoryItem({
  category,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onIconChange,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-white border border-silver-light rounded-lg group",
        isDragging && "opacity-60 shadow-lg"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label={`Reorder ${category.name}`}
        {...attributes}
        {...listeners}
        className="rounded-md p-1 text-silver hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icon picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg hover:bg-sage-very-light">
            {category.icon || DEFAULT_CATEGORY_ICONS[category.name] || "📦"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <EmojiPicker
            currentIcon={category.icon || DEFAULT_CATEGORY_ICONS[category.name] || "📦"}
            onSelect={onIconChange}
          />
        </PopoverContent>
      </Popover>

      {/* Name */}
      <div className="flex-1">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <span
            className="text-sm cursor-pointer hover:text-sage-dark"
            onClick={onStartEdit}
          >
            {category.name}
          </span>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-7 w-7 p-0 text-text-medium hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
