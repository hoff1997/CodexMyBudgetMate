"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Plus, X, MoreVertical } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { cn } from "@/lib/cn";

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
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

type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack";

interface MealCalendarProps {
  meals: Meal[];
  currentWeekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  onAddMeal: (date: string, mealType: string) => void;
  onRemoveMeal: (mealId: string) => void;
  onMealClick: (meal: Meal) => void;
  visibleMealTypes?: Set<MealTypeKey>;
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snack", label: "Snack", emoji: "🍎" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MealCalendar({
  meals,
  currentWeekStart,
  onWeekChange,
  onAddMeal,
  onRemoveMeal,
  onMealClick,
  visibleMealTypes,
}: MealCalendarProps) {
  // Filter meal types based on visibility
  const filteredMealTypes = visibleMealTypes
    ? MEAL_TYPES.filter((mt) => visibleMealTypes.has(mt.key as MealTypeKey))
    : MEAL_TYPES;
  // Generate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );

  const getMealsForDay = (date: Date, mealType: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return meals.filter(
      (m) => m.date === dateStr && m.meal_type === mealType
    );
  };

  const isToday = (date: Date) => {
    return format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  };

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <h2 className="text-lg font-semibold text-text-dark">
          {format(currentWeekStart, "MMM d")} -{" "}
          {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs font-medium text-text-medium p-2"></div>
            {weekDates.map((date, i) => (
              <div
                key={i}
                className={cn(
                  "text-center p-2 rounded-lg",
                  isToday(date) && "bg-sage-very-light"
                )}
              >
                <div className="text-xs font-medium text-text-medium">
                  {DAYS[i]}
                </div>
                <div
                  className={cn(
                    "text-lg font-semibold",
                    isToday(date) ? "text-sage" : "text-text-dark"
                  )}
                >
                  {format(date, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {filteredMealTypes.map((mealType) => (
            <div key={mealType.key} className="grid grid-cols-8 gap-1 mb-2">
              {/* Meal type label */}
              <div className="flex items-center gap-2 p-2">
                <span>{mealType.emoji}</span>
                <span className="text-xs font-medium text-text-medium">
                  {mealType.label}
                </span>
              </div>

              {/* Day cells */}
              {weekDates.map((date, i) => {
                const dayMeals = getMealsForDay(date, mealType.key);
                const dateStr = format(date, "yyyy-MM-dd");

                return (
                  <Card
                    key={i}
                    className={cn(
                      "min-h-[80px] p-2",
                      isToday(date) && "border-sage"
                    )}
                  >
                    <CardContent className="p-0 space-y-1">
                      {dayMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="group relative bg-sage-very-light rounded p-1.5 text-xs cursor-pointer hover:bg-sage-light transition"
                          onClick={() => onMealClick(meal)}
                        >
                          <div className="font-medium text-text-dark truncate pr-5">
                            {meal.recipe?.title || meal.meal_name || "Meal"}
                          </div>
                          <button
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveMeal(meal.id);
                            }}
                          >
                            <X className="h-3 w-3 text-text-medium hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                      <button
                        className="w-full flex items-center justify-center gap-1 text-xs text-text-light hover:text-sage transition p-1 rounded hover:bg-silver-light"
                        onClick={() => onAddMeal(dateStr, mealType.key)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
