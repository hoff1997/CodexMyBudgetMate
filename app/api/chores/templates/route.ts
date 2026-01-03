import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chores/templates - List all chore templates (system + custom)
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const ageMin = searchParams.get("age_min");
  const ageMax = searchParams.get("age_max");
  const includeSystem = searchParams.get("include_system") !== "false"; // default true

  let query = supabase
    .from("chore_templates")
    .select("*")
    .order("name");

  // Filter: system templates OR user's custom templates
  if (includeSystem) {
    query = query.or(`is_system.eq.true,created_by.eq.${user.id}`);
  } else {
    query = query.eq("created_by", user.id);
  }

  // Optional category filter
  if (category) {
    query = query.eq("category", category);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const {
    name,
    description,
    icon,
    category,
    recommended_age_min,
    recommended_age_max,
    default_currency_type,
    default_currency_amount,
    estimated_minutes,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from("chore_templates")
    .insert({
      name,
      description: description || null,
      icon: icon || "📋",
      category: category || "custom",
      recommended_age_min: recommended_age_min || null,
      recommended_age_max: recommended_age_max || null,
      default_currency_type: default_currency_type || "stars",
      default_currency_amount: default_currency_amount || 1,
      estimated_minutes: estimated_minutes || null,
      is_system: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chore template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(template, { status: 201 });
}
