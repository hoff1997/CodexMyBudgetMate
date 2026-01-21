import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCelebrationReadiness,
  type CelebrationEvent,
} from "@/lib/utils/celebration-readiness";
import type { PayCycle } from "@/lib/utils/ideal-allocation-calculator";

/**
 * GET /api/celebrations/readiness
 * Calculate readiness for all celebration envelopes
 * Returns a map of envelope_id -> readiness data
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Fetch user's pay cycle
  const { data: incomeSource } = await supabase
    .from("income_sources")
    .select("pay_frequency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payCycle = (incomeSource?.pay_frequency || "fortnightly") as PayCycle;

  // Fetch all celebration envelopes with their gift recipients
  const { data: envelopes, error: envelopesError } = await supabase
    .from("envelopes")
    .select(`
      id,
      name,
      current_amount,
      is_celebration,
      gift_recipients (
        id,
        recipient_name,
        gift_amount,
        party_amount,
        celebration_date
      )
    `)
    .eq("user_id", user.id)
    .eq("is_celebration", true)
    .or("is_archived.is.null,is_archived.eq.false");

  if (envelopesError) {
    console.error("[celebrations/readiness] GET error:", envelopesError);
    return NextResponse.json({ error: envelopesError.message }, { status: 400 });
  }

  // Calculate readiness for each celebration envelope
  const readinessMap: Record<string, {
    status: string;
    shortfall: number;
    perPayCatchUp: number;
    nextEventName: string | null;
    nextEventDate: string | null;
    daysUntil: number | null;
    paysUntil: number | null;
    currentBalance: number;
    annualTotal: number;
    steadyStatePerPay: number;
  }> = {};

  for (const envelope of envelopes || []) {
    const recipients = (envelope.gift_recipients || []) as Array<{
      id: string;
      recipient_name: string;
      gift_amount: number;
      party_amount: number | null;
      celebration_date: string | null;
    }>;

    // Convert recipients to events, excluding __PARTY__ pseudo-recipient
    const events: CelebrationEvent[] = recipients
      .filter(r => r.recipient_name !== '__PARTY__')
      .map(r => ({
        recipientName: r.recipient_name,
        celebrationDate: r.celebration_date || '',
        giftAmount: Number(r.gift_amount) || 0,
        partyAmount: Number(r.party_amount) || 0,
      }));

    // Add party budget if exists (for festivals)
    const partyRecipient = recipients.find(r => r.recipient_name === '__PARTY__');
    if (partyRecipient && events.length === 0) {
      // Festival with party-only budget
      events.push({
        recipientName: envelope.name,
        celebrationDate: new Date().toISOString(), // Use current date as approximation
        giftAmount: Number(partyRecipient.gift_amount) || 0,
        partyAmount: 0,
      });
    }

    const currentBalance = Number(envelope.current_amount) || 0;
    const readiness = calculateCelebrationReadiness(currentBalance, events, payCycle);

    readinessMap[envelope.id] = {
      status: readiness.status,
      shortfall: readiness.shortfall,
      perPayCatchUp: readiness.perPayCatchUp,
      nextEventName: readiness.nextEvent?.recipientName || null,
      nextEventDate: readiness.nextEvent?.date.toISOString() || null,
      daysUntil: readiness.nextEvent?.daysUntil ?? null,
      paysUntil: readiness.nextEvent?.paysUntil ?? null,
      currentBalance: readiness.currentBalance,
      annualTotal: readiness.annualTotal,
      steadyStatePerPay: readiness.steadyStatePerPay,
    };
  }

  return NextResponse.json(readinessMap);
}
