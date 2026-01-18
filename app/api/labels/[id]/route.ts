import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError, createNotFoundError } from "@/lib/utils/api-error";

const schema = z.object({
  name: z.string().min(1).optional(),
  colour: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .nullable()
    .optional(),
  description: z.string().trim().nullable().optional(),
});

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

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    const message = body.error.flatten().formErrors[0] ?? "Invalid payload";
    return createValidationError(message);
  }

  const payload = body.data;

  if (!Object.keys(payload).length) {
    return createValidationError("Nothing to update");
  }

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.colour !== undefined) updates.colour = payload.colour;
  if (payload.description !== undefined) updates.description = payload.description;

  const { data, error } = await supabase
    .from("labels")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, name, colour, description, usage_count")
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update label");
  }

  if (!data) {
    return createNotFoundError("Label");
  }

  return NextResponse.json({ label: data });
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
    .from("labels")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete label");
  }

  if (!count) {
    return createNotFoundError("Label");
  }

  return NextResponse.json({ ok: true });
}
