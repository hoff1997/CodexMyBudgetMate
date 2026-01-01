"use client";

import { useState, useEffect } from "react";
import { Check, Plus, FolderPlus, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  is_system: boolean;
  display_order: number;
}

interface ChangeCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: {
    id: string;
    name: string;
    category_id?: string | null;
  } | null;
  categories: Category[];
  onCategoryChange: (envelopeId: string, categoryId: string | null) => Promise<void>;
  onCreateCategory: (name: string, icon?: string) => Promise<Category>;
}

export function ChangeCategoryDialog({
  open,
  onOpenChange,
  envelope,
  categories,
  onCategoryChange,
  onCreateCategory,
}: ChangeCategoryDialogProps) {
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShowCreateNew(false);
      setNewCategoryName("");
      setNewCategoryIcon("");
    }
  }, [open]);

  if (!envelope) return null;

  const handleCategorySelect = async (categoryId: string | null) => {
    if (categoryId === envelope.category_id) {
      onOpenChange(false);
      return;
    }

    setIsChanging(true);
    try {
      await onCategoryChange(envelope.id, categoryId);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to change category:", error);
    } finally {
      setIsChanging(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreating(true);
    try {
      const newCategory = await onCreateCategory(
        newCategoryName.trim(),
        newCategoryIcon || undefined
      );

      await onCategoryChange(envelope.id, newCategory.id);

      setNewCategoryName("");
      setNewCategoryIcon("");
      setShowCreateNew(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create category:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Category</DialogTitle>
          <p className="text-sm text-text-medium">
            Select a category for: <strong>{envelope.name}</strong>
          </p>
        </DialogHeader>

        {!showCreateNew ? (
          <>
            <div className="max-h-[300px] overflow-y-auto pr-2 -mr-2">
              <div className="space-y-1">
                {/* None option */}
                <button
                  onClick={() => handleCategorySelect(null)}
                  disabled={isChanging}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left",
                    "hover:bg-sage-very-light disabled:opacity-50",
                    !envelope.category_id && "bg-sage-very-light"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-medium text-text-dark">
                      No Category
                    </span>
                  </div>
                  {!envelope.category_id && (
                    <Check className="h-4 w-4 text-sage" />
                  )}
                </button>

                {/* Category list */}
                {categories
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      disabled={isChanging}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left",
                        "hover:bg-sage-very-light disabled:opacity-50",
                        envelope.category_id === category.id && "bg-sage-very-light"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {category.icon && (
                          <span className="text-lg">{category.icon}</span>
                        )}
                        <span className="text-sm font-medium text-text-dark">
                          {category.name}
                        </span>
                      </div>
                      {envelope.category_id === category.id && (
                        <Check className="h-4 w-4 text-sage" />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowCreateNew(true)}
              className="w-full border-sage text-sage hover:bg-sage-very-light"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Category
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Subscriptions, Pet Care"
                maxLength={100}
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="category-icon">Icon (optional)</Label>
              <Input
                id="category-icon"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="e.g., 📱 🐕 🌱"
                maxLength={4}
                className="mt-1"
              />
              <p className="text-xs text-text-light mt-1">
                Add an emoji to represent this category
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateNew(false);
                  setNewCategoryName("");
                  setNewCategoryIcon("");
                }}
                disabled={isCreating}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || isCreating}
                className="bg-sage hover:bg-sage-dark text-white"
              >
                {isCreating ? (
                  "Creating..."
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create & Apply
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
