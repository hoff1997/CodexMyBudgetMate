import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDaysUntil } from "@/lib/types/celebrations";
import {
  calculateCelebrationReadiness,
  getReadinessMessage,
  type CelebrationEvent,
} from "@/lib/utils/celebration-readiness";
import type { PayCycle } from "@/lib/utils/ideal-allocation-calculator";

/**
 * GET /api/celebrations/reminders
 * Fetch active celebration reminders for the dashboard with readiness data
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch reminders that are due to show (reminder_date <= today) and not dismissed
  const { data: reminders, error } = await supabase
    .from("celebration_reminders")
    .select(`
      *,
      envelope:envelopes(id, name, icon, current_amount)
    `)
    .eq("user_id", user.id)
    .eq("is_dismissed", false)
    .lte("reminder_date", today)
    .order("celebration_date", { ascending: true });

  if (error) {
    console.error("[celebration-reminders] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fetch user's pay cycle for readiness calculation
  const { data: incomeSource } = await supabase
    .from("income_sources")
    .select("pay_frequency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payCycle = (incomeSource?.pay_frequency || "fortnightly") as PayCycle;

  // Group reminders by envelope to calculate readiness per envelope
  const remindersByEnvelope = new Map<string, typeof reminders>();
  for (const r of reminders || []) {
    const envelopeId = r.envelope_id || "unknown";
    if (!remindersByEnvelope.has(envelopeId)) {
      remindersByEnvelope.set(envelopeId, []);
    }
    remindersByEnvelope.get(envelopeId)!.push(r);
  }

  // Fetch all gift recipients for envelopes with reminders to get full picture
  const envelopeIds = Array.from(remindersByEnvelope.keys()).filter(id => id !== "unknown");
  let allRecipients: any[] = [];

  if (envelopeIds.length > 0) {
    const { data: recipients } = await supabase
      .from("gift_recipients")
      .select("*")
      .in("envelope_id", envelopeIds);
    allRecipients = recipients || [];
  }

  // Calculate readiness for each envelope
  const envelopeReadiness = new Map<string, ReturnType<typeof calculateCelebrationReadiness>>();

  for (const [envelopeId, envelopeReminders] of remindersByEnvelope) {
    if (envelopeId === "unknown") continue;

    const envelope = envelopeReminders[0]?.envelope;
    const currentBalance = envelope?.current_amount || 0;

    // Get all recipients for this envelope
    const envelopeRecipients = allRecipients.filter(r => r.envelope_id === envelopeId);

    const events: CelebrationEvent[] = envelopeRecipients
      .filter(r => r.recipient_name !== '__PARTY__') // Exclude party budget pseudo-recipient
      .map(r => ({
        recipientName: r.recipient_name,
        celebrationDate: r.celebration_date,
        giftAmount: Number(r.gift_amount) || 0,
        partyAmount: Number(r.party_amount) || 0,
      }));

    // Add party budget if exists
    const partyRecipient = envelopeRecipients.find(r => r.recipient_name === '__PARTY__');
    if (partyRecipient) {
      // For festivals with party budget only, create a synthetic event
      if (events.length === 0) {
        events.push({
          recipientName: envelope?.name || 'Event',
          celebrationDate: new Date().toISOString(), // Use today as approximate
          giftAmount: Number(partyRecipient.gift_amount) || 0,
          partyAmount: 0,
        });
      }
    }

    const readiness = calculateCelebrationReadiness(currentBalance, events, payCycle);
    envelopeReadiness.set(envelopeId, readiness);
  }

  // Transform reminders with calculated days_until and readiness
  const transformedReminders = (reminders || []).map((r) => {
    const envelopeId = r.envelope_id || "unknown";
    const readiness = envelopeReadiness.get(envelopeId);

    return {
      id: r.id,
      recipient_name: r.recipient_name,
      celebration_date: r.celebration_date,
      gift_amount: r.gift_amount,
      envelope_id: r.envelope_id,
      envelope_name: r.envelope?.name || "Celebration",
      envelope_icon: r.envelope?.icon || "🎉",
      envelope_balance: r.envelope?.current_amount || 0,
      days_until: calculateDaysUntil(r.celebration_date),
      // Readiness data
      readiness_status: readiness?.status || 'no_events',
      readiness_message: readiness ? getReadinessMessage(readiness) : null,
      shortfall: readiness?.shortfall || 0,
      per_pay_catch_up: readiness?.perPayCatchUp || 0,
    };
  });

  return NextResponse.json(transformedReminders);
}

/**
 * POST /api/celebrations/reminders
 * Regenerate all reminders for the user (called when settings change)
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Call the database function to regenerate reminders
  const { data, error } = await supabase.rpc("generate_celebration_reminders", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("[celebration-reminders] POST regenerate error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    reminders_generated: data,
  });
}
