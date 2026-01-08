import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string; assignmentId: string }>;
}

// POST /api/kids/[childId]/chores/[assignmentId]/review - Approve or reject chore completion
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
    .select("id, name, star_balance")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get the assignment with template details
  const { data: assignment, error: assignError } = await supabase
    .from("chore_assignments")
    .select(`
      id,
      status,
      proof_photo_url,
      completion_notes,
      chore_template_id,
      chore_template:chore_templates(
        name,
        is_expected,
        currency_type,
        currency_amount
      )
    `)
    .eq("id", assignmentId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (assignError || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (assignment.status !== "pending_approval") {
    return NextResponse.json(
      { error: "Chore is not awaiting approval" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { approved, rejection_reason } = body;

  if (approved === undefined) {
    return NextResponse.json({ error: "approved field required" }, { status: 400 });
  }

  const template = Array.isArray(assignment.chore_template)
    ? assignment.chore_template[0]
    : assignment.chore_template;

  if (approved) {
    // Approve the chore
    const { error: updateError } = await supabase
      .from("chore_assignments")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", assignmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Award the reward
    let rewardMessage = "";

    if (template) {
      if (template.currency_type === "stars") {
        const newBalance = Number(child.star_balance || 0) + Number(template.currency_amount);
        await supabase
          .from("child_profiles")
          .update({ star_balance: newBalance })
          .eq("id", childId);
        rewardMessage = `+${template.currency_amount} stars`;
      } else if (template.currency_type === "money" && !template.is_expected) {
        // Only add EXTRA chores (not expected chores) to the invoice
        // Expected chores are covered by pocket money - they don't get invoiced separately

        // Get or create draft invoice for this child
        let { data: draftInvoice } = await supabase
          .from("kid_invoices")
          .select("id")
          .eq("child_profile_id", childId)
          .eq("status", "draft")
          .maybeSingle();

        if (!draftInvoice) {
          // Create new draft invoice with auto-generated invoice number
          const { data: newInvoice, error: createError } = await supabase
            .from("kid_invoices")
            .insert({
              child_profile_id: childId,
              status: "draft",
              total_amount: 0,
            })
            .select("id")
            .single();

          if (createError) {
            console.error("Error creating draft invoice:", createError);
          } else {
            draftInvoice = newInvoice;
          }
        }

        if (draftInvoice) {
          // Add item to draft invoice
          const { error: itemError } = await supabase
            .from("kid_invoice_items")
            .insert({
              invoice_id: draftInvoice.id,
              chore_assignment_id: assignmentId,
              chore_name: template.name,
              amount: template.currency_amount,
              completed_at: assignment.proof_photo_url ? new Date().toISOString() : new Date().toISOString(),
              approved_at: new Date().toISOString(),
              approved_by: user.id,
            });

          if (itemError) {
            console.error("Error adding invoice item:", itemError);
          }
        }

        rewardMessage = `+$${template.currency_amount} (added to invoice)`;
      } else if (template.currency_type === "screen_time") {
        const { data: profile } = await supabase
          .from("child_profiles")
          .select("screen_time_balance")
          .eq("id", childId)
          .single();

        const currentTime = Number(profile?.screen_time_balance || 0);
        await supabase
          .from("child_profiles")
          .update({ screen_time_balance: currentTime + Number(template.currency_amount) })
          .eq("id", childId);
        rewardMessage = `+${template.currency_amount} minutes screen time`;
      }
    }

    return NextResponse.json({
      success: true,
      approved: true,
      child_name: child.name,
      chore_name: template?.name,
      reward_type: template?.currency_type,
      reward_amount: template?.currency_amount,
      reward_message: rewardMessage,
    });
  } else {
    // Reject the chore
    const { error: updateError } = await supabase
      .from("chore_assignments")
      .update({
        status: "rejected",
        rejection_reason: rejection_reason || null,
      })
      .eq("id", assignmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      approved: false,
      child_name: child.name,
      chore_name: template?.name,
      rejection_reason: rejection_reason,
    });
  }
}

// GET /api/kids/[childId]/chores/[assignmentId]/review - Get chore details for review
export async function GET(request: Request, context: RouteContext) {
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

  // Get the assignment with all details
  const { data: assignment, error } = await supabase
    .from("chore_assignments")
    .select(`
      id,
      status,
      proof_photo_url,
      completion_notes,
      marked_done_at,
      week_starting,
      chore_template:chore_templates(
        name,
        description,
        icon,
        currency_type,
        currency_amount,
        requires_photo
      )
    `)
    .eq("id", assignmentId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (error || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const template = Array.isArray(assignment.chore_template)
    ? assignment.chore_template[0]
    : assignment.chore_template;

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      status: assignment.status,
      proof_photo_url: assignment.proof_photo_url,
      completion_notes: assignment.completion_notes,
      marked_done_at: assignment.marked_done_at,
      week_starting: assignment.week_starting,
    },
    chore: template,
    child: {
      id: child.id,
      name: child.name,
    },
  });
}
