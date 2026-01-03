import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Get today's calendar events
  const { data: calendarEventsRaw } = await supabase
    .from("calendar_events")
    .select(
      `
      *,
      connection:calendar_connections(*)
    `
    )
    .eq("parent_user_id", user.id)
    .gte("start_time", todayStr)
    .lt("start_time", tomorrowStr)
    .order("start_time");

  // Transform connection from array to object
  const calendarEvents = (calendarEventsRaw || []).map((event) => ({
    ...event,
    connection: Array.isArray(event.connection)
      ? event.connection[0] || null
      : event.connection,
  }));

  // Filter to visible calendars only and sanitize connection data
  const visibleEvents = calendarEvents
    .filter((event) => event.connection?.is_visible)
    .map((event) => ({
      ...event,
      connection: event.connection
        ? {
            color_hex: event.connection.color_hex,
            owner_name: event.connection.owner_name,
            calendar_name: event.connection.calendar_name,
          }
        : null,
    }));

  // Get today's meals
  const { data: mealsRaw } = await supabase
    .from("meal_plans")
    .select(
      `
      *,
      recipe:recipes(id, title, image_url)
    `
    )
    .eq("parent_user_id", user.id)
    .eq("date", todayStr)
    .order("meal_type");

  // Transform recipe from array to object
  const meals = (mealsRaw || []).map((meal) => ({
    ...meal,
    recipe: Array.isArray(meal.recipe) ? meal.recipe[0] || null : meal.recipe,
  }));

  // Get upcoming chores (next 7 days)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: choresRaw } = await supabase
    .from("chore_assignments")
    .select(
      `
      *,
      chore_template:chore_templates(id, name, icon, points),
      child_profile:child_profiles(id, name, avatar)
    `
    )
    .eq("parent_user_id", user.id)
    .gte("week_starting", todayStr)
    .lte("week_starting", weekFromNow)
    .in("status", ["pending", "done"])
    .order("week_starting");

  // Transform from arrays to objects
  const chores = (choresRaw || []).map((chore) => ({
    ...chore,
    chore_template: Array.isArray(chore.chore_template)
      ? chore.chore_template[0] || null
      : chore.chore_template,
    child_profile: Array.isArray(chore.child_profile)
      ? chore.child_profile[0] || null
      : chore.child_profile,
  }));

  // Get active shopping lists
  const { data: shoppingListsRaw } = await supabase
    .from("shopping_lists")
    .select(
      `
      id, name, icon, store, budget, is_active, created_at
    `
    )
    .eq("parent_user_id", user.id)
    .eq("is_active", true)
    .order("created_at");

  // For each shopping list, get item counts
  const shoppingLists = await Promise.all(
    (shoppingListsRaw || []).map(async (list) => {
      const { count: totalItems } = await supabase
        .from("shopping_items")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id);

      const { count: checkedItems } = await supabase
        .from("shopping_items")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id)
        .eq("checked", true);

      return {
        ...list,
        totalItems: totalItems || 0,
        checkedItems: checkedItems || 0,
      };
    })
  );

  // Get active to-do lists
  const { data: todoListsRaw } = await supabase
    .from("todo_lists")
    .select(
      `
      id, name, icon, is_template, created_at
    `
    )
    .eq("parent_user_id", user.id)
    .eq("is_template", false)
    .order("created_at");

  // For each todo list, get item counts
  const todoLists = await Promise.all(
    (todoListsRaw || []).map(async (list) => {
      const { count: totalItems } = await supabase
        .from("todo_items")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id);

      const { count: completedItems } = await supabase
        .from("todo_items")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id)
        .eq("completed", true);

      return {
        ...list,
        totalItems: totalItems || 0,
        completedItems: completedItems || 0,
      };
    })
  );

  return NextResponse.json({
    today: {
      date: todayStr,
      day_name: today.toLocaleDateString("en-NZ", { weekday: "long" }),
      events: visibleEvents,
      meals: meals,
      chores: chores.filter((c) => c.chore_template && c.child_profile),
    },
    shopping: shoppingLists,
    todos: todoLists,
  });
}
