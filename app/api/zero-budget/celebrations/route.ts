import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  achievedAt: z.string().datetime().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ celebrations: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("zero_budget_celebrations")
    .select("id, title, description, achieved_at")
    .eq("user_id", session.user.id)
    .order("achieved_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = parsed.data;
  const achievedAt = payload.achievedAt ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("zero_budget_celebrations")
    .insert({
      user_id: session.user.id,
      title: payload.title,
      description: payload.description ?? null,
      achieved_at: achievedAt,
    })
    .select("id, title, description, achieved_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to save celebration" },
      { status: 400 },
    );
  }

  return NextResponse.json({ celebration: data }, { status: 201 });
}
