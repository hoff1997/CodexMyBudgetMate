"use client";

import { useState } from "react";
import { BookOpen, Palette, Check } from "lucide-react";
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
import { PRESET_CATEGORIES, COLOR_SWATCHES } from "@/lib/types/recipes";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = "preset" | "custom";

export function AddCategoryDialog({
  open,
  onOpenChange,
}: AddCategoryDialogProps) {
  const [mode, setMode] = useState<Mode>("preset");
  const [customName, setCustomName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
  const { categories, createCategory, isCreating } = useRecipeCategories();
  const { toast } = useToast();

  const existingSlugs = new Set(categories.map((c) => c.slug));

  const handlePresetSelect = async (
    preset: (typeof PRESET_CATEGORIES)[number]
  ) => {
    if (existingSlugs.has(preset.slug)) {
      toast({
        title: "Category exists",
        description: "You already have this category.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCategory({
        name: preset.name,
        slug: preset.slug,
        color: preset.color,
      });
      toast({
        title: "Category added",
        description: `${preset.name} has been added to your library.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add category",
        variant: "destructive",
      });
    }
  };

  const handleCustomCreate = async () => {
    if (!customName.trim()) return;

    try {
      await createCategory({
        name: customName.trim(),
        color: selectedColor,
      });
      toast({
        title: "Category added",
        description: `${customName} has been added to your library.`,
      });
      setCustomName("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add category",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipe Category</DialogTitle>
          <DialogDescription>
            Choose a preset category or create your own custom one
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-silver-very-light rounded-lg">
          <Button
            variant={mode === "preset" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("preset")}
            className={cn(
              "flex-1",
              mode === "preset" && "bg-white shadow-sm"
            )}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Preset Categories
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("custom")}
            className={cn(
              "flex-1",
              mode === "custom" && "bg-white shadow-sm"
            )}
          >
            <Palette className="w-4 h-4 mr-2" />
            Custom Category
          </Button>
        </div>

        {/* Preset mode */}
        {mode === "preset" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PRESET_CATEGORIES.map((preset) => {
              const exists = existingSlugs.has(preset.slug);
              return (
                <button
                  key={preset.slug}
                  onClick={() => !exists && handlePresetSelect(preset)}
                  disabled={exists || isCreating}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                    exists
                      ? "border-silver-light bg-silver-very-light opacity-50 cursor-not-allowed"
                      : "border-transparent hover:border-sage hover:scale-105 cursor-pointer",
                    isCreating && "opacity-50 cursor-wait"
                  )}
                >
                  <MiniBookCover name={preset.name} color={preset.color} />
                  <span className="text-sm font-medium text-text-dark">
                    {preset.name}
                  </span>
                  {exists && (
                    <span className="text-xs text-sage flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom mode */}
        {mode === "custom" && (
          <div className="space-y-6">
            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Slow Cooker, Quick Meals"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={30}
              />
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Book Color</Label>
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

            {/* Live preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex justify-center p-6 bg-silver-very-light rounded-lg">
                <MiniBookCover
                  name={customName || "Preview"}
                  color={selectedColor}
                />
              </div>
            </div>

            {/* Create button */}
            <Button
              onClick={handleCustomCreate}
              disabled={!customName.trim() || isCreating}
              className="w-full bg-sage hover:bg-sage-dark"
            >
              {isCreating ? "Adding..." : "Add Category"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
