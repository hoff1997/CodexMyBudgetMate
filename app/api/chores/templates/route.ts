import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/chores/templates - List all chore templates (system + custom)
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const ageMin = searchParams.get("age_min");
  const ageMax = searchParams.get("age_max");
  const choreType = searchParams.get("type"); // "expected" or "extra"
  const includeSystem = searchParams.get("include_system") !== "false"; // default true

  let query = supabase
    .from("chore_templates")
    .select("*")
    .order("name");

  // Filter: preset templates OR user's custom templates
  if (includeSystem) {
    query = query.or(`is_preset.eq.true,parent_user_id.eq.${user.id}`);
  } else {
    query = query.eq("parent_user_id", user.id);
  }

  // Optional category filter
  if (category) {
    query = query.eq("category", category);
  }

  // Optional chore type filter (expected vs extra)
  if (choreType === "expected") {
    query = query.eq("is_expected", true);
  } else if (choreType === "extra") {
    query = query.or("is_expected.eq.false,is_expected.is.null");
  }

  // Optional age range filter
  if (ageMin) {
    query = query.gte("recommended_age_min", parseInt(ageMin));
  }
  if (ageMax) {
    query = query.lte("recommended_age_max", parseInt(ageMax));
  }

  const { data: templates, error } = await query;

  if (error) {
    console.error("Error fetching chore templates:", error);
    return createErrorResponse(error, 500, "Failed to fetch chore templates");
  }

  return NextResponse.json(templates);
}

// POST /api/chores/templates - Create a custom chore template
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  const {
    name,
    description,
    icon,
    category,
    is_expected,
    recommended_age_min,
    recommended_age_max,
    currency_type,
    currency_amount,
    estimated_minutes,
    max_per_week,
    allowed_days,
    auto_approve,
  } = body;

  if (!name) {
    return createValidationError("Name is required");
  }

  // Expected chores don't have monetary rewards
  const isExpectedChore = is_expected === true;

  const { data: template, error } = await supabase
    .from("chore_templates")
    .insert({
      name,
      description: description || null,
      icon: icon || "📋",
      category: category || "custom",
      is_expected: isExpectedChore,
      recommended_age_min: recommended_age_min || null,
      recommended_age_max: recommended_age_max || null,
      // Expected chores have no currency/amount (part of pocket money)
      currency_type: isExpectedChore ? null : (currency_type || "money"),
      currency_amount: isExpectedChore ? null : (currency_amount || 5),
      estimated_minutes: estimated_minutes || null,
      max_per_week: max_per_week || null,
      allowed_days: allowed_days || null,
      auto_approve: auto_approve || false,
      is_preset: false,
      parent_user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chore template:", error);
    return createErrorResponse(error, 500, "Failed to create chore template");
  }

  return NextResponse.json(template, { status: 201 });
}
