import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getKidSession } from "@/lib/utils/kid-session";

interface RouteContext {
  params: Promise<{ childId: string; goalId: string }>;
}

// Helper to get authenticated context (either parent or kid session)
async function getAuthContext(childId: string) {
  // First check for kid session
  const kidSession = await getKidSession();
  if (kidSession && kidSession.childId === childId) {
    return {
      type: "kid" as const,
      childId,
      supabase: createServiceClient(),
      userId: null,
    };
  }

  // Fall back to parent auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Verify parent owns this child
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return null;
  }

  return {
    type: "parent" as const,
    childId,
    supabase,
    userId: user.id,
  };
}

// GET /api/kids/[childId]/goals/[goalId] - Get a single goal with history
export async function GET(request: Request, context: RouteContext) {
  const { childId, goalId } = await context.params;
  const auth = await getAuthContext(childId);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = auth.supabase;

  // Get the goal
  const { data: goal, error: goalError } = await supabase
    .from("teen_savings_goals")
    .select("*")
    .eq("id", goalId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Get interest history for this goal
  const { data: interestHistory } = await supabase
    .from("teen_goal_interest_ledger")
    .select("*")
    .eq("goal_id", goalId)
    .order("allocated_date", { ascending: false })
    .limit(20);

  // Get transfer history (both in and out)
  const { data: transfers } = await supabase
    .from("teen_goal_transfers")
    .select(`
      *,
      from_goal:from_goal_id (id, name, icon),
      to_goal:to_goal_id (id, name, icon)
    `)
    .or(`from_goal_id.eq.${goalId},to_goal_id.eq.${goalId}`)
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculate total interest earned for this goal
  const totalInterestEarned = interestHistory?.reduce(
    (sum, entry) => sum + Number(entry.interest_amount || 0),
    0
  ) || 0;

  return NextResponse.json({
    goal,
    interestHistory: interestHistory || [],
    transfers: transfers || [],
    totalInterestEarned,
  });
}

// PATCH /api/kids/[childId]/goals/[goalId] - Update a goal
export async function PATCH(request: Request, context: RouteContext) {
  const { childId, goalId } = await context.params;
  const auth = await getAuthContext(childId);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = auth.supabase;

  // Get the existing goal
  const { data: existingGoal } = await supabase
    .from("teen_savings_goals")
    .select("*")
    .eq("id", goalId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  // Handle name update
  if (body.name !== undefined) {
    if (!body.name || body.name.trim() === "") {
      return NextResponse.json({ error: "Goal name is required" }, { status: 400 });
    }
    updateData.name = body.name.trim();
  }

  // Handle allocation percentage update
  if (body.allocation_percentage !== undefined) {
    if (body.allocation_percentage < 0 || body.allocation_percentage > 100) {
      return NextResponse.json(
        { error: "Allocation percentage must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Check if new allocation would exceed 100%
    const { data: otherGoals } = await supabase
      .from("teen_savings_goals")
      .select("allocation_percentage")
      .eq("child_profile_id", childId)
      .eq("is_active", true)
      .neq("id", goalId);

    const otherTotal = otherGoals?.reduce(
      (sum, g) => sum + Number(g.allocation_percentage || 0),
      0
    ) || 0;

    if (otherTotal + body.allocation_percentage > 100) {
      return NextResponse.json(
        {
          error: `Total allocation would exceed 100%. Other goals: ${otherTotal}%, Requested: ${body.allocation_percentage}%`,
        },
        { status: 400 }
      );
    }

    updateData.allocation_percentage = body.allocation_percentage;
  }

  // Handle other fields
  if (body.description !== undefined) updateData.description = body.description?.trim() || null;
  if (body.target_amount !== undefined) updateData.target_amount = body.target_amount;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

  updateData.updated_at = new Date().toISOString();

  const { data: updatedGoal, error: updateError } = await supabase
    .from("teen_savings_goals")
    .update(updateData)
    .eq("id", goalId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ goal: updatedGoal });
}

// DELETE /api/kids/[childId]/goals/[goalId] - Delete (deactivate) a goal
export async function DELETE(request: Request, context: RouteContext) {
  const { childId, goalId } = await context.params;
  const { searchParams } = new URL(request.url);
  const redistribute = searchParams.get("redistribute") === "true";

  const auth = await getAuthContext(childId);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = auth.supabase;

  // Get the goal to delete
  const { data: goal } = await supabase
    .from("teen_savings_goals")
    .select("*")
    .eq("id", goalId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // If goal has balance and redistribute is requested
  if (redistribute && goal.current_amount > 0) {
    // Get other active goals
    const { data: otherGoals } = await supabase
      .from("teen_savings_goals")
      .select("id, allocation_percentage")
      .eq("child_profile_id", childId)
      .eq("is_active", true)
      .neq("id", goalId);

    if (otherGoals && otherGoals.length > 0) {
      // Distribute balance proportionally to other goals
      const totalOtherAllocation = otherGoals.reduce(
        (sum, g) => sum + Number(g.allocation_percentage || 0),
        0
      );

      for (const otherGoal of otherGoals) {
        const proportion = totalOtherAllocation > 0
          ? Number(otherGoal.allocation_percentage) / totalOtherAllocation
          : 1 / otherGoals.length;

        const transferAmount = Math.round(goal.current_amount * proportion * 100) / 100;

        if (transferAmount > 0) {
          // Create transfer record
          await supabase.from("teen_goal_transfers").insert({
            child_profile_id: childId,
            from_goal_id: goalId,
            to_goal_id: otherGoal.id,
            amount: transferAmount,
            notes: "Redistributed from deleted goal",
            transferred_by_type: auth.type,
            transferred_by_id: auth.userId,
          });
        }
      }
    }
  }

  // Soft delete (deactivate) the goal
  const { error: deleteError } = await supabase
    .from("teen_savings_goals")
    .update({
      is_active: false,
      current_amount: 0,
      allocation_percentage: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
