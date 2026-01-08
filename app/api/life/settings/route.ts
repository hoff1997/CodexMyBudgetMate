import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/life/settings - Get user's life settings
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to get existing settings
  let { data: settings, error } = await supabase
    .from("life_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If no settings exist, create defaults
  if (!settings) {
    const { data: newSettings, error: insertError } = await supabase
      .from("life_settings")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (insertError) {
      // Table might not exist yet, return defaults
      settings = getDefaultSettings(user.id);
    } else {
      settings = newSettings;
    }
  }

  // Get supermarkets for dropdown
  const { data: supermarkets } = await supabase
    .from("supermarkets")
    .select("id, name, logo_url")
    .eq("user_id", user.id)
    .order("name");

  return NextResponse.json({
    settings,
    supermarkets: supermarkets || [],
  });
}

// PATCH /api/life/settings - Update user's life settings
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Allowed fields
  const allowedFields = [
    "default_supermarket_id",
    "default_shopping_categories",
    "auto_categorize_items",
    "show_price_estimates",
    "meal_plan_start_day",
    "default_servings",
    "show_nutrition_info",
    "celebration_reminder_weeks",
    "default_gift_budget",
    "link_gifts_to_envelope",
    "default_recipe_servings",
    "show_cooking_tips",
    "share_lists_with_partner",
    "share_recipes_with_partner",
    "share_calendar_with_partner",
    "notify_shopping_reminders",
    "notify_meal_plan_reminders",
    "notify_birthday_reminders",
    "notify_chore_completions",
  ];

  // Filter to only allowed fields
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Validate specific fields
  if (updateData.meal_plan_start_day && !["sunday", "monday"].includes(updateData.meal_plan_start_day as string)) {
    return NextResponse.json({ error: "Invalid meal plan start day" }, { status: 400 });
  }

  if (updateData.celebration_reminder_weeks !== undefined) {
    const weeks = updateData.celebration_reminder_weeks as number;
    if (weeks < 0 || weeks > 8) {
      return NextResponse.json({ error: "Celebration reminder weeks must be between 0 and 8" }, { status: 400 });
    }
  }

  updateData.updated_at = new Date().toISOString();

  // Check if settings exist
  const { data: existing } = await supabase
    .from("life_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { data: updated, error: updateError } = await supabase
      .from("life_settings")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ settings: updated });
  } else {
    // Create new with updates
    const { data: created, error: createError } = await supabase
      .from("life_settings")
      .insert({
        user_id: user.id,
        ...updateData,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({ settings: created });
  }
}

function getDefaultSettings(userId: string) {
  return {
    id: null,
    user_id: userId,
    default_supermarket_id: null,
    default_shopping_categories: [
      "Fruit & Veg",
      "Meat & Seafood",
      "Dairy",
      "Bakery",
      "Pantry",
      "Frozen",
      "Beverages",
      "Household",
      "Other",
    ],
    auto_categorize_items: true,
    show_price_estimates: true,
    meal_plan_start_day: "monday",
    default_servings: 4,
    show_nutrition_info: false,
    celebration_reminder_weeks: 2,
    default_gift_budget: 50.0,
    link_gifts_to_envelope: true,
    default_recipe_servings: 4,
    show_cooking_tips: true,
    share_lists_with_partner: true,
    share_recipes_with_partner: true,
    share_calendar_with_partner: true,
    notify_shopping_reminders: true,
    notify_meal_plan_reminders: true,
    notify_birthday_reminders: true,
    notify_chore_completions: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
