import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current CC debt from accounts
    const { data: ccAccounts } = await supabase
      .from("accounts")
      .select("id, name, current_balance, type")
      .eq("user_id", user.id)
      .eq("type", "debt");

    // Get debt snowball plan for starting debt information
    const { data: debtPlan } = await supabase
      .from("debt_snowball_plan")
      .select("debts, phase")
      .eq("user_id", user.id)
      .maybeSingle();

    // Calculate total current CC debt (balances are negative for debt)
    const currentCCDebt = (ccAccounts ?? []).reduce((sum, acc) => {
      const balance = Number(acc.current_balance ?? 0);
      // Only count negative balances as debt
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0);

    // Calculate starting debt from snowball plan
    const startingCCDebt = debtPlan?.debts
      ? (debtPlan.debts as Array<{ balance: number }>).reduce((sum, d) => sum + (d.balance ?? 0), 0)
      : currentCCDebt; // Fallback to current if no plan exists

    // Find the smallest debt (active target for snowball method)
    const activeDebtAccount = (ccAccounts ?? [])
      .filter(acc => {
        const balance = Number(acc.current_balance ?? 0);
        return balance < 0; // Negative = debt
      })
      .sort((a, b) => Math.abs(Number(a.current_balance)) - Math.abs(Number(b.current_balance)))[0];

    return NextResponse.json({
      currentDebt: currentCCDebt,
      startingDebt: startingCCDebt,
      phase: debtPlan?.phase ?? 'starter_stash',
      hasDebt: currentCCDebt > 0,
      activeDebt: activeDebtAccount ? {
        name: activeDebtAccount.name,
        balance: Math.abs(Number(activeDebtAccount.current_balance)),
      } : null,
    });
  } catch (error) {
    console.error("Error fetching credit card debt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
