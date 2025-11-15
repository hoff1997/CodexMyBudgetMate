import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EnvelopeData, BankAccount, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const {
      fullName,
      persona,
      bankAccounts,
      incomeSources,
      envelopes,
      completedAt,
    }: {
      fullName: string;
      persona: string;
      bankAccounts: BankAccount[];
      incomeSources: IncomeSource[];
      envelopes: EnvelopeData[];
      completedAt: string;
    } = body;

    // Validate required data
    if (!fullName || !persona) {
      return NextResponse.json(
        { error: "Missing required profile data" },
        { status: 400 }
      );
    }

    if (!envelopes || envelopes.length === 0) {
      return NextResponse.json(
        { error: "At least one envelope is required" },
        { status: 400 }
      );
    }

    if (!incomeSources || incomeSources.length === 0) {
      return NextResponse.json(
        { error: "At least one income source is required" },
        { status: 400 }
      );
    }

    console.log("Processing onboarding for user:", userId, {
      envelopesCount: envelopes.length,
      incomeSourcesCount: incomeSources.length,
      bankAccountsCount: bankAccounts.length,
    });

    // Start transaction-like operations
    // 1. Update profile with name, persona, and onboarding_completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        user_persona: persona,
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // 2. Create bank accounts
    if (bankAccounts.length > 0) {
      const accountsToInsert = bankAccounts.map((account) => ({
        user_id: userId,
        name: account.name,
        type: account.type,
        balance: account.balance,
      }));

      const { error: accountsError } = await supabase
        .from("bank_accounts")
        .insert(accountsToInsert);

      if (accountsError) {
        console.error("Bank accounts error:", accountsError);
        // Continue anyway - accounts can be added later
      }
    }

    // 3. Create income sources
    if (incomeSources.length > 0) {
      const incomesToInsert = incomeSources.map((income) => ({
        user_id: userId,
        source: income.name,
        amount: income.amount,
        frequency: income.frequency,
        next_date: income.nextPayDate.toISOString(),
        is_active: true,
      }));

      const { error: incomeError } = await supabase
        .from("recurring_income")
        .insert(incomesToInsert);

      if (incomeError) {
        console.error("Income sources error:", incomeError);
        return NextResponse.json({ error: "Failed to create income sources" }, { status: 500 });
      }
    }

    // 4. Create envelopes
    if (envelopes.length > 0) {
      const envelopesToInsert = envelopes.map((envelope) => {
        // Base envelope data
        const baseData: any = {
          user_id: userId,
          name: envelope.name,
          icon: envelope.icon,
          pay_cycle_amount: envelope.payCycleAmount || 0,
          current_amount: 0,
          opening_balance: 0,
          is_spending: envelope.type === "spending",
          is_goal: envelope.type === "savings",
          envelope_type: "expense",
        };

        // Add type-specific fields
        if (envelope.type === "bill") {
          baseData.target_amount = envelope.billAmount || 0;
          baseData.frequency = envelope.frequency || "monthly";
          baseData.due_date = envelope.dueDate ? new Date(new Date().getFullYear(), new Date().getMonth(), envelope.dueDate) : null;
          baseData.priority = envelope.priority || "important";
        } else if (envelope.type === "spending") {
          baseData.target_amount = envelope.monthlyBudget || 0;
          baseData.priority = envelope.priority || "discretionary";
        } else if (envelope.type === "savings") {
          baseData.target_amount = envelope.savingsAmount || 0;
          baseData.goal_type = envelope.goalType || "savings";
          baseData.goal_target_date = envelope.targetDate ? envelope.targetDate : null;
        }

        return baseData;
      });

      const { error: envelopesError } = await supabase
        .from("envelopes")
        .insert(envelopesToInsert);

      if (envelopesError) {
        console.error("Envelopes error:", envelopesError);
        return NextResponse.json({ error: "Failed to create envelopes" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
