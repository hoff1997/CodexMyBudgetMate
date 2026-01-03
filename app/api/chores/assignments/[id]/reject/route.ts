import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: { id: string };
}

// PATCH /api/chores/assignments/[id]/reject - Parent rejects completed chore
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { reason } = body;

  // Get the assignment with child info
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

  // Verify parent owns this child
  const childData = assignment.child as unknown as { parent_user_id: string };
  if (childData.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Can only reject "done" status chores
  if (assignment.status !== "done") {
    return NextResponse.json(
      { error: `Can only reject chores that are marked done (current: ${assignment.status})` },
      { status: 400 }
    );
  }

  // Update assignment - set back to pending with rejection reason
  const { data: updated, error } = await supabase
    .from("chore_assignments")
    .update({
      status: "pending",
      marked_done_at: null,
      rejection_reason: reason || "Needs more work",
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
    console.error("Error rejecting chore:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
