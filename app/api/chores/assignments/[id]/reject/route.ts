import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/chores/assignments/[id]/reject - Parent rejects completed chore
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
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
    .eq("id", id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Verify parent owns this child
  const childData = assignment.child as unknown as { parent_user_id: string };
  if (childData.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Can only reject chores that are "done" or "pending_approval"
  // - "done" comes from parent-initiated completion
  // - "pending_approval" comes from kid-initiated completion (with/without photo)
  if (assignment.status !== "done" && assignment.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Can only reject chores that are done or pending approval (current: ${assignment.status})` },
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
    .eq("id", id)
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
