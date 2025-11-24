import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAllEnvelopeHealth,
  calculateScenario,
  getCommonScenarios,
} from "@/lib/planner/scenarios";
import type { Envelope, PayCycle, Scenario } from "@/lib/planner/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's pay cycle
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", user.id)
      .maybeSingle();

    const payCycle: PayCycle = (profile?.pay_cycle as PayCycle) || "fortnightly";

    // Get all envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select(
        "id, name, envelope_type, priority, target_amount, annual_amount, pay_cycle_amount, current_amount, frequency, next_payment_due, category_id"
      )
      .eq("user_id", user.id)
      .order("name");

    if (envelopesError) {
      return NextResponse.json({ error: envelopesError.message }, { status: 400 });
    }

    const typedEnvelopes = (envelopes || []) as Envelope[];

    // Calculate current health for all envelopes
    const envelopeHealth = calculateAllEnvelopeHealth(typedEnvelopes, payCycle);

    // Get common scenarios
    const commonScenarios = getCommonScenarios(payCycle);

    // Calculate results for all common scenarios
    const scenarioResults = commonScenarios.map((scenario) =>
      calculateScenario(typedEnvelopes, payCycle, scenario)
    );

    return NextResponse.json({
      payCycle,
      envelopeHealth,
      scenarios: scenarioResults,
    });
  } catch (error) {
    console.error("Error in scenarios endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get custom scenario from request body
    const body = await request.json();
    const customScenario: Scenario = body.scenario;

    if (!customScenario) {
      return NextResponse.json({ error: "Scenario is required" }, { status: 400 });
    }

    // Get user's pay cycle
    const { data: profile } = await supabase
      .from("profiles")
      .select("pay_cycle")
      .eq("id", user.id)
      .maybeSingle();

    const payCycle: PayCycle = (profile?.pay_cycle as PayCycle) || "fortnightly";

    // Get all envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from("envelopes")
      .select(
        "id, name, envelope_type, priority, target_amount, annual_amount, pay_cycle_amount, current_amount, frequency, next_payment_due, category_id"
      )
      .eq("user_id", user.id)
      .order("name");

    if (envelopesError) {
      return NextResponse.json({ error: envelopesError.message }, { status: 400 });
    }

    const typedEnvelopes = (envelopes || []) as Envelope[];

    // Calculate scenario result
    const result = calculateScenario(typedEnvelopes, payCycle, customScenario);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in scenarios endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
