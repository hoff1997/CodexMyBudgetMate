import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("labels")
    .select("id, name, colour, description, usage_count")
    .eq("user_id", user.id)
    .order("usage_count", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch labels");
  }

  return NextResponse.json({ labels: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    const message = body.error.flatten().formErrors[0] ?? "Invalid payload";
    return createValidationError(message);
  }

  const payload = body.data;

  const { data, error } = await supabase
    .from("labels")
    .insert({
      user_id: user.id,
      name: payload.name,
      colour: payload.colour ?? null,
      description: payload.description ?? null,
    })
    .select("id, name, colour, description, usage_count")
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create label");
  }

  return NextResponse.json({ label: data }, { status: 201 });
}
