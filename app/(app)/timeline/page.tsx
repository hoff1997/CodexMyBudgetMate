import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TimelineClient } from "./timeline-client";
import { addDays, startOfDay } from "date-fns";

export const metadata = {
  title: "Timeline | My Budget Mate",
  description: "View your upcoming bills and income chronologically",
};

export default async function TimelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch envelopes with due dates
  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  // Fetch recurring income sources
  const { data: recurringIncomes } = await supabase
    .from("recurring_income")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  // Fetch envelope balances
  const { data: balances } = await supabase
    .from("envelope_balances")
    .select("envelope_id, balance")
    .eq("user_id", user.id);

  // Convert to Map for easy lookup
  const envelopeBalances = new Map<string, number>();
  if (balances) {
    for (const b of balances) {
      envelopeBalances.set(b.envelope_id, b.balance || 0);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TimelineClient
        envelopes={envelopes || []}
        recurringIncomes={recurringIncomes || []}
        envelopeBalances={envelopeBalances}
      />
    </div>
  );
}
