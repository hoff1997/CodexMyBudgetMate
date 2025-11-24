import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("envelope_income_allocations")
    .select("*")
    .eq("envelope_id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
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
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
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
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
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
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { income_source_id, amount } = body;

  if (!income_source_id || typeof amount !== 'number') {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
