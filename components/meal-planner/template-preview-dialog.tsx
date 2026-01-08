"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";

interface TemplateItem {
  day_offset: number;
  meal_type: string;
  recipe_id?: string;
  meal_name?: string;
}

interface MealTemplate {
  id: string;
  name: string;
  cycle_type: "weekly" | "fortnightly" | "monthly";
  template_data: TemplateItem[];
  created_at: string;
}

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MealTemplate;
  recipes?: Recipe[];
  onApplied: () => void;
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  recipes = [],
  onApplied,
}: TemplatePreviewDialogProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Group template items by day
  const itemsByDay: Record<number, TemplateItem[]> = {};
  for (const item of template.template_data || []) {
    if (!itemsByDay[item.day_offset]) {
      itemsByDay[item.day_offset] = [];
    }
    itemsByDay[item.day_offset].push(item);
  }

  const getRecipeName = (recipeId?: string) => {
    if (!recipeId) return null;
    const recipe = recipes.find((r) => r.id === recipeId);
    return recipe?.title;
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const res = await fetch("/api/meal-plan/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          target_week_start: format(selectedWeekStart, "yyyy-MM-dd"),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to apply template");
      }

      const data = await res.json();
      toast.success(`Applied "${template.name}" to week of ${format(selectedWeekStart, "MMM d")}`);
      onApplied();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply template");
    } finally {
      setIsApplying(false);
    }
  };

  const goToPreviousWeek = () => setSelectedWeekStart(subWeeks(selectedWeekStart, 1));
  const goToNextWeek = () => setSelectedWeekStart(addWeeks(selectedWeekStart, 1));
  const goToThisWeek = () => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sage" />
            {template.name}
          </DialogTitle>
          <DialogDescription>
            Preview and apply this template to a specific week
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Week Selector */}
          <div className="bg-sage-very-light rounded-lg p-4">
            <Label className="text-sm font-medium">Apply to Week</Label>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousWeek}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="font-medium">
                  {format(selectedWeekStart, "MMM d")} - {format(addDays(selectedWeekStart, 6), "MMM d, yyyy")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextWeek}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center mt-2">
              <Button variant="link" size="sm" onClick={goToThisWeek}>
                Jump to this week
              </Button>
            </div>
          </div>

          {/* Template Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Template Preview</Label>

            {(template.template_data || []).length === 0 ? (
              <div className="text-center py-8 text-text-medium">
                This template is empty
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const dayItems = itemsByDay[dayIndex] || [];
                  const dayDate = addDays(selectedWeekStart, dayIndex);

                  return (
                    <div key={dayIndex} className="min-h-[100px] border rounded-lg overflow-hidden">
                      <div className="bg-silver-very-light px-2 py-1 border-b">
                        <div className="text-[10px] font-medium text-text-medium">
                          {DAY_NAMES[(dayIndex + 1) % 7]}
                        </div>
                        <div className="text-xs font-semibold text-text-dark">
                          {format(dayDate, "d")}
                        </div>
                      </div>
                      <div className="p-1 space-y-0.5">
                        {dayItems.length === 0 ? (
                          <div className="text-[10px] text-text-light text-center py-2">
                            -
                          </div>
                        ) : (
                          dayItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] bg-sage-very-light rounded px-1 py-0.5 truncate"
                              title={item.meal_name || getRecipeName(item.recipe_id) || "Meal"}
                            >
                              <span>{MEAL_TYPE_EMOJI[item.meal_type] || "🍽️"}</span>{" "}
                              {item.meal_name || getRecipeName(item.recipe_id) || "Meal"}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-silver-very-light rounded-lg p-3 text-sm">
            <span className="font-medium">{(template.template_data || []).length}</span> meals will be added
            {(template.template_data || []).length > 0 && (
              <span className="text-text-medium ml-1">
                (This will replace any existing meals for that week)
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplying || (template.template_data || []).length === 0}
            className="bg-sage hover:bg-sage-dark"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Apply to Week
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
