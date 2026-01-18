import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["transaction", "savings", "debt", "investment", "cash", "liability"]),
  institution: z.string().optional(),
  balance: z.number().optional(),
  reconciled: z.boolean().optional(),
});

export async function GET() {
  console.log('🟢 [API /accounts] GET request received');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('🟢 [API /accounts] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    error: authError?.message
  });

  if (!user) {
    console.log('🔴 [API /accounts] Unauthorized - no user');
    return createUnauthorizedError();
  }

  // SECURITY: Select specific columns instead of "*" to prevent data exposure
  const { data: accounts, error: queryError } = await supabase
    .from("accounts")
    .select("id, name, type, institution, current_balance, reconciled, is_manual, akahu_id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (queryError) {
    return createErrorResponse(queryError, 400, "Failed to load accounts");
  }

  return NextResponse.json({ accounts: accounts || [] });
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
  const parsed = schema.safeParse({
    ...body,
    balance: typeof body.balance === "string" ? Number(body.balance) : body.balance,
  });

  if (!parsed.success) {
    return createValidationError("Invalid payload");
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      institution: parsed.data.institution,
      current_balance: parsed.data.balance ?? 0,
      reconciled: parsed.data.reconciled ?? false,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return createErrorResponse(error, 400, "Failed to create account");
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
