"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, CalendarIcon, Check } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/cn";
import Image from "next/image";
import { useToast } from "@/lib/hooks/use-toast";

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
}

interface AddRecipeToMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  onSuccess?: () => void;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

// Quick date options
const QUICK_DATES = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 2 days", days: 2 },
  { label: "In 3 days", days: 3 },
];

export function AddRecipeToMealPlanDialog({
  open,
  onOpenChange,
  recipe,
  onSuccess,
}: AddRecipeToMealPlanDialogProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [mealType, setMealType] = useState<string>("dinner");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Default to today
      setSelectedDate(new Date());
      setMealType("dinner");
      setNotes("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!recipe || !selectedDate) return;

    setSaving(true);
    try {
      const response = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          meal_type: mealType,
          recipe_id: recipe.id,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add to meal plan");
      }

      toast({
        title: "Added to meal plan",
        description: `${recipe.title} has been added to ${format(selectedDate, "EEEE, MMM d")} ${MEAL_TYPES.find(m => m.value === mealType)?.label || mealType}.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add recipe to meal plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDate = (days: number) => {
    setSelectedDate(addDays(new Date(), days));
  };

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Meal Plan</DialogTitle>
        </DialogHeader>

        {/* Recipe preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sage-very-light border border-sage-light">
          <div className="w-14 h-14 rounded-lg bg-silver-light overflow-hidden shrink-0">
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt=""
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                🍽️
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-text-dark truncate">
              {recipe.title}
            </div>
            <div className="text-xs text-text-medium">
              Select when to cook this recipe
            </div>
          </div>
        </div>

        {/* Quick date selection */}
        <div className="space-y-2">
          <Label>When?</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_DATES.map((option) => {
              const optionDate = addDays(new Date(), option.days);
              const isSelected = selectedDate &&
                format(selectedDate, "yyyy-MM-dd") === format(optionDate, "yyyy-MM-dd");

              return (
                <Button
                  key={option.days}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickDate(option.days)}
                  className={cn(
                    "flex-1 min-w-[80px]",
                    isSelected && "bg-sage hover:bg-sage-dark"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                  {option.label}
                </Button>
              );
            })}
          </div>

          {/* Calendar picker for specific date */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-2",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Meal type */}
        <div className="space-y-2">
          <Label htmlFor="meal-type">Meal</Label>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger id="meal-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedDate || saving}
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
