import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/budget/income-reality
 *
 * Returns income sources with their surplus amounts and committed totals.
 * Used by the Add Envelope dialog to show budget impact per income source.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all active income sources
  const { data: incomeSources, error: incomeError } = await supabase
    .from("income_sources")
    .select("id, name, pay_cycle, typical_amount, next_pay_date, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("typical_amount", { ascending: false });

  if (incomeError) {
    console.error("Failed to fetch income sources:", incomeError);
    return NextResponse.json({ error: incomeError.message }, { status: 400 });
  }

  if (!incomeSources || incomeSources.length === 0) {
    return NextResponse.json({
      incomes: [],
      totalSurplus: 0,
      message: "No income sources found",
    });
  }

  // Get all envelopes to calculate committed amounts
  const { data: envelopes, error: envelopesError } = await supabase
    .from("envelopes")
    .select("id, name, pay_cycle_amount, current_amount, suggestion_type, is_dismissed")
    .eq("user_id", user.id);

  if (envelopesError) {
    console.error("Failed to fetch envelopes:", envelopesError);
    return NextResponse.json({ error: envelopesError.message }, { status: 400 });
  }

  // Find surplus envelope (if exists)
  const surplusEnvelope = envelopes?.find(
    (env) => env.suggestion_type === "surplus" && !env.is_dismissed
  );

  // Calculate total committed per pay (excluding surplus)
  const totalCommittedPerPay = (envelopes || [])
    .filter((env) => env.suggestion_type !== "surplus")
    .reduce((sum, env) => sum + (env.pay_cycle_amount || 0), 0);

  // For single income, calculate surplus based on income minus committed
  // For multiple incomes, we'd need envelope_income_allocations table
  const incomeReality = incomeSources.map((income, index) => {
    const incomeAmount = income.typical_amount || 0;

    // For now, split committed amount proportionally across incomes
    // In a more advanced system, use envelope_income_allocations
    const totalIncome = incomeSources.reduce((sum, inc) => sum + (inc.typical_amount || 0), 0);
    const incomeShare = totalIncome > 0 ? incomeAmount / totalIncome : 1 / incomeSources.length;
    const committedFromThisIncome = totalCommittedPerPay * incomeShare;

    // Calculate surplus for this income
    const surplusAmount = Math.max(0, incomeAmount - committedFromThisIncome);

    return {
      id: income.id,
      name: income.name || `Income ${index + 1}`,
      payFrequency: income.pay_cycle || "fortnightly",
      nextPayDate: income.next_pay_date,
      incomeAmount,
      totalCommittedPerPay: Math.round(committedFromThisIncome * 100) / 100,
      surplusAmount: Math.round(surplusAmount * 100) / 100,
    };
  });

  // Calculate total surplus across all incomes
  const totalSurplus = incomeReality.reduce((sum, inc) => sum + inc.surplusAmount, 0);

  // If we have a surplus envelope, use its current amount instead
  const actualSurplus = surplusEnvelope?.current_amount ?? totalSurplus;

  return NextResponse.json({
    incomes: incomeReality,
    totalSurplus: Math.round(actualSurplus * 100) / 100,
    totalCommittedPerPay: Math.round(totalCommittedPerPay * 100) / 100,
    surplusEnvelopeBalance: surplusEnvelope?.current_amount ?? null,
  });
}
