import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string; assignmentId: string }>;
}

// POST /api/kids/[childId]/chores/[assignmentId]/complete - Mark chore as complete with optional photo
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, assignmentId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get the assignment
  const { data: assignment, error: assignError } = await supabase
    .from("chore_assignments")
    .select(`
      id,
      status,
      chore_template_id,
      chore_template:chore_templates(name, requires_photo)
    `)
    .eq("id", assignmentId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (assignError || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (assignment.status !== "pending") {
    return NextResponse.json(
      { error: "Chore is not in pending status" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { photo_url, notes } = body;

  // Check if photo is required
  const template = Array.isArray(assignment.chore_template)
    ? assignment.chore_template[0]
    : assignment.chore_template;

  if (template?.requires_photo && !photo_url) {
    return NextResponse.json(
      { error: "Photo proof is required for this chore" },
      { status: 400 }
    );
  }

  // Update the assignment
  const { error: updateError } = await supabase
    .from("chore_assignments")
    .update({
      status: "pending_approval",
      proof_photo_url: photo_url || null,
      completion_notes: notes || null,
      marked_done_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `${child.name} completed "${template?.name}" - waiting for approval`,
    assignment_id: assignmentId,
    status: "pending_approval",
  });
}
