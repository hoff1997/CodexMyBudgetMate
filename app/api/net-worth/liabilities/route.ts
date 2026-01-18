import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const createSchema = z.object({
  name: z.string().min(1),
  liabilityType: z.string().min(1),
  currentBalance: z.number().nonnegative(),
  interestRate: z.number().optional(),
  notes: z.string().optional(),
});

const listColumns = [
  "id",
  "name",
  "liability_type",
  "current_balance",
  "interest_rate",
  "notes",
  "updated_at",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("liabilities")
    .select(listColumns.join(", "))
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch liabilities");
  }

  return NextResponse.json({ liabilities: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const parsed = createSchema.safeParse({
    ...body,
    currentBalance:
      typeof body.currentBalance === "string" ? Number(body.currentBalance) : body.currentBalance,
    interestRate: typeof body.interestRate === "string" ? Number(body.interestRate) : body.interestRate,
  });

  if (!parsed.success) {
    return createValidationError("Invalid payload");
  }

  const { data: inserted, error } = await supabase
    .from("liabilities")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      liability_type: parsed.data.liabilityType,
      current_balance: parsed.data.currentBalance,
      interest_rate: parsed.data.interestRate ?? 0,
      notes: parsed.data.notes ?? null,
    })
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create liability");
  }

  return NextResponse.json({ liability: inserted }, { status: 201 });
}
