import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");

  if (!childId) {
    return NextResponse.json({ error: "child_id required" }, { status: 400 });
  }

  // Get child profile (verify parent ownership)
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("*")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get envelope balances
  const { data: envelopes } = await supabase
    .from("child_bank_accounts")
    .select("*")
    .eq("child_profile_id", childId);

  const envelopeBalances = {
    spend: 0,
    save: 0,
    invest: 0,
    give: 0,
  };

  envelopes?.forEach((env) => {
    if (env.envelope_type in envelopeBalances) {
      envelopeBalances[env.envelope_type as keyof typeof envelopeBalances] =
        Number(env.current_balance);
    }
  });

  // Calculate pending earnings from approved but unpaid chores
  const { data: pendingChores } = await supabase
    .from("chore_assignments")
    .select("currency_amount")
    .eq("child_profile_id", childId)
    .eq("currency_type", "money")
    .eq("status", "approved");

  const pendingAmount =
    pendingChores?.reduce((sum, c) => sum + Number(c.currency_amount), 0) || 0;

  return NextResponse.json({
    child_id: child.id,
    name: child.name,
    money_mode: child.money_mode,
    envelopes: envelopeBalances,
    pending_earnings: pendingAmount,
    distribution: {
      spend_pct: child.distribution_spend_pct,
      save_pct: child.distribution_save_pct,
      invest_pct: child.distribution_invest_pct,
      give_pct: child.distribution_give_pct,
    },
  });
}
