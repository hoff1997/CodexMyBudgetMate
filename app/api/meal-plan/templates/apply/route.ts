import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "date-fns";

// POST apply a template to a week
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { template_id, target_week_start } = body;

  if (!template_id || !target_week_start) {
    return NextResponse.json(
      { error: "template_id and target_week_start are required" },
      { status: 400 }
    );
  }

  // Get the template
  const { data: template, error: templateError } = await supabase
    .from("meal_plan_templates")
    .select("*")
    .eq("id", template_id)
    .eq("parent_user_id", user.id)
    .single();

  if (templateError || !template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  const weekStart = new Date(target_week_start);
  const templateData = template.template_data as {
    day_offset: number;
    meal_type: string;
    recipe_id?: string;
    meal_name?: string;
  }[];

  // Create meal entries for each item in the template
  const mealsToInsert = templateData.map((item) => {
    const mealDate = addDays(weekStart, item.day_offset);
    const dateStr = mealDate.toISOString().split("T")[0];

    return {
      parent_user_id: user.id,
      date: dateStr,
      meal_type: item.meal_type,
      recipe_id: item.recipe_id || null,
      meal_name: item.meal_name || null,
    };
  });

  if (mealsToInsert.length === 0) {
    return NextResponse.json({
      success: true,
      meals_created: 0,
      message: "Template is empty",
    });
  }

  // Use upsert to handle duplicates (same date + meal_type)
  // First, delete existing meals for the week
  const weekEnd = addDays(weekStart, 6);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  await supabase
    .from("meal_plans")
    .delete()
    .eq("parent_user_id", user.id)
    .gte("date", target_week_start)
    .lte("date", weekEndStr);

  // Insert new meals
  const { data: insertedMeals, error: insertError } = await supabase
    .from("meal_plans")
    .insert(mealsToInsert)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    meals_created: insertedMeals?.length || 0,
    meals: insertedMeals,
  });
}
