"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Snowflake,
  Plus,
  Check,
  Undo2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  UtensilsCrossed,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface FreezerMeal {
  id: string;
  name: string;
  description: string | null;
  servings: number | null;
  date_frozen: string | null;
  expiry_date: string | null;
  is_used: boolean;
  used_at: string | null;
  tags: string[];
  created_at: string;
}

export function FreezerMealsList() {
  const [meals, setMeals] = useState<FreezerMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showUsed, setShowUsed] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [newMeal, setNewMeal] = useState({
    name: "",
    description: "",
    servings: "",
    date_frozen: "",
    expiry_date: "",
  });

  // Fetch freezer meals
  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/freezer-meals?show_used=${showUsed}`);
      if (res.ok) {
        const data = await res.json();
        setMeals(data.freezerMeals || []);
      }
    } catch (error) {
      console.error("Failed to fetch freezer meals:", error);
    } finally {
      setLoading(false);
    }
  }, [showUsed]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // Add new meal
  const handleAddMeal = async () => {
    if (!newMeal.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/freezer-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMeal.name.trim(),
          description: newMeal.description.trim() || null,
          servings: newMeal.servings ? parseInt(newMeal.servings) : null,
          date_frozen: newMeal.date_frozen || null,
          expiry_date: newMeal.expiry_date || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMeals((prev) => [data.freezerMeal, ...prev]);
        setAddDialogOpen(false);
        setNewMeal({
          name: "",
          description: "",
          servings: "",
          date_frozen: "",
          expiry_date: "",
        });
        toast.success("Freezer meal added");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add meal");
      }
    } catch (error) {
      console.error("Failed to add freezer meal:", error);
      toast.error("Failed to add meal");
    } finally {
      setSaving(false);
    }
  };

  // Toggle used status
  const handleToggleUsed = async (meal: FreezerMeal) => {
    try {
      const res = await fetch(`/api/freezer-meals/${meal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_used: !meal.is_used }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!showUsed && data.freezerMeal.is_used) {
          // Remove from list if we're not showing used items
          setMeals((prev) => prev.filter((m) => m.id !== meal.id));
        } else {
          setMeals((prev) =>
            prev.map((m) => (m.id === meal.id ? data.freezerMeal : m))
          );
        }
        toast.success(meal.is_used ? "Meal restored" : "Meal marked as used");
      }
    } catch (error) {
      console.error("Failed to update freezer meal:", error);
      toast.error("Failed to update meal");
    }
  };

  // Delete meal
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this freezer meal?")) {
      return;
    }

    try {
      const res = await fetch(`/api/freezer-meals/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMeals((prev) => prev.filter((m) => m.id !== id));
        toast.success("Freezer meal deleted");
      }
    } catch (error) {
      console.error("Failed to delete freezer meal:", error);
      toast.error("Failed to delete meal");
    }
  };

  // Get expiry status
  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const daysUntil = differenceInDays(new Date(expiryDate), new Date());
    if (daysUntil < 0) return { label: "Expired", color: "text-red-500 bg-red-50" };
    if (daysUntil <= 7) return { label: `${daysUntil}d left`, color: "text-gold bg-gold-light" };
    if (daysUntil <= 30) return { label: `${Math.ceil(daysUntil / 7)}w left`, color: "text-blue bg-blue-light" };
    return null;
  };

  const unusedCount = meals.filter((m) => !m.is_used).length;
  const usedCount = meals.filter((m) => m.is_used).length;

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-sage-dark transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-medium" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-medium" />
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-light flex items-center justify-center">
              <Snowflake className="h-4 w-4 text-blue" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-text-dark text-sm">
                Freezer Meals
              </h3>
              <p className="text-xs text-text-medium">
                {unusedCount} available
                {usedCount > 0 && showUsed && `, ${usedCount} used`}
              </p>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUsed(!showUsed)}
            className={cn(
              "text-xs h-7",
              showUsed && "bg-silver-light"
            )}
          >
            {showUsed ? "Hide Used" : "Show Used"}
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="bg-sage hover:bg-sage-dark h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sage" />
            </div>
          ) : meals.length === 0 ? (
            <div className="text-center py-6 text-text-medium text-sm">
              <Snowflake className="h-8 w-8 mx-auto mb-2 text-silver" />
              <p>No freezer meals yet</p>
              <p className="text-xs mt-1">
                Add meals you&apos;ve prepared and frozen
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map((meal) => {
                const expiryStatus = getExpiryStatus(meal.expiry_date);

                return (
                  <div
                    key={meal.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-all",
                      meal.is_used
                        ? "bg-silver-very-light opacity-60"
                        : "bg-white hover:bg-sage-very-light border border-silver-light"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleUsed(meal)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                        meal.is_used
                          ? "bg-sage border-sage text-white"
                          : "border-silver hover:border-sage"
                      )}
                    >
                      {meal.is_used && <Check className="h-3 w-3" />}
                    </button>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-medium text-sm",
                            meal.is_used
                              ? "line-through text-text-light"
                              : "text-text-dark"
                          )}
                        >
                          {meal.name}
                        </span>
                        {meal.servings && (
                          <span className="text-xs text-text-light flex items-center gap-0.5">
                            <UtensilsCrossed className="h-3 w-3" />
                            {meal.servings}
                          </span>
                        )}
                        {expiryStatus && (
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded",
                              expiryStatus.color
                            )}
                          >
                            {expiryStatus.label}
                          </span>
                        )}
                      </div>
                      {meal.description && (
                        <p className="text-xs text-text-medium truncate">
                          {meal.description}
                        </p>
                      )}
                      {meal.date_frozen && (
                        <p className="text-xs text-text-light flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Frozen {format(new Date(meal.date_frozen), "d MMM")}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {meal.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUsed(meal)}
                          className="h-7 w-7 p-0"
                          title="Restore"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(meal.id)}
                        className="h-7 w-7 p-0 text-text-light hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-blue" />
              Add Freezer Meal
            </DialogTitle>
            <DialogDescription>
              Add a meal you&apos;ve prepared and frozen for later use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="meal-name">Meal Name *</Label>
              <Input
                id="meal-name"
                placeholder="e.g., Lasagna, Chicken Curry, Beef Stew..."
                value={newMeal.name}
                onChange={(e) =>
                  setNewMeal({ ...newMeal, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meal-description">Description (optional)</Label>
              <Textarea
                id="meal-description"
                placeholder="e.g., Vegetarian version, extra spicy, kid-friendly..."
                value={newMeal.description}
                onChange={(e) =>
                  setNewMeal({ ...newMeal, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meal-servings">Servings</Label>
                <Input
                  id="meal-servings"
                  type="number"
                  placeholder="4"
                  value={newMeal.servings}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, servings: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-frozen">Date Frozen</Label>
                <Input
                  id="date-frozen"
                  type="date"
                  value={newMeal.date_frozen}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, date_frozen: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry-date">Use By</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={newMeal.expiry_date}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, expiry_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setNewMeal({
                    name: "",
                    description: "",
                    servings: "",
                    date_frozen: "",
                    expiry_date: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMeal}
                disabled={!newMeal.name.trim() || saving}
                className="bg-sage hover:bg-sage-dark"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Snowflake className="h-4 w-4 mr-2" />
                )}
                Add to Freezer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
