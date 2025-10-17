import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  colour: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  description: z.string().trim().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("labels")
    .select("id, name, colour, description, usage_count")
    .eq("user_id", session.user.id)
    .order("usage_count", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ labels: data ?? [] });
}

export async function POST(request: Request) {
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

  const { data, error } = await supabase
    .from("labels")
    .insert({
      user_id: session.user.id,
      name: payload.name,
      colour: payload.colour ?? null,
      description: payload.description ?? null,
    })
    .select("id, name, colour, description, usage_count")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ label: data }, { status: 201 });
}
