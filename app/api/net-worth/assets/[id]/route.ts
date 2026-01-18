import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    assetType: z.string().min(1).optional(),
    currentValue: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

const listColumns = [
  "id",
  "name",
  "asset_type",
  "current_value",
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
  if (normalised.currentValue !== undefined) {
    normalised.currentValue =
      typeof normalised.currentValue === "string"
        ? Number(normalised.currentValue)
        : normalised.currentValue;
  }

  const parsed = updateSchema.safeParse(normalised);
  if (!parsed.success) {
    return createValidationError(
      parsed.error.flatten().formErrors[0] ?? "Invalid payload"
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.assetType !== undefined) updates.asset_type = parsed.data.assetType;
  if (parsed.data.currentValue !== undefined) updates.current_value = parsed.data.currentValue;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update asset");
  }

  if (!data) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ asset: data });
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
    .from("assets")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete asset");
  }

  if (!count) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
