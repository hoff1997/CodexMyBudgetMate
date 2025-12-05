import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const allocationSchema = z.object({
  envelope_id: z.string().uuid(),
  allocations: z.array(z.object({
    income_source_id: z.string().uuid(),
    allocation_amount: z.number().min(0),
  })),
});

/**
 * GET /api/envelope-income-allocations
 * Fetch ALL income allocations for the current user
 * Returns data structured by envelope_id for easy lookup
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Fetch all allocations for this user
  const { data, error } = await supabase
    .from("envelope_income_allocations")
    .select("envelope_id, income_source_id, allocation_amount")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Structure data as: { [envelopeId]: { [incomeSourceId]: amount } }
  const structured: Record<string, Record<string, number>> = {};

  (data || []).forEach((allocation: any) => {
    if (!structured[allocation.envelope_id]) {
      structured[allocation.envelope_id] = {};
    }
    structured[allocation.envelope_id][allocation.income_source_id] =
      Number(allocation.allocation_amount || 0);
  });

  return NextResponse.json(structured);
}

/**
 * POST /api/envelope-income-allocations
 * Create or update income allocations for an envelope
 * Replaces all existing allocations for the given envelope
 */
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
    const parsed = allocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { envelope_id, allocations } = parsed.data;

    // First, delete existing allocations for this envelope
    const { error: deleteError } = await supabase
      .from("envelope_income_allocations")
      .delete()
      .eq("user_id", user.id)
      .eq("envelope_id", envelope_id);

    if (deleteError) {
      console.error("Error deleting existing allocations:", deleteError);
      return NextResponse.json(
        { error: "Failed to update allocations" },
        { status: 500 }
      );
    }

    // Insert new allocations (only non-zero amounts)
    const nonZeroAllocations = allocations.filter(a => a.allocation_amount > 0);

    if (nonZeroAllocations.length > 0) {
      const records = nonZeroAllocations.map((alloc, index) => ({
        user_id: user.id,
        envelope_id,
        income_source_id: alloc.income_source_id,
        allocation_amount: alloc.allocation_amount,
        priority: index + 1,
      }));

      const { error: insertError } = await supabase
        .from("envelope_income_allocations")
        .insert(records);

      if (insertError) {
        console.error("Error inserting allocations:", insertError);
        return NextResponse.json(
          { error: "Failed to save allocations" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in envelope-income-allocations POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
