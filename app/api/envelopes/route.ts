import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const frequencySchema = z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annually", "none"]).optional();
const envelopeTypeSchema = z.enum(["income", "expense"]).optional();
const subtypeSchema = z.enum(["bill", "spending", "savings", "goal"]).optional();
const prioritySchema = z.enum(["essential", "important", "discretionary"]).optional();
const goalTypeSchema = z.enum(["savings", "debt_payoff", "purchase", "emergency_fund", "other"]).optional();

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().min(1).optional(),
  envelopeType: envelopeTypeSchema,
  subtype: subtypeSchema,
  priority: prioritySchema,
  targetAmount: z.number().nonnegative().default(0),
  payCycleAmount: z.number().nonnegative().default(0),
  frequency: frequencySchema,
  nextDue: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().max(2000).optional(),
  icon: z.string().max(10).optional(),
  isSpending: z.boolean().optional(),
  // Goal-specific fields
  isGoal: z.boolean().optional(),
  goalType: goalTypeSchema,
  goalTargetDate: z.string().optional(),
  interestRate: z.number().nonnegative().optional(), // For debt payoff goals
}).superRefine((data, ctx) => {
  // Validate bill-specific requirements
  if (data.subtype === 'bill') {
    if (!data.frequency || data.frequency === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bills must have a frequency',
        path: ['frequency'],
      });
    }
  }
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("envelopes")
    .select("id, name, envelope_type, subtype, priority, target_amount, annual_amount, pay_cycle_amount, opening_balance, current_amount, frequency, next_payment_due, notes, icon, is_spending, category_id, is_goal, goal_type, goal_target_date, goal_completed_at, interest_rate")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data || []);
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
      .eq("user_id", user.id)
      .ilike("name", payload.categoryName)
      .maybeSingle();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: categoryInsert, error: categoryError } = await supabase
        .from("envelope_categories")
        .insert({ user_id: user.id, name: payload.categoryName })
        .select("id")
        .maybeSingle();

      if (categoryError) {
        return NextResponse.json({ error: categoryError.message }, { status: 400 });
      }
      categoryId = categoryInsert?.id ?? undefined;
    }
  }

  const { error } = await supabase.from("envelopes").insert({
    user_id: user.id,
    name: payload.name,
    category_id: categoryId,
    envelope_type: payload.envelopeType ?? 'expense',
    subtype: payload.subtype ?? 'bill',
    priority: payload.priority ?? 'important',
    target_amount: payload.targetAmount,
    pay_cycle_amount: payload.payCycleAmount,
    frequency: payload.frequency ?? null,
    next_payment_due: payload.nextDue ?? null,
    opening_balance: payload.openingBalance,
    current_amount: payload.openingBalance,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    icon: payload.icon ?? null,
    is_spending: payload.isSpending ?? false,
    // Goal-specific fields
    is_goal: payload.isGoal ?? false,
    goal_type: payload.goalType ?? null,
    goal_target_date: payload.goalTargetDate ?? null,
    interest_rate: payload.interestRate ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
