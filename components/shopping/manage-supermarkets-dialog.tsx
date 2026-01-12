"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Store,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/cn";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Supermarket {
  id: string;
  name: string;
  categories: Category[];
}

interface ManageSupermarketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupermarketsChange?: () => void;
}

export function ManageSupermarketsDialog({
  open,
  onOpenChange,
  onSupermarketsChange,
}: ManageSupermarketsDialogProps) {
  const { toast } = useToast();
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");

  // Aisle order editing state
  const [editingAislesFor, setEditingAislesFor] = useState<string | null>(null);
  const [aisleCategories, setAisleCategories] = useState<Category[]>([]);
  const [isSavingAisles, setIsSavingAisles] = useState(false);

  // Add category state (in aisle view)
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Fetch supermarkets when dialog opens
  useEffect(() => {
    if (open) {
      fetchSupermarkets();
      fetchCategories();
    }
  }, [open]);

  const fetchSupermarkets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shopping/supermarkets");
      if (res.ok) {
        const data = await res.json();
        setSupermarkets(data);
      }
    } catch (error) {
      console.error("Error fetching supermarkets:", error);
      toast({
        title: "Error",
        description: "Failed to load supermarkets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/shopping/categories");
      if (res.ok) {
        const data = await res.json();
        setAllCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleAddSupermarket = async () => {
    if (!newName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/shopping/supermarkets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setSupermarkets((prev) => [...prev, created]);
        setNewName("");
        setIsAddingNew(false);
        toast({
          title: "Supermarket added",
          description: `"${newName.trim()}" has been added`,
        });
        onSupermarketsChange?.();
      } else {
        throw new Error("Failed to create supermarket");
      }
    } catch (error) {
      console.error("Error creating supermarket:", error);
      toast({
        title: "Error",
        description: "Failed to add supermarket",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (supermarket: Supermarket) => {
    setEditingId(supermarket.id);
    setEditName(supermarket.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/shopping/supermarkets/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSupermarkets((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, name: updated.name } : s))
        );
        toast({
          title: "Supermarket renamed",
          description: `Supermarket renamed to "${editName.trim()}"`,
        });
        onSupermarketsChange?.();
      } else {
        throw new Error("Failed to update supermarket");
      }
    } catch (error) {
      console.error("Error updating supermarket:", error);
      toast({
        title: "Error",
        description: "Failed to rename supermarket",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setEditingId(null);
      setEditName("");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/shopping/supermarkets/${deleteConfirmId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSupermarkets((prev) => prev.filter((s) => s.id !== deleteConfirmId));
        toast({
          title: "Supermarket deleted",
          description: "The supermarket has been deleted",
        });
        onSupermarketsChange?.();
      } else {
        throw new Error("Failed to delete supermarket");
      }
    } catch (error) {
      console.error("Error deleting supermarket:", error);
      toast({
        title: "Error",
        description: "Failed to delete supermarket",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleNewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSupermarket();
    } else if (e.key === "Escape") {
      setIsAddingNew(false);
      setNewName("");
    }
  };

  // Aisle editing functions
  const startEditingAisles = (supermarket: Supermarket) => {
    setEditingAislesFor(supermarket.id);
    // If supermarket has custom order, use it; otherwise use all categories
    if (supermarket.categories.length > 0) {
      setAisleCategories(supermarket.categories);
    } else {
      setAisleCategories(allCategories);
    }
  };

  const cancelEditingAisles = () => {
    setEditingAislesFor(null);
    setAisleCategories([]);
    setIsAddingCategory(false);
    setNewCategoryName("");
    setNewCategoryIcon("📦");
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsSavingCategory(true);
    try {
      const res = await fetch("/api/shopping/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          default_sort_order: aisleCategories.length,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        // Add to local aisle categories list
        setAisleCategories((prev) => [...prev, created]);
        // Also update allCategories
        setAllCategories((prev) => [...prev, created]);
        setNewCategoryName("");
        setNewCategoryIcon("📦");
        setIsAddingCategory(false);
        toast({
          title: "Category added",
          description: `"${created.name}" has been added`,
        });
      } else {
        throw new Error("Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    } else if (e.key === "Escape") {
      setIsAddingCategory(false);
      setNewCategoryName("");
      setNewCategoryIcon("📦");
    }
  };

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
      setAisleCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const saveAisleOrder = async () => {
    if (!editingAislesFor) return;

    setIsSavingAisles(true);
    try {
      const res = await fetch(`/api/shopping/supermarkets/${editingAislesFor}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_order: aisleCategories.map((c) => c.id),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSupermarkets((prev) =>
          prev.map((s) =>
            s.id === editingAislesFor
              ? { ...s, categories: updated.categories }
              : s
          )
        );
        toast({
          title: "Aisle order saved",
          description: "The category order has been updated for this supermarket",
        });
        cancelEditingAisles();
        onSupermarketsChange?.();
      } else {
        throw new Error("Failed to save aisle order");
      }
    } catch (error) {
      console.error("Error saving aisle order:", error);
      toast({
        title: "Error",
        description: "Failed to save aisle order",
        variant: "destructive",
      });
    } finally {
      setIsSavingAisles(false);
    }
  };

  // Find the supermarket being edited for aisles
  const editingAislesSupermarket = supermarkets.find(
    (s) => s.id === editingAislesFor
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingAislesFor ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 mr-1"
                    onClick={cancelEditingAisles}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Store className="h-5 w-5 text-sage" />
                  {editingAislesSupermarket?.name} - Aisle Order
                </>
              ) : (
                <>
                  <Store className="h-5 w-5 text-sage" />
                  Manage Supermarkets
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingAislesFor
                ? "Drag categories to set the order you'll find them in this supermarket."
                : "Add supermarkets and customise aisle orders for efficient shopping trips."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {editingAislesFor ? (
              // Aisle order editing view
              <div className="space-y-4">
                {/* Add Category Button/Form */}
                {isAddingCategory ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-sage bg-sage-very-light">
                    <button
                      type="button"
                      onClick={() => {
                        const icons = ["📦", "🥬", "🥛", "🥩", "🥖", "🧊", "🥤", "🍿", "🥫", "🧹", "👶", "🐾", "💊"];
                        const currentIndex = icons.indexOf(newCategoryIcon);
                        setNewCategoryIcon(icons[(currentIndex + 1) % icons.length]);
                      }}
                      className="text-xl p-1 hover:bg-white rounded"
                      title="Click to change icon"
                    >
                      {newCategoryIcon}
                    </button>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder="Category name (e.g., Produce, Dairy)"
                      className="flex-1 h-8"
                      autoFocus
                      disabled={isSavingCategory}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleAddCategory}
                      disabled={isSavingCategory || !newCategoryName.trim()}
                    >
                      {isSavingCategory ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-sage" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                        setNewCategoryIcon("📦");
                      }}
                      disabled={isSavingCategory}
                    >
                      <X className="h-4 w-4 text-text-medium" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsAddingCategory(true)}
                    variant="outline"
                    className="w-full border-dashed border-sage text-sage hover:bg-sage-very-light"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={aisleCategories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {aisleCategories.map((category, index) => (
                        <SortableAisleItem
                          key={category.id}
                          category={category}
                          index={index}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {aisleCategories.length === 0 && (
                  <div className="text-center py-6 text-text-medium">
                    <span className="text-3xl block mb-2">🏪</span>
                    No categories yet. Add some above to get started.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={cancelEditingAisles}
                    disabled={isSavingAisles}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveAisleOrder}
                    disabled={isSavingAisles}
                    className="bg-sage hover:bg-sage-dark"
                  >
                    {isSavingAisles ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save Order
                  </Button>
                </div>
              </div>
            ) : (
              // Supermarket list view
              <>
                {/* Add new supermarket */}
                {isAddingNew ? (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg border border-sage bg-sage-very-light">
                    <Store className="h-5 w-5 text-sage shrink-0" />
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={handleNewKeyDown}
                      placeholder="Supermarket name"
                      className="flex-1 h-8"
                      autoFocus
                      disabled={isSaving}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleAddSupermarket}
                      disabled={isSaving || !newName.trim()}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-sage" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewName("");
                      }}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 text-text-medium" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsAddingNew(true)}
                    variant="outline"
                    className="w-full mb-4 border-dashed border-sage text-sage hover:bg-sage-very-light"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supermarket
                  </Button>
                )}

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-sage" />
                  </div>
                ) : supermarkets.length === 0 ? (
                  <div className="text-center py-8">
                    <Store className="h-12 w-12 text-text-light mx-auto mb-3" />
                    <p className="text-text-medium">No supermarkets added yet</p>
                    <p className="text-sm text-text-light mt-1">
                      Add your local supermarkets to set custom aisle orders
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supermarkets.map((supermarket) => (
                      <div
                        key={supermarket.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-silver-light hover:bg-silver-very-light transition"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Store className="h-5 w-5 text-sage shrink-0" />
                          {editingId === supermarket.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-8"
                                autoFocus
                                disabled={isSaving}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={saveEdit}
                                disabled={isSaving || !editName.trim()}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-sage" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4 text-text-medium" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-text-dark truncate">
                                {supermarket.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">
                                  {supermarket.categories.length > 0
                                    ? `${supermarket.categories.length} aisles set`
                                    : "Default order"}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>

                        {editingId !== supermarket.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => startEditingAisles(supermarket)}
                              >
                                <GripVertical className="h-4 w-4 mr-2" />
                                Set Aisle Order
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => startEditing(supermarket)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  setDeleteConfirmId(supermarket.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supermarket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this supermarket and its custom aisle
              order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Sortable aisle item component
interface SortableAisleItemProps {
  category: Category;
  index: number;
}

function SortableAisleItem({ category, index }: SortableAisleItemProps) {
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
        "flex items-center gap-3 p-3 bg-white border border-silver-light rounded-lg",
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

      {/* Index number */}
      <span className="w-6 h-6 rounded-full bg-sage-very-light text-sage text-xs font-medium flex items-center justify-center shrink-0">
        {index + 1}
      </span>

      {/* Icon */}
      <span className="text-xl shrink-0">{category.icon || "📦"}</span>

      {/* Name */}
      <span className="text-sm font-medium text-text-dark flex-1">
        {category.name}
      </span>
    </div>
  );
}
