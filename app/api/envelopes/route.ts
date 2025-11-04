import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const frequencySchema = z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]).optional();

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().min(1).optional(),
  targetAmount: z.number().nonnegative().default(0),
  payCycleAmount: z.number().nonnegative().default(0),
  frequency: frequencySchema,
  nextDue: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().max(2000).optional(),
  icon: z.string().max(10).optional(),
  isSpending: z.boolean().optional(),
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  let categoryId = payload.categoryId;
  if (!categoryId && payload.categoryName) {
    const { data: existingCategory } = await supabase
      .from("envelope_categories")
      .select("id")
      .eq("user_id", session.user.id)
      .ilike("name", payload.categoryName)
      .maybeSingle();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: categoryInsert, error: categoryError } = await supabase
        .from("envelope_categories")
        .insert({ user_id: session.user.id, name: payload.categoryName })
        .select("id")
        .maybeSingle();

      if (categoryError) {
        return NextResponse.json({ error: categoryError.message }, { status: 400 });
      }
      categoryId = categoryInsert?.id ?? undefined;
    }
  }

  const { error } = await supabase.from("envelopes").insert({
    user_id: session.user.id,
    name: payload.name,
    category_id: categoryId,
    target_amount: payload.targetAmount,
    pay_cycle_amount: payload.payCycleAmount,
    frequency: payload.frequency ?? null,
    next_payment_due: payload.nextDue ?? null,
    opening_balance: payload.openingBalance,
    current_amount: payload.openingBalance,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    icon: payload.icon ?? null,
    is_spending: payload.isSpending ?? false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
