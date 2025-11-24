import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    // Fetch income sources with their allocations
    const { data: incomeSources, error: incomeError } = await supabase
      .from("income_sources")
      .select(`
        *,
        detection_rule:transaction_rules(id, pattern, merchant_normalized)
      `)
      .eq("user_id", user.id)
      .order("created_at");

    if (incomeError) {
      console.error("Error fetching income sources:", incomeError);
      return NextResponse.json(
        { error: "Failed to fetch income sources" },
        { status: 500 }
      );
    }

    // For each income source, fetch envelope allocations
    const sourcesWithAllocations = await Promise.all(
      incomeSources.map(async (source) => {
        const { data: allocations, error: allocError } = await supabase
          .from("envelope_income_allocations")
          .select(`
            *,
            envelope:envelopes(id, name, priority, current_balance)
          `)
          .eq("income_source_id", source.id)
          .order("priority");

        if (allocError) {
          console.error("Error fetching allocations:", allocError);
          return {
            ...source,
            allocations: [],
            total_allocated: 0,
            surplus: source.typical_amount || 0,
          };
        }

        const totalAllocated = allocations.reduce(
          (sum, alloc) => sum + Number(alloc.allocation_amount),
          0
        );

        const surplus = (source.typical_amount || 0) - totalAllocated;

        return {
          ...source,
          allocations: allocations.map((alloc) => ({
            ...alloc,
            envelope_name: alloc.envelope?.name || "Unknown",
            envelope_priority: alloc.envelope?.priority || "discretionary",
          })),
          total_allocated: totalAllocated,
          surplus,
        };
      })
    );

    return NextResponse.json(sourcesWithAllocations);
  } catch (error) {
    console.error("Error in income sources route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, pay_cycle, typical_amount, detection_pattern, allocations } = body;

    // Create transaction rule if detection pattern provided
    let detectionRuleId = null;
    if (detection_pattern) {
      const { data: rule, error: ruleError } = await supabase
        .from("transaction_rules")
        .insert({
          user_id: user.id,
          merchant_normalized: detection_pattern.toUpperCase(),
          pattern: detection_pattern,
          match_type: "contains",
          case_sensitive: false,
          is_active: true,
        })
        .select()
        .single();

      if (ruleError) {
        console.error("Error creating detection rule:", ruleError);
      } else {
        detectionRuleId = rule.id;
      }
    }

    // Create income source
    const { data: incomeSource, error: incomeError } = await supabase
      .from("income_sources")
      .insert({
        user_id: user.id,
        name,
        pay_cycle,
        typical_amount,
        detection_rule_id: detectionRuleId,
        auto_allocate: true,
        is_active: true,
      })
      .select()
      .single();

    if (incomeError) {
      console.error("Error creating income source:", incomeError);
      return NextResponse.json(
        { error: "Failed to create income source" },
        { status: 500 }
      );
    }

    // Create envelope allocations
    if (allocations && allocations.length > 0) {
      const allocationRecords = allocations.map((alloc: any, index: number) => ({
        user_id: user.id,
        envelope_id: alloc.envelope_id,
        income_source_id: incomeSource.id,
        allocation_amount: alloc.amount,
        priority: index + 1,
      }));

      const { error: allocError } = await supabase
        .from("envelope_income_allocations")
        .insert(allocationRecords);

      if (allocError) {
        console.error("Error creating allocations:", allocError);
        return NextResponse.json(
          { error: "Failed to create allocations" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(incomeSource);
  } catch (error) {
    console.error("Error creating income source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
