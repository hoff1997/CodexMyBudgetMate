"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Loader2, Tag, BookOpen, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecipeCategories } from "@/lib/hooks/use-recipe-categories";

interface RecipeBase {
  id: string;
  title: string;
  tags?: string[];
  notes?: string;
}

interface EditRecipeDialogProps<T extends RecipeBase> {
  recipe: T;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTags: string[];
  onUpdate: (recipe: T) => void;
}

export function EditRecipeDialog<T extends RecipeBase>({
  recipe,
  open,
  onOpenChange,
  availableTags,
  onUpdate,
}: EditRecipeDialogProps<T>) {
  const { categories, isLoading: categoriesLoading } = useRecipeCategories();
  const [selectedTags, setSelectedTags] = useState<string[]>(recipe.tags || []);
  const [newTag, setNewTag] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState(recipe.notes || "");
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load recipe's current categories when dialog opens
  useEffect(() => {
    if (open && recipe.id) {
      setSelectedTags(recipe.tags || []);
      setNotes(recipe.notes || "");
      loadRecipeCategories();
    }
  }, [open, recipe.id, recipe.tags, recipe.notes]);

  const loadRecipeCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/categories`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCategories(data.categoryIds || []);
      }
    } catch (error) {
      console.error("Failed to load recipe categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleToggleExistingTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update tags and notes on recipe
      const tagsRes = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: selectedTags, notes }),
      });

      if (!tagsRes.ok) {
        throw new Error("Failed to update recipe");
      }

      // Update categories
      const categoriesRes = await fetch(`/api/recipes/${recipe.id}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: selectedCategories }),
      });

      if (!categoriesRes.ok) {
        throw new Error("Failed to update categories");
      }

      // Call onUpdate with updated recipe
      onUpdate({ ...recipe, tags: selectedTags, notes } as T);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  // Combine available tags with current recipe tags for complete list
  const allAvailableTags = Array.from(
    new Set([...availableTags, ...(recipe.tags || [])])
  ).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-sage" />
            Edit Recipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipe Title (read-only display) */}
          <div>
            <p className="text-sm text-text-medium mb-1">Recipe</p>
            <p className="font-medium text-text-dark">{recipe.title}</p>
          </div>

          {/* Categories Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Categories
            </Label>
            {categoriesLoading || loadingCategories ? (
              <div className="flex items-center gap-2 text-sm text-text-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-text-medium">
                No categories yet. Create some in the bookshelf view!
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-silver-very-light"
                  >
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleToggleCategory(category.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <Label
                      htmlFor={`cat-${category.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>

            {/* Current tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-sage-very-light text-sage-dark pr-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-sage/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Existing tags to choose from */}
            {allAvailableTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-text-medium">
                  Or choose from existing:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {allAvailableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedTags.includes(tag)
                          ? "bg-sage text-white border-sage"
                          : "hover:bg-sage-very-light"
                      )}
                      onClick={() => handleToggleExistingTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </Label>
            <Textarea
              placeholder="Add any personal notes, tips, or modifications..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-sage hover:bg-sage-dark"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
