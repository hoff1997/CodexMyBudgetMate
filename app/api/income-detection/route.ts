import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Detects if a transaction matches an income source and generates allocation preview
 * Used during reconciliation to propose automatic allocation
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transaction_id, transaction_description, transaction_amount } = body;

    // Fetch all active income sources with their detection rules
    const { data: incomeSources, error: incomeError } = await supabase
      .from("income_sources")
      .select(`
        *,
        detection_rule:transaction_rules(id, pattern, merchant_normalized, match_type, case_sensitive)
      `)
      .eq("user_id", session.user.id)
      .eq("is_active", true);

    if (incomeError) {
      console.error("Error fetching income sources:", incomeError);
      return NextResponse.json(
        { error: "Failed to fetch income sources" },
        { status: 500 }
      );
    }

    // Try to match transaction to an income source
    let matchedSource = null;
    for (const source of incomeSources || []) {
      if (!source.detection_rule) continue;

      const rule = source.detection_rule;
      const pattern = rule.pattern || rule.merchant_normalized;

      if (!pattern) continue;

      const description = rule.case_sensitive
        ? transaction_description
        : transaction_description.toUpperCase();

      const searchPattern = rule.case_sensitive
        ? pattern
        : pattern.toUpperCase();

      let isMatch = false;
      if (rule.match_type === "contains") {
        isMatch = description.includes(searchPattern);
      } else if (rule.match_type === "exact") {
        isMatch = description === searchPattern;
      } else if (rule.match_type === "starts_with") {
        isMatch = description.startsWith(searchPattern);
      }

      if (isMatch) {
        matchedSource = source;
        break;
      }
    }

    if (!matchedSource) {
      return NextResponse.json({
        matched: false,
        available_sources: (incomeSources || []).map((s) => ({
          id: s.id,
          name: s.name,
          pay_cycle: s.pay_cycle,
          typical_amount: s.typical_amount,
        })),
      });
    }

    // Fetch envelope allocations for this income source
    const { data: allocations, error: allocError } = await supabase
      .from("envelope_income_allocations")
      .select(`
        *,
        envelope:envelopes(id, name, priority, current_balance)
      `)
      .eq("income_source_id", matchedSource.id)
      .order("priority");

    if (allocError) {
      console.error("Error fetching allocations:", allocError);
      return NextResponse.json(
        { error: "Failed to fetch allocations" },
        { status: 500 }
      );
    }

    // Calculate proposed allocations
    const proposedAllocations = (allocations || []).map((alloc) => ({
      envelope_id: alloc.envelope_id,
      envelope_name: alloc.envelope?.name || "Unknown",
      envelope_priority: alloc.envelope?.priority || "discretionary",
      current_balance: Number(alloc.envelope?.current_balance || 0),
      allocation_amount: Number(alloc.allocation_amount),
      is_overspent: false, // Will be calculated based on envelope spend
      overspent_amount: null,
    }));

    const totalAllocated = proposedAllocations.reduce(
      (sum, a) => sum + a.allocation_amount,
      0
    );

    const surplus = transaction_amount - totalAllocated;

    // Get Surplus envelope
    const { data: surplusEnvelope } = await supabase
      .from("envelopes")
      .select("id, name")
      .eq("user_id", session.user.id)
      .eq("name", "Surplus")
      .single();

    return NextResponse.json({
      matched: true,
      income_source: {
        id: matchedSource.id,
        name: matchedSource.name,
        pay_cycle: matchedSource.pay_cycle,
        typical_amount: matchedSource.typical_amount,
      },
      actual_amount: transaction_amount,
      expected_amount: matchedSource.typical_amount || 0,
      variance: transaction_amount - (matchedSource.typical_amount || 0),
      allocations: proposedAllocations,
      surplus: {
        amount: surplus,
        envelope_id: surplusEnvelope?.id || null,
        envelope_name: surplusEnvelope?.name || "Surplus",
      },
      total_allocated: totalAllocated,
    });
  } catch (error) {
    console.error("Error in income detection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
