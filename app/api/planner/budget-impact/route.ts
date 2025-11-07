import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Envelope, PayCycle } from "@/lib/planner/types";

/**
 * POST /api/planner/budget-impact
 * Calculate the impact of adding or editing an envelope on the overall budget
 *
 * Body:
 * {
 *   action: "add" | "edit",
 *   envelopeId?: string,  // required for edit
 *   payCycleAmount: number,  // proposed pay cycle amount
 *   priority?: "essential" | "important" | "discretionary"
 * }
 *
 * Response:
 * {
 *   currentTotalRegular: number,
 *   newTotalRegular: number,
 *   difference: number,
 *   userPayAmount: number | null,  // from user's last known pay (if available)
 *   currentSurplus: number | null,
 *   newSurplus: number | null,
 *   status: "improved" | "unchanged" | "worsened" | "creates_shortfall" | "unknown",
 *   warning: string | null,
 *   suggestion: string | null
 * }
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
    const { action, envelopeId, payCycleAmount, priority } = body;

    if (!action || !["add", "edit"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "edit" && !envelopeId) {
      return NextResponse.json({ error: "Envelope ID required for edit action" }, { status: 400 });
    }

    if (typeof payCycleAmount !== "number" || payCycleAmount < 0) {
      return NextResponse.json({ error: "Invalid pay cycle amount" }, { status: 400 });
    }

    // Get user's pay cycle
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", session.user.id)
      .maybeSingle();

    const payCycle: PayCycle = (profile?.pay_cycle as PayCycle) || "fortnightly";

    // Get all current envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select(
        "id, name, envelope_type, priority, target_amount, annual_amount, pay_cycle_amount, current_amount, frequency, next_payment_due, category_id"
      )
      .eq("user_id", session.user.id);

    if (envelopesError) {
      return NextResponse.json({ error: envelopesError.message }, { status: 400 });
    }

    const typedEnvelopes = (envelopes || []) as Envelope[];

    // Calculate current total regular allocations
    const currentTotalRegular = typedEnvelopes
      .filter((env) => env.envelope_type === "expense")
      .reduce((sum, env) => sum + (env.pay_cycle_amount || 0), 0);

    // Calculate new total based on action
    let newTotalRegular: number;

    if (action === "add") {
      // Adding new envelope
      newTotalRegular = currentTotalRegular + payCycleAmount;
    } else {
      // Editing existing envelope
      const existingEnvelope = typedEnvelopes.find((env) => env.id === envelopeId);
      if (!existingEnvelope) {
        return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
      }

      const oldAmount = existingEnvelope.pay_cycle_amount || 0;
      newTotalRegular = currentTotalRegular - oldAmount + payCycleAmount;
    }

    const difference = newTotalRegular - currentTotalRegular;

    // Try to get user's typical pay amount (we don't store this currently, so this is null for now)
    // In future, could track pay history or ask user to set expected pay
    const userPayAmount = null; // Could enhance: fetch from user preferences or transaction history

    // Calculate surplus if we have pay amount
    const currentSurplus = userPayAmount !== null ? userPayAmount - currentTotalRegular : null;
    const newSurplus = userPayAmount !== null ? userPayAmount - newTotalRegular : null;

    // Determine status
    let status: "improved" | "unchanged" | "worsened" | "creates_shortfall" | "unknown";
    let warning: string | null = null;
    let suggestion: string | null = null;

    if (currentSurplus === null || newSurplus === null) {
      // Can't determine impact without knowing pay amount
      status = "unknown";
      warning =
        difference > 0
          ? `This ${action === "add" ? "adds" : "increases"} $${difference.toFixed(2)}/pay to your regular allocations. Make sure this fits within your budget.`
          : difference < 0
            ? `This reduces your regular allocations by $${Math.abs(difference).toFixed(2)}/pay, freeing up more surplus.`
            : "No change to your regular allocations.";
    } else {
      // We have pay amount, can determine precise impact
      if (newSurplus < 0 && currentSurplus >= 0) {
        status = "creates_shortfall";
        warning = `⚠️ This ${action === "add" ? "addition" : "change"} will create a shortfall of $${Math.abs(newSurplus).toFixed(2)}/pay. You won't have enough to cover all regular allocations.`;
        suggestion = "Consider reducing other envelopes or exploring scenarios to free up funds.";
      } else if (newSurplus < 0 && currentSurplus < 0) {
        status = "worsened";
        warning = `⚠️ This increases your shortfall from $${Math.abs(currentSurplus).toFixed(2)} to $${Math.abs(newSurplus).toFixed(2)}/pay.`;
        suggestion = "Your budget is already over-committed. Review discretionary spending.";
      } else if (newSurplus > currentSurplus) {
        status = "improved";
        suggestion = `✓ This reduces allocations, increasing your surplus from $${currentSurplus.toFixed(2)} to $${newSurplus.toFixed(2)}/pay.`;
      } else if (newSurplus < currentSurplus) {
        status = "worsened";
        warning = `This reduces your surplus from $${currentSurplus.toFixed(2)} to $${newSurplus.toFixed(2)}/pay.`;
      } else {
        status = "unchanged";
      }
    }

    return NextResponse.json({
      currentTotalRegular: Math.round(currentTotalRegular * 100) / 100,
      newTotalRegular: Math.round(newTotalRegular * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      userPayAmount,
      currentSurplus:
        currentSurplus !== null ? Math.round(currentSurplus * 100) / 100 : null,
      newSurplus: newSurplus !== null ? Math.round(newSurplus * 100) / 100 : null,
      status,
      warning,
      suggestion,
      payCycle,
    });
  } catch (error) {
    console.error("Error in budget-impact endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
