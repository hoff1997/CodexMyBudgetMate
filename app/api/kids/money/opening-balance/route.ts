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
  const { child_id, balances } = body;

  if (!child_id || !balances) {
    return NextResponse.json(
      { error: "child_id and balances required" },
      { status: 400 }
    );
  }

  // Verify parent ownership
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", child_id)
    .eq("parent_user_id", user.id)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Create or update envelope accounts with opening balances
  const envelopeTypes = ["spend", "save", "invest", "give"];
  const accountNames: Record<string, string> = {
    spend: "Spending",
    save: "Saving",
    invest: "Investing",
    give: "Giving",
  };

  for (const type of envelopeTypes) {
    const balance = Number(balances[type]) || 0;

    const { data: existing } = await supabase
      .from("child_bank_accounts")
      .select("id")
      .eq("child_profile_id", child_id)
      .eq("envelope_type", type)
      .single();

    if (existing) {
      await supabase
        .from("child_bank_accounts")
        .update({
          opening_balance: balance,
          current_balance: balance,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("child_bank_accounts").insert({
        child_profile_id: child_id,
        envelope_type: type,
        account_name: accountNames[type],
        opening_balance: balance,
        current_balance: balance,
        is_virtual: true,
      });
    }
  }

  return NextResponse.json({ success: true });
}
