"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ShoppingCart, Check, Plus, List } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShoppingList {
  id: string;
  name: string;
  icon: string;
}

interface GenerateShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  mealsCount: number;
}

export function GenerateShoppingListDialog({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
  mealsCount,
}: GenerateShoppingListDialogProps) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newListName, setNewListName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [result, setResult] = useState<{
    success: boolean;
    itemsAdded: number;
    itemsSkipped: number;
    recipes: string[];
    listId: string;
  } | null>(null);

  // Fetch existing shopping lists
  useEffect(() => {
    if (open) {
      fetchLists();
      setNewListName(`Week of ${format(weekStart, "MMM d")}`);
      setResult(null);
    }
  }, [open, weekStart]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shopping/lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        if (data.length > 0) {
          setSelectedListId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        start_date: format(weekStart, "yyyy-MM-dd"),
        end_date: format(weekEnd, "yyyy-MM-dd"),
      };

      if (mode === "new") {
        body.create_new_list = true;
        body.new_list_name = newListName.trim() || `Week of ${format(weekStart, "MMM d")}`;
      } else {
        body.shopping_list_id = selectedListId;
      }

      const res = await fetch("/api/meal-plan/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate shopping list");
      }

      setResult({
        success: true,
        itemsAdded: data.items_added,
        itemsSkipped: data.items_skipped || 0,
        recipes: data.recipes_included || [],
        listId: data.list_id,
      });

      if (data.items_added > 0) {
        toast.success(`Added ${data.items_added} items to your shopping list`);
      } else {
        toast.info("All ingredients were already on your list");
      }
    } catch (error) {
      console.error("Failed to generate:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate shopping list");
    } finally {
      setGenerating(false);
    }
  };

  const handleViewList = () => {
    if (result?.listId) {
      window.location.href = `/life/shopping?list=${result.listId}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-sage" />
            Generate Shopping List
          </DialogTitle>
          <DialogDescription>
            Create a shopping list from your meal plan for{" "}
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}.
            {mealsCount > 0 && (
              <span className="block mt-1 font-medium text-text-dark">
                {mealsCount} meals planned this week
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Success state
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-sage-very-light flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-sage" />
            </div>
            <h3 className="text-lg font-semibold text-text-dark mb-2">
              Shopping List Ready!
            </h3>
            <p className="text-text-medium mb-4">
              {result.itemsAdded > 0 ? (
                <>
                  Added <span className="font-medium">{result.itemsAdded}</span> items
                  {result.itemsSkipped > 0 && (
                    <span className="text-text-light">
                      {" "}
                      ({result.itemsSkipped} already on list)
                    </span>
                  )}
                </>
              ) : (
                "All ingredients were already on your list"
              )}
            </p>
            {result.recipes.length > 0 && (
              <div className="bg-silver-very-light rounded-lg p-3 text-left mb-4">
                <p className="text-xs font-medium text-text-medium mb-1">
                  Recipes included:
                </p>
                <ul className="text-sm text-text-dark">
                  {result.recipes.slice(0, 5).map((recipe, i) => (
                    <li key={i} className="truncate">
                      {recipe}
                    </li>
                  ))}
                  {result.recipes.length > 5 && (
                    <li className="text-text-light">
                      +{result.recipes.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={handleViewList}
                className="bg-sage hover:bg-sage-dark"
              >
                <List className="h-4 w-4 mr-2" />
                View List
              </Button>
            </div>
          </div>
        ) : (
          // Form state
          <div className="space-y-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-sage" />
              </div>
            ) : (
              <>
                <RadioGroup
                  value={mode}
                  onValueChange={(value) => setMode(value as "new" | "existing")}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="new" id="new" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="new" className="font-medium cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create new shopping list
                        </div>
                      </Label>
                      {mode === "new" && (
                        <Input
                          className="mt-2"
                          placeholder="List name"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <RadioGroupItem
                      value="existing"
                      id="existing"
                      className="mt-1"
                      disabled={lists.length === 0}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="existing"
                        className={`font-medium cursor-pointer ${
                          lists.length === 0 ? "text-text-light" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          Add to existing list
                          {lists.length === 0 && (
                            <span className="text-xs text-text-light">
                              (no lists yet)
                            </span>
                          )}
                        </div>
                      </Label>
                      {mode === "existing" && lists.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {lists.map((list) => (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => setSelectedListId(list.id)}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                                selectedListId === list.id
                                  ? "border-sage bg-sage-very-light"
                                  : "border-silver-light hover:border-sage-light"
                              }`}
                            >
                              <span className="text-lg">{list.icon}</span>
                              <span className="text-sm font-medium truncate">
                                {list.name}
                              </span>
                              {selectedListId === list.id && (
                                <Check className="h-4 w-4 text-sage ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>

                <div className="bg-blue-light/30 rounded-lg p-3">
                  <p className="text-sm text-blue">
                    Ingredients will be consolidated and organized by category.
                    Duplicate items will be skipped.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={
                      generating ||
                      (mode === "new" && !newListName.trim()) ||
                      (mode === "existing" && !selectedListId)
                    }
                    className="bg-sage hover:bg-sage-dark"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Generate List
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
