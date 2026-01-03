"use client";

import { Card } from "@/components/ui/card";
import { CalendarEventCard } from "@/components/calendar/calendar-event-card";
import {
  Calendar,
  ChefHat,
  CheckSquare,
  ShoppingCart,
  ListTodo,
} from "lucide-react";
import Link from "next/link";

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
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export function TodayWidget({ data }: TodayWidgetProps) {
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

  const isEmpty =
    data.events.length === 0 &&
    data.meals.length === 0 &&
    data.chores.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-dark">{data.day_name}</h2>
        <p className="text-text-medium">{dateStr}</p>
      </div>

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

      {/* Meals */}
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

      {/* Chores */}
      {data.chores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-sage" />
              <h3 className="font-semibold text-text-dark">Chores This Week</h3>
            </div>
            <Link
              href="/kids/chores"
              className="text-sm text-sage hover:text-sage-dark"
            >
              View all
            </Link>
          </div>
          <Card className="p-4">
            <div className="space-y-2">
              {data.chores.slice(0, 5).map((chore) => (
                <div
                  key={chore.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>{chore.chore_template?.icon || "📋"}</span>
                    <span className="text-sm text-text-dark">
                      {chore.chore_template?.name || "Chore"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-medium">
                      {chore.child_profile?.name}
                    </span>
                    {chore.status === "done" && (
                      <span className="text-xs text-sage font-medium">Done</span>
                    )}
                  </div>
                </div>
              ))}
              {data.chores.length > 5 && (
                <p className="text-xs text-text-medium text-center pt-2">
                  +{data.chores.length - 5} more
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">☀️</div>
          <h3 className="font-semibold text-text-dark mb-2">
            Nothing scheduled for today
          </h3>
          <p className="text-text-medium">
            Enjoy your free time! Add events, meals, or chores to see them here.
          </p>
        </Card>
      )}
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
