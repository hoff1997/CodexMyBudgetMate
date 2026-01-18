import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  achievedAt: z.string().datetime().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ celebrations: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("zero_budget_celebrations")
    .select("id, title, description, achieved_at")
    .eq("user_id", user.id)
    .order("achieved_at", { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse(error, 400, "Unable to fetch celebrations");
  }

  return NextResponse.json({
    celebrations: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      achieved_at: row.achieved_at,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid request";
    return createValidationError(message);
  }

  const payload = parsed.data;
  const achievedAt = payload.achievedAt ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("zero_budget_celebrations")
    .insert({
      user_id: user.id,
      title: payload.title,
      description: payload.description ?? null,
      achieved_at: achievedAt,
    })
    .select("id, title, description, achieved_at")
    .maybeSingle();

  if (error || !data) {
    return createErrorResponse(error, 400, "Unable to save celebration");
  }

  return NextResponse.json({ celebration: data }, { status: 201 });
}
