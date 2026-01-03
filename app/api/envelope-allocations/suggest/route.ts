import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  calculateIdealAllocation,
  calculateIdealAllocationMultiIncome,
  getCyclesPerYear,
  type PayCycle,
  type BillFrequency
} from "@/lib/utils/ideal-allocation-calculator";

/**
 * POST /api/envelope-allocations/suggest
 *
 * Generate ideal allocation suggestions for all user envelopes
 * based on their target amounts, frequencies, and income sources.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    // Get user's primary pay cycle from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", user.id)
      .single();

    const userPayCycle = (profile?.pay_cycle as PayCycle) || 'fortnightly';

    // Get all user's envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select("id, name, target_amount, frequency")
      .eq("user_id", user.id)
      .eq("is_goal", false) // Skip goal envelopes
      .eq("is_spending", false) // Skip spending envelopes
      .eq("is_tracking_only", false); // Skip tracking-only envelopes

    if (envelopesError) {
      throw envelopesError;
    }

    // Get all income sources
    const { data: incomeSources, error: incomeError } = await supabase
      .from("income_sources")
      .select("id, name, typical_amount, pay_cycle")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (incomeError) {
      throw incomeError;
    }

    if (!incomeSources || incomeSources.length === 0) {
      return NextResponse.json({
        error: "No income sources found. Please add income sources first."
      }, { status: 400 });
    }

    // Calculate total income per user's pay cycle
    let totalIncomePerCycle = 0;
    for (const income of incomeSources) {
      const sourceCyclesPerYear = getCyclesPerYear(income.pay_cycle as PayCycle);
      const userCyclesPerYear = getCyclesPerYear(userPayCycle);
      const annualIncome = (income.typical_amount || 0) * sourceCyclesPerYear;
      const incomePerUserCycle = annualIncome / userCyclesPerYear;
      totalIncomePerCycle += incomePerUserCycle;
    }

    // Calculate suggestions for each envelope
    const suggestions = [];

    for (const envelope of envelopes || []) {
      // Calculate ideal per-pay allocation
      const idealPerPay = calculateIdealAllocation(
        {
          target_amount: envelope.target_amount || 0,
          frequency: envelope.frequency as BillFrequency,
        },
        userPayCycle
      );

      // Calculate proportional distribution across income sources
      const incomeAllocations: Record<string, number> = {};

      for (const income of incomeSources) {
        // Calculate this income source's percentage of total income
        const sourceCyclesPerYear = getCyclesPerYear(income.pay_cycle as PayCycle);
        const userCyclesPerYear = getCyclesPerYear(userPayCycle);
        const annualIncome = (income.typical_amount || 0) * sourceCyclesPerYear;
        const incomePerUserCycle = annualIncome / userCyclesPerYear;
        const percentage = incomePerUserCycle / totalIncomePerCycle;

        // Allocate proportionally
        const allocation = idealPerPay * percentage;
        incomeAllocations[income.id] = Math.round(allocation * 100) / 100;
      }

      suggestions.push({
        envelope_id: envelope.id,
        envelope_name: envelope.name,
        ideal_per_pay: idealPerPay,
        income_allocations: incomeAllocations,
      });
    }

    return NextResponse.json({
      user_pay_cycle: userPayCycle,
      total_income_per_cycle: Math.round(totalIncomePerCycle * 100) / 100,
      income_sources: incomeSources.map(i => ({
        id: i.id,
        name: i.name,
        typical_amount: i.typical_amount,
        pay_cycle: i.pay_cycle,
      })),
      suggestions,
    });

  } catch (error: any) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
