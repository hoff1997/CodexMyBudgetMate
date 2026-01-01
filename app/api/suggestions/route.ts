import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTopSuggestions, type SuggestionContext } from "@/lib/utils/smart-suggestion-generator";
import type { UnifiedEnvelope } from "@/lib/types/unified-envelope";

/**
 * GET /api/suggestions
 * Generates personalized budget suggestions based on current envelope state
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

    // Fetch income sources
    const { data: incomeSources, error: incomeError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id);

    if (incomeError) {
      console.error("Error fetching income sources:", incomeError);
      return NextResponse.json({ error: "Failed to fetch income" }, { status: 500 });
    }

    // Calculate monthly income and unallocated amount
    let monthlyIncome = 0;
    let totalAllocated = 0;

    for (const source of incomeSources ?? []) {
      const payAmount = source.pay_amount ?? 0;
      const frequency = source.pay_frequency ?? "monthly";

      // Convert to monthly
      switch (frequency) {
        case "weekly":
          monthlyIncome += payAmount * 4.33;
          break;
        case "fortnightly":
          monthlyIncome += payAmount * 2.17;
          break;
        case "twice_monthly":
          monthlyIncome += payAmount * 2;
          break;
        case "monthly":
        default:
          monthlyIncome += payAmount;
          break;
      }
    }

    // Calculate total allocated from envelope budgets
    for (const envelope of envelopes ?? []) {
      if (envelope.subtype === "bill" && envelope.monthly_amount) {
        totalAllocated += envelope.monthly_amount;
      }
    }

    const unallocatedIncome = monthlyIncome - totalAllocated;

    // Find surplus envelope balance
    const surplusEnvelope = (envelopes ?? []).find(
      (e: UnifiedEnvelope) =>
        e.name?.toLowerCase() === "surplus" ||
        e.name?.toLowerCase().includes("unallocated")
    );
    const surplusAmount = surplusEnvelope?.current_amount ?? 0;

    // Build context for suggestion generator
    const context: SuggestionContext = {
      envelopes: (envelopes ?? []) as UnifiedEnvelope[],
      surplusAmount: Math.max(0, surplusAmount),
      monthlyIncome,
      unallocatedIncome: Math.max(0, unallocatedIncome),
    };

    // Generate suggestions
    const suggestions = getTopSuggestions(context, 5);

    return NextResponse.json({
      suggestions,
      context: {
        monthlyIncome,
        totalAllocated,
        unallocatedIncome,
        surplusAmount,
        envelopeCount: envelopes?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
