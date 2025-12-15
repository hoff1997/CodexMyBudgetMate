import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createIncomeSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pay_cycle: z.enum(["weekly", "fortnightly", "monthly"]),
  typical_amount: z.number().min(0).optional(),
  detection_pattern: z.string().optional(),
  next_pay_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  allocations: z.array(z.object({
    envelope_id: z.string(),
    amount: z.number(),
  })).optional(),
  // For replace flow - archive the old income and link to new one
  replace_id: z.string().uuid().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    // Fetch income sources with their allocations (including lifecycle fields)
    const { data: incomeSources, error: incomeError } = await supabase
      .from("income_sources")
      .select(`
        id,
        user_id,
        name,
        pay_cycle,
        typical_amount,
        is_active,
        next_pay_date,
        start_date,
        end_date,
        replaced_by_id,
        created_at,
        updated_at,
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
            envelope:envelopes(id, name, priority, current_amount)
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
    const parsed = createIncomeSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      name,
      pay_cycle,
      typical_amount,
      detection_pattern,
      next_pay_date,
      start_date,
      end_date,
      is_active,
      allocations,
      replace_id,
    } = parsed.data;

    // If replacing an income, archive the old one first
    let archivedIncome = null;
    if (replace_id) {
      const { data: archived, error: archiveError } = await supabase
        .from("income_sources")
        .update({
          is_active: false,
          end_date: end_date || new Date().toISOString().split("T")[0],
        })
        .eq("id", replace_id)
        .eq("user_id", user.id)
        .select(`
          id,
          user_id,
          name,
          pay_cycle,
          typical_amount,
          is_active,
          next_pay_date,
          start_date,
          end_date,
          replaced_by_id,
          created_at,
          updated_at
        `)
        .single();

      if (archiveError) {
        console.error("Error archiving old income source:", archiveError);
        return NextResponse.json(
          { error: "Failed to archive old income source" },
          { status: 500 }
        );
      }
      archivedIncome = archived;
    }

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

    // Create income source with lifecycle fields
    const { data: incomeSource, error: incomeError } = await supabase
      .from("income_sources")
      .insert({
        user_id: user.id,
        name,
        pay_cycle,
        typical_amount,
        detection_rule_id: detectionRuleId,
        auto_allocate: true,
        is_active: is_active ?? true,
        next_pay_date: next_pay_date || null,
        start_date: start_date || new Date().toISOString().split("T")[0],
        end_date: end_date || null,
      })
      .select(`
        id,
        user_id,
        name,
        pay_cycle,
        typical_amount,
        is_active,
        next_pay_date,
        start_date,
        end_date,
        replaced_by_id,
        created_at,
        updated_at
      `)
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

    // If replacing, update the old income source to point to the new one
    if (replace_id && archivedIncome) {
      const { error: linkError } = await supabase
        .from("income_sources")
        .update({ replaced_by_id: incomeSource.id })
        .eq("id", replace_id)
        .eq("user_id", user.id);

      if (linkError) {
        console.error("Error linking replaced income:", linkError);
        // Non-fatal - continue anyway
      }

      // Update the archived income in our response
      archivedIncome.replaced_by_id = incomeSource.id;
    }

    return NextResponse.json({
      income: incomeSource,
      archived: archivedIncome,
    });
  } catch (error) {
    console.error("Error creating income source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
