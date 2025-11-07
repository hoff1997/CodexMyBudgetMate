import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculatePaydayAllocation, calculateInitialDistribution } from "@/lib/planner/payday";
import type { Envelope, PayCycle } from "@/lib/planner/types";

/**
 * GET /api/planner/payday?amount=4200
 * Calculate how to allocate a paycheck
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pay amount from query params
    const searchParams = request.nextUrl.searchParams;
    const payAmountParam = searchParams.get("amount");

    if (!payAmountParam) {
      return NextResponse.json(
        { error: "Pay amount is required (query param: amount)" },
        { status: 400 }
      );
    }

    const payAmount = parseFloat(payAmountParam);

    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: "Invalid pay amount" }, { status: 400 });
    }

    // Get user's pay cycle
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", session.user.id)
      .maybeSingle();

    const payCycle: PayCycle = (profile?.pay_cycle as PayCycle) || "fortnightly";

    // Get all envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select(
        "id, name, envelope_type, priority, target_amount, annual_amount, pay_cycle_amount, current_amount, frequency, next_payment_due, category_id"
      )
      .eq("user_id", session.user.id)
      .order("name");

    if (envelopesError) {
      return NextResponse.json({ error: envelopesError.message }, { status: 400 });
    }

    const typedEnvelopes = (envelopes || []) as Envelope[];

    // Calculate payday allocation
    const allocation = calculatePaydayAllocation(payAmount, typedEnvelopes, payCycle);

    return NextResponse.json(allocation);
  } catch (error) {
    console.error("Error in payday endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/planner/payday
 * Body: { type: "initial", currentBalance: 5000 }
 * Calculate initial distribution for startup wizard
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, currentBalance } = body;

    if (type !== "initial") {
      return NextResponse.json(
        { error: "Invalid type. Only 'initial' is supported for POST" },
        { status: 400 }
      );
    }

    if (typeof currentBalance !== "number" || currentBalance < 0) {
      return NextResponse.json({ error: "Invalid current balance" }, { status: 400 });
    }

    // Get user's pay cycle
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", session.user.id)
      .maybeSingle();

    const payCycle: PayCycle = (profile?.pay_cycle as PayCycle) || "fortnightly";

    // Get all envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select(
        "id, name, envelope_type, priority, target_amount, annual_amount, pay_cycle_amount, current_amount, frequency, next_payment_due, category_id"
      )
      .eq("user_id", session.user.id)
      .order("name");

    if (envelopesError) {
      return NextResponse.json({ error: envelopesError.message }, { status: 400 });
    }

    const typedEnvelopes = (envelopes || []) as Envelope[];

    // Calculate initial distribution
    const distribution = calculateInitialDistribution(currentBalance, typedEnvelopes, payCycle);

    return NextResponse.json(distribution);
  } catch (error) {
    console.error("Error in payday endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
