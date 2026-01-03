import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkBetaAccess } from "@/lib/utils/beta-access";
import { MealPlannerClient } from "./meal-planner-client";
import { startOfWeek, addDays, format } from "date-fns";

export default async function MealPlannerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check beta access
  const betaAccess = await checkBetaAccess();
  if (!betaAccess.hasAccess) {
    redirect("/dashboard");
  }

  // Get current week dates
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 6);

  // Fetch meals for current week
  const { data: meals } = await supabase
    .from("meal_plans")
    .select(
      `
      *,
      recipe:recipes(id, title, image_url)
    `
    )
    .eq("parent_user_id", user.id)
    .gte("date", format(weekStart, "yyyy-MM-dd"))
    .lte("date", format(weekEnd, "yyyy-MM-dd"))
    .order("date")
    .order("meal_type");

  // Transform recipe from array to object
  const processedMeals = (meals || []).map((meal) => ({
    ...meal,
    recipe: Array.isArray(meal.recipe) ? meal.recipe[0] || null : meal.recipe,
  }));

  // Fetch all recipes for the add meal dialog
  const { data: recipesRaw } = await supabase
    .from("recipes")
    .select("id, title, image_url, prep_time_minutes, cook_time_minutes")
    .eq("parent_user_id", user.id)
    .order("title");

  // Transform to expected format
  const recipes = (recipesRaw || []).map((r) => ({
    id: r.id,
    title: r.title,
    image_url: r.image_url,
    prep_time: r.prep_time_minutes ? `${r.prep_time_minutes}m` : undefined,
    cook_time: r.cook_time_minutes ? `${r.cook_time_minutes}m` : undefined,
  }));

  return (
    <MealPlannerClient
      initialMeals={processedMeals}
      recipes={recipes || []}
      initialWeekStart={format(weekStart, "yyyy-MM-dd")}
    />
  );
}
