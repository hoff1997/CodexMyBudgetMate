import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  KidIncomeSource,
  CreateKidIncomeSourceRequest,
} from "@/lib/types/kids-invoice";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET /api/kids/[childId]/income-sources - Get all income sources for a child
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get income sources
  const { data: incomeSources, error } = await supabase
    .from("kid_income_sources")
    .select("*")
    .eq("child_profile_id", childId)
    .order("created_at", { ascending: false });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch income sources");
  }

  return NextResponse.json({
    childId,
    childName: child.name,
    incomeSources: incomeSources as KidIncomeSource[],
  });
}

// POST /api/kids/[childId]/income-sources - Create a new income source
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
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

  const body: CreateKidIncomeSourceRequest = await request.json();

  // Validate required fields
  if (!body.amount || body.amount <= 0) {
    return createValidationError("Amount is required and must be positive");
  }

  if (!body.frequency) {
    return createValidationError("Frequency is required");
  }

  // Create income source
  const { data: incomeSource, error } = await supabase
    .from("kid_income_sources")
    .insert({
      child_profile_id: childId,
      name: body.name || "Weekly Pocket Money",
      amount: body.amount,
      frequency: body.frequency,
      next_pay_date: body.next_pay_date || null,
      arrival_day: body.arrival_day || null,
      bank_transfer_confirmed: body.bank_transfer_confirmed || false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create income source");
  }

  return NextResponse.json({
    success: true,
    incomeSource: incomeSource as KidIncomeSource,
  });
}
