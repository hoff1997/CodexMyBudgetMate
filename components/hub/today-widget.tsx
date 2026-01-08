"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarEventCard } from "@/components/calendar/calendar-event-card";
import {
  Calendar,
  ChefHat,
  CheckSquare,
  ShoppingCart,
  ListTodo,
  Check,
  Loader2,
  Circle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useToast } from "@/lib/hooks/use-toast";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  connection: {
    color_hex: string;
    owner_name: string;
  } | null;
}

interface Meal {
  id: string;
  meal_type: string;
  meal_name?: string;
  recipe?: {
    id: string;
    title: string;
    image_url?: string;
  } | null;
}

interface Chore {
  id: string;
  status: string;
  chore_template: {
    id: string;
    name: string;
    icon: string;
    points: number;
  } | null;
  child_profile: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}

interface TodayWidgetProps {
  data: {
    date: string;
    day_name: string;
    events: CalendarEvent[];
    meals: Meal[];
    chores: Chore[];
  };
  onChoreStatusChange?: (choreId: string, childId: string, newStatus: string) => Promise<void>;
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export function TodayWidget({ data, onChoreStatusChange }: TodayWidgetProps) {
  const { toast } = useToast();
  const [loadingChoreId, setLoadingChoreId] = useState<string | null>(null);
  const [localChores, setLocalChores] = useState(data.chores);

  const date = new Date(data.date);
  const dateStr = date.toLocaleDateString("en-NZ", {
    month: "long",
    day: "numeric",
  });

  // Sort meals by type
  const sortedMeals = [...data.meals].sort(
    (a, b) =>
      MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

  // Only consider empty if no events and no meals
  // Chores section always shows (with placeholder if empty)
  const noEventsOrMeals =
    data.events.length === 0 &&
    data.meals.length === 0;

  const handleToggleChore = async (chore: Chore) => {
    if (!chore.child_profile?.id || !onChoreStatusChange) return;

    const newStatus = chore.status === "done" ? "assigned" : "pending_approval";
    setLoadingChoreId(chore.id);

    try {
      await onChoreStatusChange(chore.id, chore.child_profile.id, newStatus);
      // Update local state optimistically
      setLocalChores(prev =>
        prev.map(c => c.id === chore.id ? { ...c, status: newStatus } : c)
      );
      toast({
        title: newStatus === "pending_approval" ? "Marked as done" : "Marked as not done",
        description: `${chore.chore_template?.name} for ${chore.child_profile.name}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update chore status",
        variant: "destructive",
      });
    } finally {
      setLoadingChoreId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-dark">{data.day_name}</h2>
        <p className="text-text-medium">{dateStr}</p>
      </div>

      {/* Meals - shown first */}
      {data.meals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-sage" />
              <h3 className="font-semibold text-text-dark">Today&apos;s Meals</h3>
            </div>
            <Link
              href="/life/meal-planner"
              className="text-sm text-sage hover:text-sage-dark"
            >
              View planner
            </Link>
          </div>
          <Card className="p-4">
            <div className="space-y-3">
              {sortedMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-text-medium capitalize font-medium">
                    {meal.meal_type}
                  </span>
                  <span className="font-medium text-text-dark">
                    {meal.recipe?.title || meal.meal_name || "Unplanned"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Calendar Events */}
      {data.events.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-sage" />
            <h3 className="font-semibold text-text-dark">Today&apos;s Events</h3>
            <span className="text-sm text-text-medium">
              ({data.events.length})
            </span>
          </div>
          <div className="space-y-2">
            {data.events.map((event) => (
              <CalendarEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State for events/meals - shown BEFORE chores */}
      {noEventsOrMeals && (
        <Card className="p-6 text-center border-dashed">
          <div className="text-3xl mb-2">☀️</div>
          <h4 className="font-medium text-text-dark mb-1">
            No events or meals planned
          </h4>
          <p className="text-sm text-text-medium">
            Connect your calendar or plan some meals to see them here.
          </p>
        </Card>
      )}

      {/* Chores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-sage" />
            <h3 className="font-semibold text-text-dark">Today&apos;s Chores</h3>
            {localChores.filter(c => c.status === "pending_approval").length > 0 && (
              <span className="text-xs bg-gold text-white px-2 py-0.5 rounded-full">
                {localChores.filter(c => c.status === "pending_approval").length} to approve
              </span>
            )}
          </div>
          <Link
            href="/kids/chores"
            className="text-sm text-sage hover:text-sage-dark"
          >
            {localChores.length > 0 ? "View all" : "Set up chores"}
          </Link>
        </div>
        {localChores.length > 0 ? (
          <Card className="p-4">
            <div className="space-y-2">
              {localChores.slice(0, 5).map((chore) => {
                const isDone = chore.status === "done" || chore.status === "pending_approval" || chore.status === "approved";
                const isLoading = loadingChoreId === chore.id;

                return (
                  <div
                    key={chore.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg transition-colors",
                      isDone ? "bg-sage-very-light" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {onChoreStatusChange ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleToggleChore(chore)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-sage" />
                          ) : isDone ? (
                            <Check className="h-4 w-4 text-sage" />
                          ) : (
                            <Circle className="h-4 w-4 text-text-light" />
                          )}
                        </Button>
                      ) : (
                        <span className="w-6 text-center">
                          {chore.chore_template?.icon || "📋"}
                        </span>
                      )}
                      <span className={cn(
                        "text-sm",
                        isDone ? "text-text-medium line-through" : "text-text-dark"
                      )}>
                        {chore.chore_template?.name || "Chore"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-medium">
                        {chore.child_profile?.name}
                      </span>
                      {isDone && (
                        <span className="text-xs text-sage font-medium">
                          {chore.status === "pending_approval" ? "Pending" : chore.status === "approved" ? "Approved" : "Done"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {localChores.length > 5 && (
                <p className="text-xs text-text-medium text-center pt-2">
                  +{localChores.length - 5} more
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center border-dashed">
            <div className="text-3xl mb-2">📋</div>
            <h4 className="font-medium text-text-dark mb-1">No chores assigned</h4>
            <p className="text-sm text-text-medium mb-3">
              Set up chores for your kids and track their progress here.
            </p>
            <Link href="/kids/chores">
              <Button variant="outline" size="sm" className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Set Up Chores
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

interface QuickLinksWidgetProps {
  shopping: Array<{
    id: string;
    name: string;
    icon: string;
    totalItems: number;
    checkedItems: number;
  }>;
  todos: Array<{
    id: string;
    name: string;
    icon: string;
    totalItems: number;
    completedItems: number;
  }>;
}

export function QuickLinksWidget({ shopping, todos }: QuickLinksWidgetProps) {
  return (
    <div className="space-y-4">
      {/* Shopping Lists */}
      {shopping.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gold" />
              <h4 className="font-medium text-text-dark text-sm">Shopping</h4>
            </div>
            <Link
              href="/life/shopping"
              className="text-xs text-sage hover:text-sage-dark"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {shopping.slice(0, 3).map((list) => (
              <Link
                key={list.id}
                href="/life/shopping"
                className="block p-2 rounded-lg bg-silver-very-light hover:bg-silver-light transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{list.icon}</span>
                    <span className="text-sm text-text-dark">{list.name}</span>
                  </div>
                  <span className="text-xs text-text-medium">
                    {list.checkedItems}/{list.totalItems}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* To-Do Lists */}
      {todos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue" />
              <h4 className="font-medium text-text-dark text-sm">To-Dos</h4>
            </div>
            <Link
              href="/life/todos"
              className="text-xs text-sage hover:text-sage-dark"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {todos.slice(0, 3).map((list) => (
              <Link
                key={list.id}
                href="/life/todos"
                className="block p-2 rounded-lg bg-silver-very-light hover:bg-silver-light transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{list.icon}</span>
                    <span className="text-sm text-text-dark">{list.name}</span>
                  </div>
                  <span className="text-xs text-text-medium">
                    {list.completedItems}/{list.totalItems}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {shopping.length === 0 && todos.length === 0 && (
        <div className="text-center py-4 text-text-medium text-sm">
          No active lists
        </div>
      )}
    </div>
  );
}
