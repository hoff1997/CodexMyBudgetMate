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

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
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
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query.returns<DbFeatureRequest[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = featureRequestCreateSchema.safeParse({
    ...body,
    status: normaliseStatus(body.status),
  });

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("feature_requests")
    .insert({
      user_id: session.user.id,
      title: payload.title,
      description: payload.description ? payload.description : null,
      status: payload.status,
    })
    .select(FEATURE_REQUEST_SELECT_COLUMNS.join(", "))
    .returns<DbFeatureRequest>()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to create feature request" }, { status: 500 });
  }

  return NextResponse.json({ request: mapFeatureRequestRow(data) }, { status: 201 });
}
