import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  if (!start_date || !end_date) {
    return NextResponse.json(
      { error: "start_date and end_date required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meal_plans")
    .select(
      `
      *,
      recipe:recipes(*)
    `
    )
    .eq("parent_user_id", user.id)
    .gte("date", start_date)
    .lte("date", end_date)
    .order("date")
    .order("meal_type");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform recipe from array to object
  const meals = (data || []).map((meal) => ({
    ...meal,
    recipe: Array.isArray(meal.recipe) ? meal.recipe[0] || null : meal.recipe,
  }));

  return NextResponse.json({ meals });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("meal_plans")
    .insert({
      parent_user_id: user.id,
      date: body.date,
      meal_type: body.meal_type,
      recipe_id: body.recipe_id || null,
      meal_name: body.meal_name || null,
      notes: body.notes || null,
    })
    .select(
      `
      *,
      recipe:recipes(*)
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Transform recipe from array to object
  const meal = {
    ...data,
    recipe: Array.isArray(data.recipe) ? data.recipe[0] || null : data.recipe,
  };

  return NextResponse.json({ meal });
}
