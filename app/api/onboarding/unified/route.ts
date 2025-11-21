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
      envelopeAllocations,
      completedAt,
    }: {
      fullName: string;
      persona: string;
      bankAccounts: BankAccount[];
      incomeSources: IncomeSource[];
      envelopes: EnvelopeData[];
      envelopeAllocations?: { [envelopeId: string]: { [incomeId: string]: number } };
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

    // 3. Create envelopes first (we need their IDs for allocations)
    const envelopeIdMap = new Map<string, string>(); // Map from temp ID to real ID

    if (envelopes.length > 0) {
      for (const envelope of envelopes) {
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
          baseData.bill_amount = envelope.billAmount || 0;
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

        const { data: createdEnvelope, error: envelopeError } = await supabase
          .from("envelopes")
          .insert(baseData)
          .select()
          .single();

        if (envelopeError || !createdEnvelope) {
          console.error("Envelope creation error:", envelopeError);
          return NextResponse.json({ error: "Failed to create envelopes" }, { status: 500 });
        }

        envelopeIdMap.set(envelope.id, createdEnvelope.id);
      }
    }

    // 4. Create income sources with allocations
    if (incomeSources.length > 0) {
      for (const income of incomeSources) {
        // Build allocation array for this income
        const allocation: Array<{ envelopeId: string; amount: number }> = [];

        if (envelopeAllocations) {
          // Use provided allocations
          for (const [tempEnvelopeId, incomeAllocations] of Object.entries(envelopeAllocations)) {
            const realEnvelopeId = envelopeIdMap.get(tempEnvelopeId);
            const amount = incomeAllocations[income.id] || 0;

            if (realEnvelopeId && amount > 0) {
              allocation.push({
                envelopeId: realEnvelopeId,
                amount,
              });
            }
          }
        } else {
          // Fallback: If no allocations provided and only one income, allocate everything
          if (incomeSources.length === 1) {
            for (const envelope of envelopes) {
              const realEnvelopeId = envelopeIdMap.get(envelope.id);
              if (realEnvelopeId) {
                allocation.push({
                  envelopeId: realEnvelopeId,
                  amount: envelope.payCycleAmount || 0,
                });
              }
            }
          }
        }

        const { error: incomeError } = await supabase
          .from("recurring_income")
          .insert({
            user_id: userId,
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            next_date: income.nextPayDate instanceof Date ? income.nextPayDate.toISOString() : income.nextPayDate,
            is_active: true,
            allocation: allocation,
          });

        if (incomeError) {
          console.error("Income source error:", incomeError);
          return NextResponse.json({ error: "Failed to create income sources" }, { status: 500 });
        }
      }

      // 5. Update envelopes with funding_sources
      if (envelopeAllocations) {
        const { data: createdIncomes } = await supabase
          .from("recurring_income")
          .select("id, name")
          .eq("user_id", userId);

        if (createdIncomes) {
          const incomeNameToIdMap = new Map<string, string>();
          for (const income of createdIncomes) {
            incomeNameToIdMap.set(income.name, income.id);
          }

          for (const [tempEnvelopeId, incomeAllocations] of Object.entries(envelopeAllocations)) {
            const realEnvelopeId = envelopeIdMap.get(tempEnvelopeId);
            if (!realEnvelopeId) continue;

            const fundingSources: Array<{ income_id: string; income_name: string; amount: number }> = [];

            for (const income of incomeSources) {
              const amount = incomeAllocations[income.id] || 0;
              const realIncomeId = incomeNameToIdMap.get(income.name);

              if (amount > 0 && realIncomeId) {
                fundingSources.push({
                  income_id: realIncomeId,
                  income_name: income.name,
                  amount,
                });
              }
            }

            if (fundingSources.length > 0) {
              await supabase
                .from("envelopes")
                .update({ funding_sources: fundingSources })
                .eq("id", realEnvelopeId);
            }
          }
        }
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
