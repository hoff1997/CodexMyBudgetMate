"use client";

import { useState } from "react";
import { BookOpen, Palette, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MiniBookCover } from "./book-cover";
import { useRecipeCategories } from "@/lib/hooks/use-recipe-categories";
import { PRESET_CATEGORIES, COLOR_SWATCHES, PresetCategory } from "@/lib/types/recipes";
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
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { categories, createCategory, isCreating } = useRecipeCategories();
  const { toast } = useToast();

  const existingSlugs = new Set(categories.map((c) => c.slug));

  // Get count of available (not yet added) presets
  const availablePresetsCount = PRESET_CATEGORIES.filter(
    (p) => !existingSlugs.has(p.slug)
  ).length;

  // Toggle a preset selection
  const togglePresetSelection = (preset: PresetCategory) => {
    if (existingSlugs.has(preset.slug)) return; // Can't select already added

    setSelectedPresets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(preset.slug)) {
        newSet.delete(preset.slug);
      } else {
        newSet.add(preset.slug);
      }
      return newSet;
    });
  };

  // Select all available presets
  const selectAllAvailable = () => {
    const availableSlugs = PRESET_CATEGORIES
      .filter((p) => !existingSlugs.has(p.slug))
      .map((p) => p.slug);
    setSelectedPresets(new Set(availableSlugs));
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedPresets(new Set());
  };

  // Save all selected presets
  const handleSavePresets = async () => {
    if (selectedPresets.size === 0) return;

    setIsSaving(true);
    const presetsToAdd = PRESET_CATEGORIES.filter((p) => selectedPresets.has(p.slug));
    let successCount = 0;
    let failCount = 0;

    for (const preset of presetsToAdd) {
      try {
        await createCategory({
          name: preset.name,
          slug: preset.slug,
          color: preset.color,
        });
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to add ${preset.name}:`, error);
      }
    }

    setIsSaving(false);
    setSelectedPresets(new Set());

    if (successCount > 0) {
      toast({
        title: successCount === 1 ? "Category added" : "Categories added",
        description: `${successCount} ${successCount === 1 ? "category has" : "categories have"} been added to your library.`,
      });
    }
    if (failCount > 0) {
      toast({
        title: "Some categories failed",
        description: `${failCount} ${failCount === 1 ? "category" : "categories"} could not be added.`,
        variant: "destructive",
      });
    }

    if (failCount === 0) {
      onOpenChange(false);
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

  // Reset selections when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPresets(new Set());
      setCustomName("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipe Categories</DialogTitle>
          <DialogDescription>
            Select multiple preset categories or create your own custom one
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
          <div className="space-y-4">
            {/* Selection actions */}
            {availablePresetsCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-medium">
                  {selectedPresets.size > 0
                    ? `${selectedPresets.size} selected`
                    : "Click to select categories"}
                </span>
                <div className="flex gap-2">
                  {selectedPresets.size < availablePresetsCount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllAvailable}
                      className="text-sage hover:text-sage-dark"
                    >
                      Select All
                    </Button>
                  )}
                  {selectedPresets.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelections}
                      className="text-text-medium"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Categories grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PRESET_CATEGORIES.map((preset) => {
                const exists = existingSlugs.has(preset.slug);
                const isSelected = selectedPresets.has(preset.slug);
                return (
                  <button
                    key={preset.slug}
                    onClick={() => togglePresetSelection(preset)}
                    disabled={exists || isSaving}
                    className={cn(
                      "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      exists
                        ? "border-silver-light bg-silver-very-light opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "border-sage bg-sage-very-light"
                        : "border-transparent hover:border-sage-light cursor-pointer",
                      isSaving && "opacity-50 cursor-wait"
                    )}
                  >
                    {/* Checkbox indicator */}
                    {!exists && (
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={isSelected}
                          className={cn(
                            "h-5 w-5",
                            isSelected && "bg-sage border-sage text-white"
                          )}
                          onCheckedChange={() => togglePresetSelection(preset)}
                        />
                      </div>
                    )}
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

        {/* Footer with Save button for preset mode */}
        {mode === "preset" && selectedPresets.size > 0 && (
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePresets}
              disabled={isSaving || selectedPresets.size === 0}
              className="bg-sage hover:bg-sage-dark"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedPresets.size} ${selectedPresets.size === 1 ? "Category" : "Categories"}`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
