import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  KidIncomeSource,
  UpdateKidIncomeSourceRequest,
} from "@/lib/types/kids-invoice";

interface RouteContext {
  params: Promise<{ childId: string; incomeId: string }>;
}

// GET /api/kids/[childId]/income-sources/[incomeId] - Get a specific income source
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, incomeId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get income source
  const { data: incomeSource, error } = await supabase
    .from("kid_income_sources")
    .select("*")
    .eq("id", incomeId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!incomeSource) {
    return NextResponse.json(
      { error: "Income source not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    incomeSource: incomeSource as KidIncomeSource,
  });
}

// PATCH /api/kids/[childId]/income-sources/[incomeId] - Update an income source
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, incomeId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Verify income source exists and belongs to child
  const { data: existing } = await supabase
    .from("kid_income_sources")
    .select("id")
    .eq("id", incomeId)
    .eq("child_profile_id", childId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Income source not found" },
      { status: 404 }
    );
  }

  const body: UpdateKidIncomeSourceRequest = await request.json();

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.amount !== undefined) {
    if (body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }
    updateData.amount = body.amount;
  }
  if (body.frequency !== undefined) updateData.frequency = body.frequency;
  if (body.next_pay_date !== undefined) updateData.next_pay_date = body.next_pay_date;
  if (body.arrival_day !== undefined) updateData.arrival_day = body.arrival_day;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.bank_transfer_confirmed !== undefined) {
    updateData.bank_transfer_confirmed = body.bank_transfer_confirmed;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Update income source
  const { data: incomeSource, error } = await supabase
    .from("kid_income_sources")
    .update(updateData)
    .eq("id", incomeId)
    .eq("child_profile_id", childId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    incomeSource: incomeSource as KidIncomeSource,
  });
}

// DELETE /api/kids/[childId]/income-sources/[incomeId] - Delete an income source
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId, incomeId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Delete income source
  const { error } = await supabase
    .from("kid_income_sources")
    .delete()
    .eq("id", incomeId)
    .eq("child_profile_id", childId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
