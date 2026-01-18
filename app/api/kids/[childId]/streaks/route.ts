import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ExpectedChoreStreak } from "@/lib/types/kids-invoice";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/streaks - Get all expected chore streaks for a child
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  // Get streaks with chore template info
  const { data: streaks, error } = await supabase
    .from("expected_chore_streaks")
    .select(`
      *,
      chore_template:chore_templates(
        id,
        name,
        icon
      )
    `)
    .eq("child_profile_id", childId)
    .order("current_streak", { ascending: false });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch chore streaks");
  }

  // Calculate some stats
  const totalStreaks = streaks?.length || 0;
  const activeStreaks = streaks?.filter((s) => s.current_streak > 0).length || 0;
  const longestCurrentStreak = Math.max(
    0,
    ...(streaks?.map((s) => s.current_streak) || [0])
  );
  const longestEverStreak = Math.max(
    0,
    ...(streaks?.map((s) => s.longest_streak) || [0])
  );

  return NextResponse.json({
    childId,
    childName: child.name,
    streaks: streaks as ExpectedChoreStreak[],
    stats: {
      totalStreaks,
      activeStreaks,
      longestCurrentStreak,
      longestEverStreak,
    },
  });
}

// POST /api/kids/[childId]/streaks - Mark an expected chore as complete (updates streak)
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return createNotFoundError("Child");
  }

  const body = await request.json();

  if (!body.chore_template_id) {
    return createValidationError("Chore template ID is required");
  }

  // Verify the chore is an expected chore
  const { data: chore } = await supabase
    .from("chore_templates")
    .select("id, name, is_expected")
    .eq("id", body.chore_template_id)
    .maybeSingle();

  if (!chore) {
    return createNotFoundError("Chore");
  }

  if (!chore.is_expected) {
    return createValidationError("This chore is not an expected chore - use the invoice system for extra chores");
  }

  const completedDate = body.completed_date || new Date().toISOString().split("T")[0];

  // Use the database function to update streak
  const { error: rpcError } = await supabase.rpc("update_expected_chore_streak", {
    p_child_id: childId,
    p_chore_id: body.chore_template_id,
    p_completed_date: completedDate,
  });

  if (rpcError) {
    // Fallback: manually update if function doesn't exist
    // Calculate week start (Monday)
    const date = new Date(completedDate);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Get or create streak
    const { data: existing } = await supabase
      .from("expected_chore_streaks")
      .select("*")
      .eq("child_profile_id", childId)
      .eq("chore_template_id", body.chore_template_id)
      .maybeSingle();

    if (existing) {
      // Update existing
      const dayIndex = (date.getDay() + 6) % 7; // 0 = Monday
      const completedDays = existing.week_starting === weekStartStr
        ? [...existing.completed_days]
        : [false, false, false, false, false, false, false];
      completedDays[dayIndex] = true;

      const newStreak = existing.last_completed_date ===
        new Date(Date.now() - 86400000).toISOString().split("T")[0]
        ? existing.current_streak + 1
        : 1;

      await supabase
        .from("expected_chore_streaks")
        .update({
          week_starting: weekStartStr,
          completed_days: completedDays,
          last_completed_date: completedDate,
          current_streak: newStreak,
          longest_streak: Math.max(existing.longest_streak, newStreak),
        })
        .eq("id", existing.id);
    } else {
      // Create new
      const dayIndex = (date.getDay() + 6) % 7;
      const completedDays = [false, false, false, false, false, false, false];
      completedDays[dayIndex] = true;

      await supabase.from("expected_chore_streaks").insert({
        child_profile_id: childId,
        chore_template_id: body.chore_template_id,
        week_starting: weekStartStr,
        completed_days: completedDays,
        last_completed_date: completedDate,
        current_streak: 1,
        longest_streak: 1,
      });
    }
  }

  // Get updated streak
  const { data: updatedStreak } = await supabase
    .from("expected_chore_streaks")
    .select(`
      *,
      chore_template:chore_templates(
        id,
        name,
        icon
      )
    `)
    .eq("child_profile_id", childId)
    .eq("chore_template_id", body.chore_template_id)
    .single();

  return NextResponse.json({
    success: true,
    streak: updatedStreak as ExpectedChoreStreak,
    message: `${chore.name} marked complete!`,
  });
}
