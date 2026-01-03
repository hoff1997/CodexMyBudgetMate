"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MealCalendar, AddMealDialog, FreezerMealsList } from "@/components/meal-planner";
import {
  Calendar,
  Copy,
  ShoppingCart,
  MoreVertical,
  Loader2,
  Save,
  FolderOpen,
  Eye,
  Trash2,
  Check,
} from "lucide-react";
import { startOfWeek, addDays, format, addWeeks, subWeeks } from "date-fns";

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
  prep_time?: string;
  cook_time?: string;
}

interface Meal {
  id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  recipe_id?: string;
  recipe?: Recipe;
  meal_name?: string;
  notes?: string;
}

interface MealTemplate {
  id: string;
  name: string;
  cycle_type: "weekly" | "fortnightly" | "monthly";
  template_data: {
    day_offset: number;
    meal_type: string;
    recipe_id?: string;
    meal_name?: string;
  }[];
  created_at: string;
}

type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: { key: MealTypeKey; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snack", label: "Snack", emoji: "🍎" },
];

interface MealPlannerClientProps {
  initialMeals: Meal[];
  recipes: Recipe[];
  initialWeekStart: string;
}

export function MealPlannerClient({
  initialMeals,
  recipes,
  initialWeekStart,
}: MealPlannerClientProps) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    new Date(initialWeekStart)
  );
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("");
  const [copyingWeek, setCopyingWeek] = useState(false);

  // Meal type filter - which meal types to show
  const [visibleMealTypes, setVisibleMealTypes] = useState<Set<MealTypeKey>>(
    new Set(["breakfast", "lunch", "dinner", "snack"])
  );

  // Template management
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  // Fetch meals for a new week
  const fetchMealsForWeek = useCallback(async (weekStart: Date) => {
    setLoading(true);
    const weekEnd = addDays(weekStart, 6);

    try {
      const res = await fetch(
        `/api/meal-plan?start_date=${format(
          weekStart,
          "yyyy-MM-dd"
        )}&end_date=${format(weekEnd, "yyyy-MM-dd")}`
      );

      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals || []);
      }
    } catch (error) {
      console.error("Failed to fetch meals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleWeekChange = (newWeekStart: Date) => {
    setCurrentWeekStart(newWeekStart);
    fetchMealsForWeek(newWeekStart);
  };

  const handleAddMeal = (date: string, mealType: string) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setAddDialogOpen(true);
  };

  const handleSaveMeal = async (data: {
    date: string;
    meal_type: string;
    recipe_id?: string;
    meal_name?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        setMeals((prev) => [...prev, result.meal]);
      }
    } catch (error) {
      console.error("Failed to add meal:", error);
    }
  };

  const handleRemoveMeal = async (mealId: string) => {
    try {
      const res = await fetch(`/api/meal-plan/${mealId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMeals((prev) => prev.filter((m) => m.id !== mealId));
      }
    } catch (error) {
      console.error("Failed to remove meal:", error);
    }
  };

  const handleMealClick = (meal: Meal) => {
    // Could open a detail/edit dialog
    console.log("Meal clicked:", meal);
  };

  const handleCopyToNextWeek = async () => {
    setCopyingWeek(true);
    try {
      const nextWeekStart = addWeeks(currentWeekStart, 1);

      const res = await fetch("/api/meal-plan/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_week_start: format(currentWeekStart, "yyyy-MM-dd"),
          target_week_start: format(nextWeekStart, "yyyy-MM-dd"),
        }),
      });

      if (res.ok) {
        // Navigate to next week to see copied meals
        handleWeekChange(nextWeekStart);
      }
    } catch (error) {
      console.error("Failed to copy week:", error);
    } finally {
      setCopyingWeek(false);
    }
  };

  const handleGenerateShoppingList = async () => {
    try {
      const weekEnd = addDays(currentWeekStart, 6);

      const res = await fetch("/api/meal-plan/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: format(currentWeekStart, "yyyy-MM-dd"),
          end_date: format(weekEnd, "yyyy-MM-dd"),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `Found ${data.count} ingredients:\n\n${data.ingredients
            .slice(0, 10)
            .join("\n")}${data.count > 10 ? "\n..." : ""}`
        );
      }
    } catch (error) {
      console.error("Failed to generate shopping list:", error);
    }
  };

  // Toggle meal type visibility
  const toggleMealType = (mealType: MealTypeKey) => {
    setVisibleMealTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mealType)) {
        // Don't allow deselecting all - keep at least one
        if (newSet.size > 1) {
          newSet.delete(mealType);
        }
      } else {
        newSet.add(mealType);
      }
      return newSet;
    });
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/meal-plan/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setTemplatesLoaded(true);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  // Load templates on first dropdown open
  useEffect(() => {
    if (!templatesLoaded) {
      fetchTemplates();
    }
  }, [templatesLoaded]);

  // Save current week as template
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    setSavingTemplate(true);
    try {
      // Convert current meals to template data
      const templateData = meals.map((meal) => {
        const mealDate = new Date(meal.date);
        const dayOffset = Math.round(
          (mealDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          day_offset: dayOffset,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          meal_name: meal.meal_name,
        };
      });

      const res = await fetch("/api/meal-plan/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          cycle_type: "weekly",
          template_data: templateData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates((prev) => [...prev, data.template]);
        setSaveTemplateOpen(false);
        setTemplateName("");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Load a template into current week
  const handleLoadTemplate = async (template: MealTemplate) => {
    setLoadingTemplate(true);
    try {
      const res = await fetch("/api/meal-plan/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          target_week_start: format(currentWeekStart, "yyyy-MM-dd"),
        }),
      });

      if (res.ok) {
        // Refresh meals for the current week
        await fetchMealsForWeek(currentWeekStart);
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/meal-plan/templates/${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center">
              <Calendar className="h-6 w-6 text-sage-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">Meal Planner</h1>
              <p className="text-text-medium">Plan your week&apos;s meals</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateShoppingList}
              disabled={meals.length === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Shopping List
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Meal Type Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Meals
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {MEAL_TYPES.map((mealType) => (
                      <DropdownMenuCheckboxItem
                        key={mealType.key}
                        checked={visibleMealTypes.has(mealType.key)}
                        onCheckedChange={() => toggleMealType(mealType.key)}
                      >
                        <span className="mr-2">{mealType.emoji}</span>
                        {mealType.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Copy to Next Week */}
                <DropdownMenuItem
                  onClick={handleCopyToNextWeek}
                  disabled={copyingWeek || meals.length === 0}
                >
                  {copyingWeek ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy to Next Week
                </DropdownMenuItem>

                {/* Save as Template */}
                <DropdownMenuItem
                  onClick={() => setSaveTemplateOpen(true)}
                  disabled={meals.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Week as Template
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Load Template */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={loadingTemplate}>
                    {loadingTemplate ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FolderOpen className="h-4 w-4 mr-2" />
                    )}
                    Load Template
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                    {templates.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-text-medium text-center">
                        No templates saved yet
                      </div>
                    ) : (
                      templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-silver-light rounded-sm"
                        >
                          <button
                            className="flex-1 text-left text-sm"
                            onClick={() => handleLoadTemplate(template)}
                          >
                            {template.name}
                            <span className="text-xs text-text-light ml-2">
                              ({template.template_data?.length || 0} meals)
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="p-1 hover:bg-silver rounded text-text-light hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-sage" />
          </div>
        ) : (
          <MealCalendar
            meals={meals}
            currentWeekStart={currentWeekStart}
            onWeekChange={handleWeekChange}
            onAddMeal={handleAddMeal}
            onRemoveMeal={handleRemoveMeal}
            onMealClick={handleMealClick}
            visibleMealTypes={visibleMealTypes}
          />
        )}

        {/* Freezer Meals Section */}
        <div className="mt-6">
          <FreezerMealsList />
        </div>

        {/* Quick stats */}
        {meals.length > 0 && (
          <div className="mt-6 p-4 bg-sage-very-light rounded-lg">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="font-medium text-text-dark">{meals.length}</span>
                <span className="text-text-medium ml-1">meals planned</span>
              </div>
              <div>
                <span className="font-medium text-text-dark">
                  {meals.filter((m) => m.recipe_id).length}
                </span>
                <span className="text-text-medium ml-1">from recipes</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add meal dialog */}
      <AddMealDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        date={selectedDate}
        mealType={selectedMealType}
        recipes={recipes}
        onAddMeal={handleSaveMeal}
      />

      {/* Save as Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Week as Template</DialogTitle>
            <DialogDescription>
              Save this week&apos;s meals as a template you can reuse later.
              Great for meal rotation like &quot;Week 1&quot;, &quot;Week 2&quot;,
              or special occasions like &quot;Birthday Week&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Week 1, Christmas Week, Light Meals..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && templateName.trim()) {
                    handleSaveAsTemplate();
                  }
                }}
              />
            </div>

            {/* Preview of what's being saved */}
            <div className="bg-silver-very-light rounded-lg p-3">
              <div className="text-xs font-medium text-text-medium mb-2">
                This template will include:
              </div>
              <div className="text-sm text-text-dark">
                <span className="font-medium">{meals.length}</span> meals
                {meals.length > 0 && (
                  <span className="text-text-medium ml-1">
                    ({meals.filter((m) => m.recipe_id).length} from recipes,{" "}
                    {meals.filter((m) => !m.recipe_id).length} custom)
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSaveTemplateOpen(false);
                  setTemplateName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || savingTemplate}
                className="bg-sage hover:bg-sage-dark"
              >
                {savingTemplate ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
