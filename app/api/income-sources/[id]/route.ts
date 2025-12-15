import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateIncomeSourceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  pay_cycle: z.enum(["weekly", "fortnightly", "monthly"]).optional(),
  typical_amount: z.number().min(0).optional().nullable(),
  next_pay_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  replaced_by_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { data: incomeSource, error } = await supabase
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
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching income source:", error);
      return NextResponse.json(
        { error: "Income source not found" },
        { status: 404 }
      );
    }

    // Fetch allocations for this income source
    const { data: allocations, error: allocError } = await supabase
      .from("envelope_income_allocations")
      .select(`
        *,
        envelope:envelopes(id, name, priority, current_amount)
      `)
      .eq("income_source_id", id)
      .order("priority");

    if (allocError) {
      console.error("Error fetching allocations:", allocError);
    }

    const totalAllocated = (allocations || []).reduce(
      (sum, alloc) => sum + Number(alloc.allocation_amount),
      0
    );

    return NextResponse.json({
      ...incomeSource,
      allocations: (allocations || []).map((alloc) => ({
        ...alloc,
        envelope_name: alloc.envelope?.name || "Unknown",
        envelope_priority: alloc.envelope?.priority || "discretionary",
      })),
      total_allocated: totalAllocated,
      surplus: (incomeSource.typical_amount || 0) - totalAllocated,
    });
  } catch (error) {
    console.error("Error in income source route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateIncomeSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updateData.name = data.name;
    if (data.pay_cycle !== undefined) updateData.pay_cycle = data.pay_cycle;
    if (data.typical_amount !== undefined) updateData.typical_amount = data.typical_amount;
    if (data.next_pay_date !== undefined) updateData.next_pay_date = data.next_pay_date;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.end_date !== undefined) updateData.end_date = data.end_date;
    if (data.replaced_by_id !== undefined) updateData.replaced_by_id = data.replaced_by_id;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: incomeSource, error } = await supabase
      .from("income_sources")
      .update(updateData)
      .eq("id", id)
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

    if (error) {
      console.error("Error updating income source:", error);
      return NextResponse.json(
        { error: "Failed to update income source" },
        { status: 500 }
      );
    }

    return NextResponse.json({ income: incomeSource });
  } catch (error) {
    console.error("Error in income source update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    // Check if income source exists and belongs to user
    const { data: existing, error: checkError } = await supabase
      .from("income_sources")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: "Income source not found" },
        { status: 404 }
      );
    }

    // Delete associated envelope allocations first (cascade should handle this, but explicit is safer)
    const { error: allocDeleteError } = await supabase
      .from("envelope_income_allocations")
      .delete()
      .eq("income_source_id", id);

    if (allocDeleteError) {
      console.error("Error deleting allocations:", allocDeleteError);
    }

    // Delete the income source
    const { error: deleteError } = await supabase
      .from("income_sources")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting income source:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete income source" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: existing.name });
  } catch (error) {
    console.error("Error in income source delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
