import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SetupClient } from "./setup-client";

export const metadata = {
  title: "Setup Wizard | My Budget Mate",
  description: "Complete 4-step guided setup for your personal budget system",
};

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Optional: Check if user has already completed setup
  // and redirect to dashboard if so
  if (session) {
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", session.user.id)
      .limit(1);

    const { data: envelopes } = await supabase
      .from("envelopes")
      .select("id")
      .eq("user_id", session.user.id)
      .limit(1);

    // If user already has accounts and envelopes, maybe redirect to dashboard
    // For now, we'll allow them to run setup again
  }

  return <SetupClient userId={session?.user.id} />;
}
