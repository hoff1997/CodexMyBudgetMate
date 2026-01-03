import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { child_id, amount, source } = body;

  if (!child_id || !amount) {
    return NextResponse.json(
      { error: "child_id and amount required" },
      { status: 400 }
    );
  }

  // Get child profile with distribution settings (verify ownership)
  const { data: child } = await supabase
    .from("child_profiles")
    .select("*")
    .eq("id", child_id)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Calculate split based on percentages
  const totalAmount = Number(amount);
  const spendAmount =
    Math.round((totalAmount * child.distribution_spend_pct) / 100 * 100) / 100;
  const saveAmount =
    Math.round((totalAmount * child.distribution_save_pct) / 100 * 100) / 100;
  const investAmount =
    Math.round((totalAmount * child.distribution_invest_pct) / 100 * 100) / 100;
  const giveAmount =
    Math.round((totalAmount * child.distribution_give_pct) / 100 * 100) / 100;

  // Update envelope balances
  const amounts: Record<string, number> = {
    spend: spendAmount,
    save: saveAmount,
    invest: investAmount,
    give: giveAmount,
  };

  for (const [type, addAmount] of Object.entries(amounts)) {
    if (addAmount <= 0) continue;

    const { data: existing } = await supabase
      .from("child_bank_accounts")
      .select("id, current_balance")
      .eq("child_profile_id", child_id)
      .eq("envelope_type", type)
      .single();

    if (existing) {
      await supabase
        .from("child_bank_accounts")
        .update({
          current_balance: Number(existing.current_balance) + addAmount,
        })
        .eq("id", existing.id);
    } else {
      // Create envelope if it doesn't exist
      await supabase.from("child_bank_accounts").insert({
        child_profile_id: child_id,
        envelope_type: type,
        account_name: type.charAt(0).toUpperCase() + type.slice(1),
        current_balance: addAmount,
        opening_balance: 0,
        is_virtual: true,
      });
    }
  }

  return NextResponse.json({
    success: true,
    source: source || "manual",
    total: totalAmount,
    allocated: {
      spend: spendAmount,
      save: saveAmount,
      invest: investAmount,
      give: giveAmount,
    },
  });
}
