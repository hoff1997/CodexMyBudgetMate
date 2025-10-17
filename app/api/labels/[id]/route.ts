import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    const message = body.error.flatten().formErrors[0] ?? "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = body.data;

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.colour !== undefined) updates.colour = payload.colour;
  if (payload.description !== undefined) updates.description = payload.description;

  const { data, error } = await supabase
    .from("labels")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .select("id, name, colour, description, usage_count")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Label not found" }, { status: 404 });
  }

  return NextResponse.json({ label: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("labels")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!count) {
    return NextResponse.json({ error: "Label not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
