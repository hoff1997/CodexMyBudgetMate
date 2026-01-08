import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/chores/assignments/[id]/approve - Parent approves completed chore
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the assignment with child info and template details (including is_expected)
  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select(
      `
      id,
      status,
      currency_type,
      currency_amount,
      child_profile_id,
      chore_template_id,
      chore_template:chore_templates (
        id,
        name,
        icon,
        is_expected
      ),
      child:child_profiles!inner (
        id,
        parent_user_id,
        star_balance,
        screen_time_balance
      )
    `
    )
    .eq("id", id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Verify parent owns this child
  const childData = assignment.child as unknown as {
    parent_user_id: string;
    star_balance: number;
    screen_time_balance: number;
  };

  if (childData.parent_user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Can only approve chores that are "done" or "pending_approval"
  // - "done" comes from parent-initiated completion
  // - "pending_approval" comes from kid-initiated completion (with/without photo)
  if (assignment.status !== "done" && assignment.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Can only approve chores that are done or pending approval (current: ${assignment.status})` },
      { status: 400 }
    );
  }

  // Get template details
  const template = Array.isArray(assignment.chore_template)
    ? assignment.chore_template[0]
    : assignment.chore_template;

  // Update assignment status
  const { data: updated, error: updateError } = await supabase
    .from("chore_assignments")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
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

  if (updateError) {
    console.error("Error approving chore:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let rewardMessage = "";

  // Award the reward based on currency type
  if (assignment.currency_type === "stars") {
    const { error: balanceError } = await supabase
      .from("child_profiles")
      .update({
        star_balance: childData.star_balance + assignment.currency_amount,
      })
      .eq("id", assignment.child_profile_id);

    if (balanceError) {
      console.error("Error updating star balance:", balanceError);
    }
    rewardMessage = `+${assignment.currency_amount} stars`;
  } else if (assignment.currency_type === "screen_time") {
    const { error: balanceError } = await supabase
      .from("child_profiles")
      .update({
        screen_time_balance:
          childData.screen_time_balance + assignment.currency_amount,
      })
      .eq("id", assignment.child_profile_id);

    if (balanceError) {
      console.error("Error updating screen time balance:", balanceError);
    }
    rewardMessage = `+${assignment.currency_amount} minutes screen time`;
  } else if (assignment.currency_type === "money" && !template?.is_expected) {
    // Only add EXTRA chores (not expected chores) to the invoice
    // Expected chores are covered by pocket money - they don't get invoiced separately

    // Get or create draft invoice for this child
    let { data: draftInvoice } = await supabase
      .from("kid_invoices")
      .select("id")
      .eq("child_profile_id", assignment.child_profile_id)
      .eq("status", "draft")
      .maybeSingle();

    if (!draftInvoice) {
      // Create new draft invoice
      const { data: newInvoice, error: createError } = await supabase
        .from("kid_invoices")
        .insert({
          child_profile_id: assignment.child_profile_id,
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
          chore_assignment_id: id,
          chore_name: template?.name || "Unknown Chore",
          amount: assignment.currency_amount,
          completed_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        });

      if (itemError) {
        console.error("Error adding invoice item:", itemError);
      }
    }

    rewardMessage = `+$${assignment.currency_amount} (added to invoice)`;
  }

  return NextResponse.json({
    ...updated,
    reward_granted: {
      type: assignment.currency_type,
      amount: assignment.currency_amount,
    },
    reward_message: rewardMessage,
  });
}
