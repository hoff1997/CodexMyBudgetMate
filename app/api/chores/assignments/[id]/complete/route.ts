import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: { id: string };
}

// PATCH /api/chores/assignments/[id]/complete - Kid marks chore as done
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the assignment
  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select(
      `
      id,
      status,
      child:child_profiles!inner (
        id,
        parent_user_id
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Verify parent owns this child (kid would be logged in via parent account for now)
  const childData = assignment.child as unknown as { parent_user_id: string };
  if (childData.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Can only mark pending chores as done
  if (assignment.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot mark ${assignment.status} chore as done` },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from("chore_assignments")
    .update({
      status: "done",
      marked_done_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select(
      `
      *,
      chore_template:chore_templates (
        id,
        name,
        icon
      )
    `
    )
    .single();

  if (error) {
    console.error("Error marking chore as done:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
