import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BirthdaysClient } from "./birthdays-client";

export const metadata = {
  title: "Birthdays | My Budget Mate",
  description: "Manage birthdays and celebration dates",
};

export default async function BirthdaysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let birthdays: Array<{
    id: string;
    name: string;
    date: string;
    giftAmount: number;
    partyAmount: number;
    notes: string | null;
    envelopeId: string;
    envelopeName: string;
    envelopeIcon: string;
    needsGift: boolean;
  }> = [];

  try {
    // First check if gift_recipients table exists by doing a simple query
    const { data: recipients, error } = await supabase
      .from("gift_recipients")
      .select("id, recipient_name, gift_amount, party_amount, celebration_date, notes, envelope_id, needs_gift")
      .eq("user_id", user.id)
      .not("celebration_date", "is", null)
      .order("celebration_date", { ascending: true });

    if (error) {
      // Table might not exist yet
      console.error("Failed to fetch birthdays:", error);
    } else if (recipients && recipients.length > 0) {
      // Fetch envelope details separately for reliability
      const envelopeIds = [...new Set(recipients.map((r) => r.envelope_id))];
      const { data: envelopes } = await supabase
        .from("envelopes")
        .select("id, name, icon")
        .in("id", envelopeIds);

      const envelopeMap = new Map(
        (envelopes || []).map((e) => [e.id, { name: e.name, icon: e.icon }])
      );

      // Transform the data
      birthdays = recipients.map((r) => {
        const envelope = envelopeMap.get(r.envelope_id);
        return {
          id: r.id,
          name: r.recipient_name,
          date: r.celebration_date,
          giftAmount: r.gift_amount,
          partyAmount: (r as any).party_amount || 0,
          notes: r.notes,
          envelopeId: r.envelope_id,
          envelopeName: envelope?.name || "Unknown",
          envelopeIcon: envelope?.icon || "🎁",
          needsGift: (r as any).needs_gift ?? true, // Default to true for existing records
        };
      });
    }
  } catch (err) {
    console.error("Error loading birthdays page:", err);
  }

  return <BirthdaysClient initialBirthdays={birthdays} />;
}
