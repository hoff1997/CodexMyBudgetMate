import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: { id: string };
}

// PATCH /api/chores/assignments/[id]/approve - Parent approves completed chore
export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the assignment with child info
  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select(
      `
      id,
      status,
      currency_type,
      currency_amount,
      child_profile_id,
      child:child_profiles!inner (
        id,
        parent_user_id,
        star_balance,
        screen_time_balance
      )
    `
    )
    .eq("id", params.id)
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

  // Can only approve "done" status chores
  if (assignment.status !== "done") {
    return NextResponse.json(
      { error: `Can only approve chores that are marked done (current: ${assignment.status})` },
      { status: 400 }
    );
  }

  // Update assignment status
  const { data: updated, error: updateError } = await supabase
    .from("chore_assignments")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
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

  if (updateError) {
    console.error("Error approving chore:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

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
      // Don't fail the whole request, just log it
    }
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
  } else if (assignment.currency_type === "money") {
    // Credit the "spend" bank account
    const { data: spendAccount } = await supabase
      .from("child_bank_accounts")
      .select("id, current_balance")
      .eq("child_profile_id", assignment.child_profile_id)
      .eq("envelope_type", "spend")
      .single();

    if (spendAccount) {
      const { error: accountError } = await supabase
        .from("child_bank_accounts")
        .update({
          current_balance: spendAccount.current_balance + assignment.currency_amount,
        })
        .eq("id", spendAccount.id);

      if (accountError) {
        console.error("Error updating money balance:", accountError);
      }
    }
  }

  return NextResponse.json({
    ...updated,
    reward_granted: {
      type: assignment.currency_type,
      amount: assignment.currency_amount,
    },
  });
}
