"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FEATURE_REQUEST_SELECT_COLUMNS,
  featureRequestUpdateSchema,
  mapFeatureRequestRow,
  normaliseStatus,
  type DbFeatureRequest,
} from "@/lib/server/feature-requests";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
  createNotFoundError,
} from "@/lib/utils/api-error";

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

  if (!params.id) {
    return createValidationError("Missing feature request id");
  }

  const body = await request.json();
  const parsed = featureRequestUpdateSchema.safeParse({
    ...body,
    status: normaliseStatus(body.status),
  });

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid payload";
    return createValidationError(message);
  }

  const payload = parsed.data;

  const updates: Partial<{
    title: string;
    description: string | null;
    status: string;
  }> = {};

  if (payload.title !== undefined) {
    updates.title = payload.title;
  }
  if (payload.description !== undefined) {
    updates.description = payload.description.length ? payload.description : null;
  }
  if (payload.status !== undefined) {
    updates.status = payload.status;
  }

  const { data, error } = await supabase
    .from("feature_requests")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(FEATURE_REQUEST_SELECT_COLUMNS.join(", "))
    .returns<DbFeatureRequest>()
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Unable to update feature request");
  }

  if (!data) {
    return createNotFoundError("Feature request");
  }

  return NextResponse.json({ request: mapFeatureRequestRow(data) });
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

  if (!params.id) {
    return createValidationError("Missing feature request id");
  }

  const { error } = await supabase
    .from("feature_requests")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Unable to delete feature request");
  }

  return NextResponse.json({ ok: true });
}
