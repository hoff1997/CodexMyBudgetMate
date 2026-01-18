import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// GET /api/chores/assignments - List chore assignments
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");
  const weekStarting = searchParams.get("week_starting");
  const status = searchParams.get("status");

  // First get all children this parent owns
  const { data: children } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("parent_user_id", user.id);

  if (!children || children.length === 0) {
    return NextResponse.json([]);
  }

  const childIds = children.map((c) => c.id);

  // If specific child requested, verify parent owns them
  if (childId && !childIds.includes(childId)) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  let query = supabase
    .from("chore_assignments")
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        description,
        icon,
        category,
        default_currency_type,
        default_currency_amount,
        estimated_minutes
      ),
      child:child_profiles (
        id,
        name,
        avatar_url
      )
    `
    )
    .in("child_profile_id", childId ? [childId] : childIds)
    .order("week_starting", { ascending: false })
    .order("day_of_week", { ascending: true });

  // Optional week filter
  if (weekStarting) {
    query = query.eq("week_starting", weekStarting);
  }

  // Optional status filter
  if (status) {
    query = query.eq("status", status);
  }

  const { data: assignments, error } = await query;

  if (error) {
    console.error("Error fetching chore assignments:", error);
    return createErrorResponse(error, 500, "Failed to fetch chore assignments");
  }

  return NextResponse.json(assignments);
}

// POST /api/chores/assignments - Create a new chore assignment
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
    child_profile_id,
    chore_template_id,
    week_starting,
    day_of_week,
    currency_type,
    currency_amount,
    notes,
  } = body;

  // Required fields
  if (!child_profile_id || !chore_template_id || !week_starting) {
    return createValidationError("child_profile_id, chore_template_id, and week_starting are required");
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", child_profile_id)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get template for default currency values if not provided
  const { data: template } = await supabase
    .from("chore_templates")
    .select("default_currency_type, default_currency_amount")
    .eq("id", chore_template_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "Chore template not found" }, { status: 404 });
  }

  const { data: assignment, error } = await supabase
    .from("chore_assignments")
    .insert({
      child_profile_id,
      chore_template_id,
      week_starting,
      day_of_week: day_of_week ?? null,
      currency_type: currency_type || template.default_currency_type,
      currency_amount: currency_amount ?? template.default_currency_amount,
      notes: notes || null,
      status: "pending",
    })
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        description,
        icon,
        category
      ),
      child:child_profiles (
        id,
        name,
        avatar_url
      )
    `
    )
    .single();

  if (error) {
    console.error("Error creating chore assignment:", error);
    return createErrorResponse(error, 500, "Failed to create chore assignment");
  }

  return NextResponse.json(assignment, { status: 201 });
}
