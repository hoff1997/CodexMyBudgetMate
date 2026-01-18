import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

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
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("assets")
    .select(listColumns.join(", "))
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch assets");
  }

  return NextResponse.json({ assets: data ?? [] });
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
  const parsed = createSchema.safeParse({
    ...body,
    currentValue:
      typeof body.currentValue === "string" ? Number(body.currentValue) : body.currentValue,
  });

  if (!parsed.success) {
    return createValidationError("Invalid payload");
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
    return createErrorResponse(error, 400, "Failed to create asset");
  }

  return NextResponse.json({ asset: inserted }, { status: 201 });
}
