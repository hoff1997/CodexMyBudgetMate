import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeEnvelopes, detectMilestones } from "@/lib/utils/milestone-detector";

/**
 * GET /api/milestones/detect
 * Detects achieved milestones that haven't been dismissed
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

    // Fetch all envelopes for the user
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false);

    if (envelopesError) {
      console.error("Error fetching envelopes:", envelopesError);
      return NextResponse.json({ error: "Failed to fetch envelopes" }, { status: 500 });
    }

    // Fetch dismissed milestones
    const { data: dismissals, error: dismissalsError } = await supabase
      .from("milestone_dismissals")
      .select("milestone_key")
      .eq("user_id", user.id);

    if (dismissalsError) {
      console.error("Error fetching dismissals:", dismissalsError);
      return NextResponse.json({ error: "Failed to fetch dismissals" }, { status: 500 });
    }

    const dismissedMilestones = dismissals?.map((d) => d.milestone_key) ?? [];

    // Analyze envelopes and detect milestones
    const analysis = analyzeEnvelopes(envelopes ?? []);
    const allMilestones = detectMilestones(analysis, dismissedMilestones);
    const topMilestone = allMilestones.length > 0 ? allMilestones[0] : null;

    return NextResponse.json({
      topMilestone,
      allMilestones,
      analysis: {
        starterStashBalance: analysis.starterStashBalance,
        starterStashTarget: analysis.starterStashTarget,
        emergencyFundPercent: analysis.emergencyFundPercent,
        totalDebt: analysis.totalDebt,
        fundedBillsPercent: analysis.fundedBillsPercent,
        hasBudgetSurplus: analysis.hasBudgetSurplus,
      },
      dismissedCount: dismissedMilestones.length,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/milestones/detect:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
