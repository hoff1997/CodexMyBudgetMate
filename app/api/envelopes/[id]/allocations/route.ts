import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const allocationSchema = z.object({
  income_source_id: z.string().uuid(),
  amount: z.number().nonnegative(),
});

const schema = z.object({
  allocations: z.array(allocationSchema),
});

/**
 * GET /api/envelopes/[id]/allocations
 * Fetch income allocations for a specific envelope
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("envelope_income_allocations")
    .select("*")
    .eq("envelope_id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch allocations");
  }

  return NextResponse.json(data || []);
}

/**
 * POST /api/envelopes/[id]/allocations
 * Bulk update income allocations for an envelope
 * Replaces all existing allocations with the provided ones
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return createValidationError("Invalid payload");
  }

  const { allocations } = parsed.data;

  // Verify envelope belongs to user
  const { data: envelope, error: envelopeError } = await supabase
    .from("envelopes")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (envelopeError || !envelope) {
    return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
  }

  // Delete existing allocations for this envelope
  const { error: deleteError } = await supabase
    .from("envelope_income_allocations")
    .delete()
    .eq("envelope_id", params.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return createErrorResponse(deleteError, 400, "Failed to update allocations");
  }

  // Insert new allocations (only if amount > 0)
  const nonZeroAllocations = allocations.filter(alloc => alloc.amount > 0);

  if (nonZeroAllocations.length > 0) {
    const { error: insertError } = await supabase
      .from("envelope_income_allocations")
      .insert(
        nonZeroAllocations.map((alloc, index) => ({
          user_id: user.id,
          envelope_id: params.id,
          income_source_id: alloc.income_source_id,
          allocation_amount: alloc.amount,
          priority: index + 1, // Sequential priority
        }))
      );

    if (insertError) {
      return createErrorResponse(insertError, 400, "Failed to save allocations");
    }
  }

  // Check for budget-related achievements (non-blocking)
  try {
    // Get all income sources
    const { data: incomeSources } = await supabase
      .from("income_sources")
      .select("id, pay_amount")
      .eq("user_id", user.id);

    // Get all allocations
    const { data: allAllocations } = await supabase
      .from("envelope_income_allocations")
      .select("income_source_id, allocation_amount")
      .eq("user_id", user.id);

    if (incomeSources && allAllocations) {
      // Calculate total income and total allocated per income source
      const totalIncome = incomeSources.reduce((sum, src) => sum + (src.pay_amount || 0), 0);
      const totalAllocated = allAllocations.reduce((sum, alloc) => sum + (alloc.allocation_amount || 0), 0);

      // If allocations are at least 95% of income, award zero_budget_achieved
      if (totalIncome > 0 && totalAllocated >= totalIncome * 0.95) {
        await supabase
          .from("achievements")
          .upsert(
            {
              user_id: user.id,
              achievement_key: "zero_budget_achieved",
              achieved_at: new Date().toISOString(),
              metadata: { totalIncome, totalAllocated },
            },
            { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
          );
      }

      // If allocations are 100% of income, award first_budget_complete
      if (totalIncome > 0 && totalAllocated >= totalIncome) {
        await supabase
          .from("achievements")
          .upsert(
            {
              user_id: user.id,
              achievement_key: "first_budget_complete",
              achieved_at: new Date().toISOString(),
              metadata: { totalIncome, totalAllocated },
            },
            { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
          );
      }
    }
  } catch (achievementError) {
    console.warn("Achievement check failed (non-critical):", achievementError);
  }

  return NextResponse.json({ ok: true, count: nonZeroAllocations.length });
}

/**
 * PATCH /api/envelopes/[id]/allocations
 * Update a single allocation for an income source
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const { income_source_id, amount } = body;

  if (!income_source_id || typeof amount !== 'number') {
    return createValidationError("Invalid payload");
  }

  // If amount is 0 or negative, delete the allocation
  if (amount <= 0) {
    const { error } = await supabase
      .from("envelope_income_allocations")
      .delete()
      .eq("envelope_id", params.id)
      .eq("income_source_id", income_source_id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResponse(error, 400, "Failed to delete allocation");
    }

    return NextResponse.json({ ok: true, deleted: true });
  }

  // Upsert the allocation
  const { error } = await supabase
    .from("envelope_income_allocations")
    .upsert(
      {
        user_id: user.id,
        envelope_id: params.id,
        income_source_id,
        allocation_amount: amount,
        priority: 1,
      },
      {
        onConflict: 'envelope_id,income_source_id',
      }
    );

  if (error) {
    return createErrorResponse(error, 400, "Failed to update allocation");
  }

  return NextResponse.json({ ok: true });
}
