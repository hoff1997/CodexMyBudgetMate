import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateScheduleRequest } from "@/lib/types/chores";

// Calculate next occurrence based on frequency and days
function calculateNextOccurrence(
  startDate: Date,
  frequency: string,
  daysOfWeek?: number[] | null,
  dayOfMonth?: number | null
): Date {
  const now = new Date();
  let next = new Date(startDate);

  // If start date is in the past, calculate next from today
  if (next < now) {
    next = new Date(now);
  }

  switch (frequency) {
    case "daily":
      // Next occurrence is today or tomorrow
      if (next < now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next matching day of week
        const currentDay = next.getDay();
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        let nextDay = sortedDays.find((d) => d > currentDay);

        if (nextDay === undefined) {
          // Wrap to next week
          nextDay = sortedDays[0];
          next.setDate(next.getDate() + (7 - currentDay + nextDay));
        } else {
          next.setDate(next.getDate() + (nextDay - currentDay));
        }
      }
      break;

    case "fortnightly":
      // Next occurrence 14 days from start
      while (next <= now) {
        next.setDate(next.getDate() + 14);
      }
      break;

    case "monthly":
      if (dayOfMonth) {
        // Set to specific day of month
        next.setDate(dayOfMonth);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
      } else {
        // Just add one month
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
      }
      break;
  }

  return next;
}

// GET /api/chores/schedules - List all schedules for this parent
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
  const childId = searchParams.get("child_id");

  let query = supabase
    .from("chore_schedules")
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon,
        category
      ),
      routine:chore_routines (
        id,
        name,
        icon,
        time_of_day
      ),
      child:child_profiles (
        id,
        name,
        avatar_url
      ),
      rotation:chore_rotations (
        id,
        name,
        current_child_index,
        rotation_members:chore_rotation_members (
          id,
          child_profile_id,
          order_position,
          child:child_profiles (
            id,
            name,
            avatar_url
          )
        )
      )
    `
    )
    .eq("parent_user_id", user.id)
    .order("next_occurrence_date", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (childId) {
    query = query.eq("child_profile_id", childId);
  }

  const { data: schedules, error } = await query;

  if (error) {
    console.error("Error fetching chore schedules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedules);
}

// POST /api/chores/schedules - Create a new schedule
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateScheduleRequest = await request.json();

  const {
    name,
    chore_template_id,
    routine_id,
    child_profile_id,
    rotation_id,
    frequency,
    days_of_week,
    day_of_month,
    time_of_day,
    target_time,
    start_date,
    end_date,
    occurrences_limit,
    currency_type,
    currency_amount,
  } = body;

  // Validations
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!frequency) {
    return NextResponse.json(
      { error: "Frequency is required" },
      { status: 400 }
    );
  }

  if (!chore_template_id && !routine_id) {
    return NextResponse.json(
      { error: "Either chore_template_id or routine_id is required" },
      { status: 400 }
    );
  }

  if (!child_profile_id && !rotation_id) {
    return NextResponse.json(
      { error: "Either child_profile_id or rotation_id is required" },
      { status: 400 }
    );
  }

  // Calculate next occurrence
  const startDateObj = start_date ? new Date(start_date) : new Date();
  const nextOccurrence = calculateNextOccurrence(
    startDateObj,
    frequency,
    days_of_week,
    day_of_month
  );

  const { data: schedule, error } = await supabase
    .from("chore_schedules")
    .insert({
      parent_user_id: user.id,
      name,
      chore_template_id: chore_template_id || null,
      routine_id: routine_id || null,
      child_profile_id: child_profile_id || null,
      rotation_id: rotation_id || null,
      frequency,
      days_of_week: days_of_week || null,
      day_of_month: day_of_month ?? null,
      time_of_day: time_of_day || "anytime",
      target_time: target_time || null,
      start_date: startDateObj.toISOString().split("T")[0],
      end_date: end_date || null,
      occurrences_limit: occurrences_limit ?? null,
      occurrences_count: 0,
      is_active: true,
      next_occurrence_date: nextOccurrence.toISOString().split("T")[0],
      currency_type: currency_type || null,
      currency_amount: currency_amount ?? null,
    })
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon
      ),
      routine:chore_routines (
        id,
        name,
        icon
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
    console.error("Error creating chore schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedule, { status: 201 });
}
