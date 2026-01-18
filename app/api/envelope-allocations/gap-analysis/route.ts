import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  calculateEnvelopeGap,
  calculateIdealAllocationMultiIncome,
  type PayCycle,
} from "@/lib/utils/ideal-allocation-calculator";
import {
  createErrorResponse,
  createUnauthorizedError,
} from "@/lib/utils/api-error";

/**
 * GET /api/envelope-allocations/gap-analysis
 *
 * Calculate gap analysis for all user envelopes.
 * Shows expected balance vs actual balance with status indicators.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  try {
    // Get user's primary pay cycle
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", user.id)
      .single();

    const userPayCycle = (profile?.pay_cycle as PayCycle) || 'fortnightly';

    // Get all envelopes with their allocations
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select(`
        id,
        name,
        target_amount,
        frequency,
        current_amount,
        opening_balance,
        bill_cycle_start_date,
        due_date
      `)
      .eq("user_id", user.id)
      .eq("is_goal", false)
      .eq("is_spending", false)
      .eq("is_tracking_only", false);

    if (envelopesError) {
      throw envelopesError;
    }

    // Get all income allocations
    const { data: allocations, error: allocationsError } = await supabase
      .from("envelope_income_allocations")
      .select(`
        envelope_id,
        income_source_id,
        allocation_amount,
        allocation_locked,
        locked_at,
        income_sources (
          pay_cycle
        )
      `)
      .eq("user_id", user.id);

    if (allocationsError) {
      throw allocationsError;
    }

    const currentDate = new Date();
    const gaps = [];

    for (const envelope of envelopes || []) {
      // Get allocations for this envelope
      const envelopeAllocations = (allocations || []).filter(
        (a: any) => a.envelope_id === envelope.id
      );

      if (envelopeAllocations.length === 0) {
        // No allocations - skip gap analysis
        continue;
      }

      // Calculate ideal per-pay from multi-income sources
      const incomeAllocs = envelopeAllocations.map((a: any) => ({
        income_source_id: a.income_source_id,
        allocation_amount: a.allocation_amount,
        pay_cycle: a.income_sources?.pay_cycle || 'fortnightly',
      }));

      const idealPerPay = calculateIdealAllocationMultiIncome(incomeAllocs, userPayCycle);

      // Calculate gap if we have a bill cycle start date
      if (envelope.bill_cycle_start_date) {
        const billCycleStart = new Date(envelope.bill_cycle_start_date);

        const gapData = calculateEnvelopeGap(
          {
            current_amount: envelope.current_amount,
            opening_balance: envelope.opening_balance,
          },
          idealPerPay,
          billCycleStart,
          currentDate,
          userPayCycle
        );

        gaps.push({
          envelope_id: envelope.id,
          envelope_name: envelope.name,
          ideal_per_pay: idealPerPay,
          ...gapData,
          is_locked: envelopeAllocations.some((a: any) => a.allocation_locked),
        });
      } else {
        // No bill cycle start date - just show current vs ideal
        gaps.push({
          envelope_id: envelope.id,
          envelope_name: envelope.name,
          ideal_per_pay: idealPerPay,
          expected_balance: 0,
          actual_balance: (envelope.current_amount || 0) + (envelope.opening_balance || 0),
          gap: 0,
          payCyclesElapsed: 0,
          status: 'on_track',
          is_locked: envelopeAllocations.some((a: any) => a.allocation_locked),
        });
      }
    }

    return NextResponse.json({
      user_pay_cycle: userPayCycle,
      current_date: currentDate.toISOString(),
      gaps,
    });

  } catch (error: unknown) {
    console.error("Error calculating gap analysis:", error);
    return createErrorResponse(
      error as { message: string; code?: string },
      500,
      "Failed to calculate gap analysis"
    );
  }
}
