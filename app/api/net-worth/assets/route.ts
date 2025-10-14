import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  assetType: z.string().min(1),
  currentValue: z.number().nonnegative(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse({
    ...body,
    currentValue: typeof body.currentValue === "string" ? Number(body.currentValue) : body.currentValue,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("assets")
    .insert({
      user_id: session.user.id,
      name: parsed.data.name,
      asset_type: parsed.data.assetType,
      current_value: parsed.data.currentValue,
      notes: parsed.data.notes ?? null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
