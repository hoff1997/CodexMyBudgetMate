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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Search, BookOpen, PenLine } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/cn";

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
  prep_time?: string;
  cook_time?: string;
}

interface AddMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  mealType: string;
  recipes: Recipe[];
  onAddMeal: (data: {
    date: string;
    meal_type: string;
    recipe_id?: string;
    meal_name?: string;
    notes?: string;
  }) => Promise<void>;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function AddMealDialog({
  open,
  onOpenChange,
  date,
  mealType,
  recipes,
  onAddMeal,
}: AddMealDialogProps) {
  const [activeTab, setActiveTab] = useState<"recipe" | "custom">("recipe");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter recipes by search
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "recipe" && selectedRecipeId) {
        await onAddMeal({
          date,
          meal_type: mealType,
          recipe_id: selectedRecipeId,
          notes: notes || undefined,
        });
      } else if (activeTab === "custom" && customMealName.trim()) {
        await onAddMeal({
          date,
          meal_type: mealType,
          meal_name: customMealName.trim(),
          notes: notes || undefined,
        });
      }
      resetForm();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedRecipeId(null);
    setCustomMealName("");
    setNotes("");
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const canSave =
    (activeTab === "recipe" && selectedRecipeId) ||
    (activeTab === "custom" && customMealName.trim());

  // Format date safely - guard against empty or invalid dates
  const formattedDate = (() => {
    if (!date) return "";
    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return "";
      return format(parsed, "EEEE, MMM d");
    } catch {
      return "";
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Add {MEAL_TYPE_LABELS[mealType] || "Meal"}
            {formattedDate && ` for ${formattedDate}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "recipe" | "custom")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recipe" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              From Recipes
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Custom Meal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipe" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-medium" />
              <Input
                placeholder="Search your recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Recipe list */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-8 text-text-medium">
                  {recipes.length === 0
                    ? "No recipes yet. Add some recipes first!"
                    : "No recipes match your search"}
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    className={cn(
                      "p-3 cursor-pointer transition hover:shadow-md",
                      selectedRecipeId === recipe.id &&
                        "ring-2 ring-sage bg-sage-very-light"
                    )}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-silver-light overflow-hidden shrink-0">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            🍽️
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-dark truncate">
                          {recipe.title}
                        </div>
                        {(recipe.prep_time || recipe.cook_time) && (
                          <div className="text-xs text-text-medium">
                            {recipe.prep_time && `Prep: ${recipe.prep_time}`}
                            {recipe.prep_time && recipe.cook_time && " • "}
                            {recipe.cook_time && `Cook: ${recipe.cook_time}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="meal-name">Meal Name</Label>
              <Input
                id="meal-name"
                placeholder="e.g., Takeaway pizza, Leftovers..."
                value={customMealName}
                onChange={(e) => setCustomMealName(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any notes for this meal..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="bg-sage hover:bg-sage-dark"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
