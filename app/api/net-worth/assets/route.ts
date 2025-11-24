import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().min(1),
  assetType: z.string().min(1),
  currentValue: z.number().nonnegative(),
  notes: z.string().optional(),
});

const listColumns = [
  "id",
  "name",
  "asset_type",
  "current_value",
  "notes",
  "updated_at",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("assets")
    .select(listColumns.join(", "))
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ assets: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse({
    ...body,
    currentValue:
      typeof body.currentValue === "string" ? Number(body.currentValue) : body.currentValue,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      asset_type: parsed.data.assetType,
      current_value: parsed.data.currentValue,
      notes: parsed.data.notes ?? null,
    })
    .select(listColumns.join(", "))
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ asset: inserted }, { status: 201 });
}
