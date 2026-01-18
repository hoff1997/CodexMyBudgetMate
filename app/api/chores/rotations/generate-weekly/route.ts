import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

// POST /api/chores/rotations/generate-weekly - Generate assignments from rotations
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { week_starting } = body;

  if (!week_starting) {
    return createValidationError("week_starting is required (YYYY-MM-DD format)");
  }

  // Get all active rotations for this parent
  const { data: rotations, error: rotationsError } = await supabase
    .from("chore_rotations")
    .select(
      `
      *,
      rotation_members:chore_rotation_members (
        id,
        child_profile_id,
        order_position
      )
    `
    )
    .eq("parent_user_id", user.id)
    .eq("is_active", true);

  if (rotationsError) {
    console.error("Error fetching rotations:", rotationsError);
    return createErrorResponse(rotationsError, 500, "Failed to fetch rotations");
  }

  if (!rotations || rotations.length === 0) {
    return NextResponse.json({
      message: "No active rotations found",
      created: 0,
    });
  }

  const assignmentsToCreate: Array<{
    child_profile_id: string;
    chore_template_id: string;
    week_starting: string;
    day_of_week: number | null;
    currency_type: string;
    currency_amount: number;
    rotation_id: string;
    status: string;
  }> = [];

  // Process each rotation
  for (const rotation of rotations) {
    const members = rotation.rotation_members || [];
    if (members.length === 0) continue;

    // Sort members by order position
    members.sort((a: { order_position: number }, b: { order_position: number }) =>
      a.order_position - b.order_position
    );

    // Get current child based on rotation index
    const currentIndex = rotation.current_child_index % members.length;
    const currentMember = members[currentIndex];

    // Determine which days to assign based on frequency
    let daysToAssign: (number | null)[] = [];

    switch (rotation.frequency) {
      case "daily":
        // Assign for all 7 days (0-6)
        daysToAssign = [0, 1, 2, 3, 4, 5, 6];
        break;
      case "weekly":
        // Just once, on the specified day or null for any day
        daysToAssign = [rotation.day_of_week];
        break;
      case "fortnightly":
        // Check if this is the right week (simple alternating logic)
        const weekNumber = Math.floor(
          new Date(week_starting).getTime() / (7 * 24 * 60 * 60 * 1000)
        );
        if (weekNumber % 2 === 0) {
          daysToAssign = [rotation.day_of_week];
        }
        break;
      default:
        daysToAssign = [rotation.day_of_week];
    }

    for (const day of daysToAssign) {
      assignmentsToCreate.push({
        child_profile_id: currentMember.child_profile_id,
        chore_template_id: rotation.chore_template_id,
        week_starting,
        day_of_week: day,
        currency_type: rotation.currency_type,
        currency_amount: rotation.currency_amount,
        rotation_id: rotation.id,
        status: "pending",
      });
    }

    // For weekly/fortnightly rotations, advance the rotation index
    if (rotation.frequency === "weekly" || rotation.frequency === "fortnightly") {
      const nextIndex = (currentIndex + 1) % members.length;
      await supabase
        .from("chore_rotations")
        .update({ current_child_index: nextIndex })
        .eq("id", rotation.id);
    }
  }

  if (assignmentsToCreate.length === 0) {
    return NextResponse.json({
      message: "No assignments to create for this week",
      created: 0,
    });
  }

  // Check for existing assignments to avoid duplicates
  const existingQuery = await supabase
    .from("chore_assignments")
    .select("child_profile_id, chore_template_id, day_of_week")
    .eq("week_starting", week_starting)
    .in(
      "child_profile_id",
      assignmentsToCreate.map((a) => a.child_profile_id)
    );

  const existingAssignments = existingQuery.data || [];

  // Filter out assignments that already exist
  const newAssignments = assignmentsToCreate.filter((newAssign) => {
    return !existingAssignments.some(
      (existing) =>
        existing.child_profile_id === newAssign.child_profile_id &&
        existing.chore_template_id === newAssign.chore_template_id &&
        existing.day_of_week === newAssign.day_of_week
    );
  });

  if (newAssignments.length === 0) {
    return NextResponse.json({
      message: "All assignments already exist for this week",
      created: 0,
      skipped: assignmentsToCreate.length,
    });
  }

  // Insert new assignments
  const { data: created, error: insertError } = await supabase
    .from("chore_assignments")
    .insert(newAssignments)
    .select();

  if (insertError) {
    console.error("Error creating assignments:", insertError);
    return createErrorResponse(insertError, 500, "Failed to create assignments");
  }

  return NextResponse.json({
    message: `Created ${created?.length || 0} assignments`,
    created: created?.length || 0,
    skipped: assignmentsToCreate.length - (created?.length || 0),
  });
}
