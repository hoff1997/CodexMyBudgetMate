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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!params.id) {
    return NextResponse.json({ error: "Missing feature request id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = featureRequestUpdateSchema.safeParse({
    ...body,
    status: normaliseStatus(body.status),
  });

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Feature request not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!params.id) {
    return NextResponse.json({ error: "Missing feature request id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("feature_requests")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
