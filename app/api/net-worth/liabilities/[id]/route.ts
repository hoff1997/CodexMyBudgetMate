import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    liabilityType: z.string().min(1).optional(),
    currentBalance: z.number().nonnegative().optional(),
    interestRate: z.number().optional(),
    notes: z.string().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const normalised: Record<string, unknown> = { ...body };
  if (normalised.currentBalance !== undefined) {
    normalised.currentBalance =
      typeof normalised.currentBalance === "string"
        ? Number(normalised.currentBalance)
        : normalised.currentBalance;
  }
  if (normalised.interestRate !== undefined) {
    normalised.interestRate =
      typeof normalised.interestRate === "string"
        ? Number(normalised.interestRate)
        : normalised.interestRate;
  }

  const parsed = updateSchema.safeParse(normalised);
  if (!parsed.success) {
    return createValidationError(
      parsed.error.flatten().formErrors[0] ?? "Invalid payload"
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.liabilityType !== undefined) updates.liability_type = parsed.data.liabilityType;
  if (parsed.data.currentBalance !== undefined)
    updates.current_balance = parsed.data.currentBalance;
  if (parsed.data.interestRate !== undefined)
    updates.interest_rate = parsed.data.interestRate ?? 0;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("liabilities")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update liability");
  }

  if (!data) {
    return NextResponse.json({ error: "Liability not found" }, { status: 404 });
  }

  return NextResponse.json({ liability: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error, count } = await supabase
    .from("liabilities")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete liability");
  }

  if (!count) {
    return NextResponse.json({ error: "Liability not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
