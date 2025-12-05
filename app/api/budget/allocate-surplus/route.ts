import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  surplusAmount: z.number().positive(),
  incomeSources: z.array(z.object({
    id: z.string().uuid(),
    amount: z.number().nonnegative(),
  })),
});

/**
 * POST /api/budget/allocate-surplus
 * Allocates unallocated funds to the Surplus envelope
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  const { surplusAmount, incomeSources } = parsed.data;

  // Validate surplus amount matches total of income source amounts
  const totalIncomeAmount = incomeSources.reduce((sum, source) => sum + source.amount, 0);
  if (Math.abs(totalIncomeAmount - surplusAmount) > 0.01) {
    return NextResponse.json({
      error: "Surplus amount does not match income source amounts",
      surplus: surplusAmount,
      total: totalIncomeAmount,
    }, { status: 400 });
  }

  // Find Surplus envelope
  const { data: surplusEnvelope, error: surplusError } = await supabase
    .from("envelopes")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Surplus")
    .eq("is_system_envelope", true)
    .maybeSingle();

  if (surplusError) {
    return NextResponse.json({ error: surplusError.message }, { status: 400 });
  }

  if (!surplusEnvelope) {
    return NextResponse.json({ error: "Surplus envelope not found" }, { status: 404 });
  }

  // Get existing allocations for Surplus envelope
  const { data: existingAllocations } = await supabase
    .from("envelope_income_allocations")
    .select("income_source_id, allocation_amount")
    .eq("envelope_id", surplusEnvelope.id)
    .eq("user_id", user.id);

  // Create a map of existing allocations
  const existingMap = new Map(
    (existingAllocations || []).map(alloc => [alloc.income_source_id, alloc.allocation_amount])
  );

  // Calculate new allocations (add surplus to existing amounts)
  const newAllocations = incomeSources.map((source, index) => {
    const existingAmount = existingMap.get(source.id) || 0;
    const newAmount = existingAmount + source.amount;

    return {
      user_id: user.id,
      envelope_id: surplusEnvelope.id,
      income_source_id: source.id,
      allocation_amount: newAmount,
      priority: index + 1,
    };
  }).filter(alloc => alloc.allocation_amount > 0);

  // Delete existing allocations for Surplus envelope
  const { error: deleteError } = await supabase
    .from("envelope_income_allocations")
    .delete()
    .eq("envelope_id", surplusEnvelope.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  // Insert new allocations
  if (newAllocations.length > 0) {
    const { error: insertError } = await supabase
      .from("envelope_income_allocations")
      .insert(newAllocations);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    allocated: surplusAmount,
    envelopeId: surplusEnvelope.id,
    allocationsCount: newAllocations.length,
  });
}
