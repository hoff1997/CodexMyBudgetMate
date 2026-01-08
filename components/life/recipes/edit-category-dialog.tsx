"use client";

import { useState, useEffect } from "react";
import { Palette, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MiniBookCover } from "./book-cover";
import { useRecipeCategories } from "@/lib/hooks/use-recipe-categories";
import { RecipeCategory, COLOR_SWATCHES } from "@/lib/types/recipes";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";

interface EditCategoryDialogProps {
  category: RecipeCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
}: EditCategoryDialogProps) {
  const [name, setName] = useState(category.name);
  const [selectedColor, setSelectedColor] = useState(category.color);
  const [coverImage, setCoverImage] = useState(category.cover_image || "");
  const { updateCategory, isUpdating } = useRecipeCategories();
  const { toast } = useToast();

  // Reset form when category changes
  useEffect(() => {
    if (open) {
      setName(category.name);
      setSelectedColor(category.color);
      setCoverImage(category.cover_image || "");
    }
  }, [open, category]);

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      await updateCategory(category.id, {
        name: name.trim(),
        color: selectedColor,
        cover_image: coverImage.trim() || null,
      });
      toast({
        title: "Category updated",
        description: `${name} has been updated.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update your recipe category settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="e.g., Slow Cooker, Quick Meals"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Book Color
            </Label>
            <div className="grid grid-cols-5 gap-3">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-full aspect-square rounded-lg transition-all",
                    "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-text-dark focus:ring-offset-2",
                    selectedColor === color &&
                      "ring-2 ring-text-dark ring-offset-2 scale-110"
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          {/* Cover image URL */}
          <div className="space-y-2">
            <Label htmlFor="cover-image" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Custom Cover Image (Optional)
            </Label>
            <Input
              id="cover-image"
              placeholder="https://example.com/image.jpg"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default image for this category type
            </p>
          </div>

          {/* Live preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex justify-center p-6 bg-silver-very-light rounded-lg">
              <MiniBookCover
                name={name || "Preview"}
                color={selectedColor}
                coverImage={coverImage || undefined}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || isUpdating}
              className="bg-sage hover:bg-sage-dark"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
