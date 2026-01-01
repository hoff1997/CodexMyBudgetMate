import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/milestones
 * Fetches all dismissed milestones for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dismissals, error } = await supabase
      .from("milestone_dismissals")
      .select("milestone_key, dismissed_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching milestone dismissals:", error);
      return NextResponse.json({ error: "Failed to fetch dismissals" }, { status: 500 });
    }

    return NextResponse.json({
      dismissedMilestones: dismissals?.map((d) => d.milestone_key) ?? [],
      dismissals: dismissals ?? [],
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/milestones:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/milestones
 * Dismisses a milestone for the current user
 * Body: { milestoneKey: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { milestoneKey } = body;

    if (!milestoneKey || typeof milestoneKey !== "string") {
      return NextResponse.json({ error: "milestoneKey is required" }, { status: 400 });
    }

    // Upsert to handle duplicate dismissals gracefully
    const { data, error } = await supabase
      .from("milestone_dismissals")
      .upsert(
        {
          user_id: user.id,
          milestone_key: milestoneKey,
          dismissed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,milestone_key",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error dismissing milestone:", error);
      return NextResponse.json({ error: "Failed to dismiss milestone" }, { status: 500 });
    }

    return NextResponse.json({ success: true, dismissal: data });
  } catch (error) {
    console.error("Unexpected error in POST /api/milestones:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/milestones
 * Resets a milestone dismissal (for testing or "show again" functionality)
 * Body: { milestoneKey: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { milestoneKey } = body;

    if (!milestoneKey || typeof milestoneKey !== "string") {
      return NextResponse.json({ error: "milestoneKey is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("milestone_dismissals")
      .delete()
      .eq("user_id", user.id)
      .eq("milestone_key", milestoneKey);

    if (error) {
      console.error("Error resetting milestone:", error);
      return NextResponse.json({ error: "Failed to reset milestone" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/milestones:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
