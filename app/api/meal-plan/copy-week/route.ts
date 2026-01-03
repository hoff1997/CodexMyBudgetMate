import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { source_week_start, target_week_start } = body;

  if (!source_week_start || !target_week_start) {
    return NextResponse.json(
      { error: "source_week_start and target_week_start required" },
      { status: 400 }
    );
  }

  // Get source week (7 days)
  const sourceEnd = new Date(source_week_start);
  sourceEnd.setDate(sourceEnd.getDate() + 6);

  const { data: sourceMeals } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("parent_user_id", user.id)
    .gte("date", source_week_start)
    .lte("date", sourceEnd.toISOString().split("T")[0]);

  if (!sourceMeals || sourceMeals.length === 0) {
    return NextResponse.json(
      { error: "No meals found in source week" },
      { status: 404 }
    );
  }

  // Calculate date offset
  const sourceDate = new Date(source_week_start);
  const targetDate = new Date(target_week_start);
  const dayOffset = Math.floor(
    (targetDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Create new meals in target week
  const newMeals = sourceMeals.map((meal) => {
    const mealDate = new Date(meal.date);
    mealDate.setDate(mealDate.getDate() + dayOffset);

    return {
      parent_user_id: user.id,
      date: mealDate.toISOString().split("T")[0],
      meal_type: meal.meal_type,
      recipe_id: meal.recipe_id,
      meal_name: meal.meal_name,
      notes: meal.notes,
    };
  });

  const { data, error } = await supabase
    .from("meal_plans")
    .insert(newMeals)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ meals: data });
}
