import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateRoutineRequest } from "@/lib/types/chores";

// GET /api/chores/routines - List all chore routines for this parent
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active_only") === "true";
  const timeOfDay = searchParams.get("time_of_day");

  let query = supabase
    .from("chore_routines")
    .select(
      `
      *,
      items:chore_routine_items (
        id,
        chore_template_id,
        sort_order,
        is_required,
        override_currency_type,
        override_currency_amount,
        chore_template:chore_templates (
          id,
          name,
          icon,
          category,
          is_expected,
          currency_type,
          currency_amount,
          estimated_minutes
        )
      )
    `
    )
    .eq("parent_user_id", user.id)
    .order("sort_order")
    .order("name");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (timeOfDay) {
    query = query.eq("time_of_day", timeOfDay);
  }

  const { data: routines, error } = await query;

  if (error) {
    console.error("Error fetching chore routines:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort items by sort_order
  const sortedRoutines = routines?.map((routine) => ({
    ...routine,
    items: routine.items?.sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    ),
  }));

  return NextResponse.json(sortedRoutines);
}

// POST /api/chores/routines - Create a new routine with items
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateRoutineRequest = await request.json();

  const {
    name,
    description,
    icon,
    time_of_day,
    target_time,
    duration_estimate_minutes,
    items,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "At least one chore is required in the routine" },
      { status: 400 }
    );
  }

  // Create the routine
  const { data: routine, error: routineError } = await supabase
    .from("chore_routines")
    .insert({
      parent_user_id: user.id,
      name,
      description: description || null,
      icon: icon || "📋",
      time_of_day: time_of_day || "anytime",
      target_time: target_time || null,
      duration_estimate_minutes: duration_estimate_minutes || null,
      is_active: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (routineError) {
    console.error("Error creating chore routine:", routineError);
    return NextResponse.json({ error: routineError.message }, { status: 500 });
  }

  // Add routine items
  const routineItems = items.map((item, index) => ({
    routine_id: routine.id,
    chore_template_id: item.chore_template_id,
    sort_order: item.sort_order ?? index,
    is_required: item.is_required ?? true,
    override_currency_type: item.override_currency_type || null,
    override_currency_amount: item.override_currency_amount ?? null,
  }));

  const { error: itemsError } = await supabase
    .from("chore_routine_items")
    .insert(routineItems);

  if (itemsError) {
    console.error("Error adding routine items:", itemsError);
    // Clean up the routine
    await supabase.from("chore_routines").delete().eq("id", routine.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Return full routine with items
  const { data: fullRoutine } = await supabase
    .from("chore_routines")
    .select(
      `
      *,
      items:chore_routine_items (
        id,
        chore_template_id,
        sort_order,
        is_required,
        override_currency_type,
        override_currency_amount,
        chore_template:chore_templates (
          id,
          name,
          icon,
          category
        )
      )
    `
    )
    .eq("id", routine.id)
    .single();

  return NextResponse.json(fullRoutine, { status: 201 });
}
