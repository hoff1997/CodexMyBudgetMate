"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FeatureRequestStatus } from "@/lib/types/feature-request";
import {
  FEATURE_REQUEST_SELECT_COLUMNS,
  featureRequestCreateSchema,
  isFeatureRequestStatus,
  mapFeatureRequestRow,
  normaliseStatus,
  type DbFeatureRequest,
} from "@/lib/server/feature-requests";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const url = new URL(request.url);
  const rawSearch = url.searchParams.get("search") ?? "";
  const rawStatuses = url.searchParams.get("status") ?? "";

  const statuses = rawStatuses
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is FeatureRequestStatus => isFeatureRequestStatus(value));

  let query = supabase
    .from("feature_requests")
    .select(FEATURE_REQUEST_SELECT_COLUMNS.join(", "))
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query.returns<DbFeatureRequest[]>();

  if (error) {
    return createErrorResponse(error, 400, "Unable to fetch feature requests");
  }

  const requests = (data ?? []).map(mapFeatureRequestRow);

  const search = rawSearch.trim().toLowerCase();
  const filtered = search
    ? requests.filter((request) => {
        const titleMatch = request.title.toLowerCase().includes(search);
        const descriptionMatch = (request.description ?? "").toLowerCase().includes(search);
        return titleMatch || descriptionMatch;
      })
    : requests;

  return NextResponse.json({ requests: filtered });
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
  const parsed = featureRequestCreateSchema.safeParse({
    ...body,
    status: normaliseStatus(body.status),
  });

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid payload";
    return createValidationError(message);
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("feature_requests")
    .insert({
      user_id: user.id,
      title: payload.title,
      description: payload.description ? payload.description : null,
      status: payload.status,
    })
    .select(FEATURE_REQUEST_SELECT_COLUMNS.join(", "))
    .returns<DbFeatureRequest>()
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Unable to create feature request");
  }

  if (!data) {
    return createErrorResponse(null, 500, "Unable to create feature request");
  }

  return NextResponse.json({ request: mapFeatureRequestRow(data) }, { status: 201 });
}
