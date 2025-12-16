import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EnvelopeData, BankAccount, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";
import type { CreditCardConfig } from "@/lib/types/credit-card-onboarding";
import { createOpeningBalanceTransactions } from "@/lib/server/create-opening-balance-transactions";
import { getCurrentBillingCycle } from "@/lib/utils/credit-card-onboarding-utils";

// Interface for custom categories from onboarding
interface CustomCategoryInput {
  id: string; // e.g., 'custom-cat-1234567890'
  label: string;
  icon: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const {
      fullName,
      persona,
      bankAccounts,
      creditCardConfigs,
      incomeSources,
      envelopes,
      envelopeAllocations,
      openingBalances,
      customCategories,
      categoryOrder,
      completedAt,
    }: {
      fullName: string;
      persona: string;
      bankAccounts: BankAccount[];
      creditCardConfigs?: CreditCardConfig[];
      incomeSources: IncomeSource[];
      envelopes: EnvelopeData[];
      envelopeAllocations?: { [envelopeId: string]: { [incomeId: string]: number } };
      openingBalances?: { [envelopeId: string]: number };
      customCategories?: CustomCategoryInput[];
      categoryOrder?: string[];
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
      creditCardConfigsCount: creditCardConfigs?.length || 0,
    });

    // Start transaction-like operations
    // 1. Update profile with name, persona, and onboarding_completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        user_persona: persona,
        onboarding_completed: true,
        show_onboarding_menu: false,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // 2. Create bank accounts and map temp IDs to real IDs
    const accountIdMap = new Map<string, string>(); // Map from temp ID to real ID

    if (bankAccounts.length > 0) {
      for (const account of bankAccounts) {
        // For credit cards, use negative balance (debt)
        const balanceValue = account.type === 'credit_card'
          ? -Math.abs(account.balance)
          : account.balance;

        const { data: createdAccount, error: accountError } = await supabase
          .from("accounts")
          .insert({
            user_id: userId,
            name: account.name,
            type: account.type === 'credit_card' ? 'debt' : account.type,
            current_balance: balanceValue,
          })
          .select("id")
          .single();

        if (accountError) {
          console.error("Account creation error:", accountError);
          // Continue anyway - accounts can be added later
        } else if (createdAccount) {
          accountIdMap.set(account.id, createdAccount.id);
        }
      }
    }

    // 2.5. Process credit card configurations
    const ccHoldingEnvelopeIds: string[] = [];

    if (creditCardConfigs && creditCardConfigs.length > 0) {
      for (const ccConfig of creditCardConfigs) {
        const realAccountId = accountIdMap.get(ccConfig.accountId);
        if (!realAccountId) {
          console.error("Could not find real account ID for:", ccConfig.accountId);
          continue;
        }

        // Update the account with CC-specific fields
        const { error: ccAccountError } = await supabase
          .from("accounts")
          .update({
            cc_usage_type: ccConfig.usageType,
            cc_still_using: ccConfig.stillUsing ?? true,
            cc_starting_debt_amount: ccConfig.startingDebtAmount || 0,
            cc_starting_debt_date: ccConfig.startingDebtDate || new Date().toISOString(),
            cc_expected_monthly_spending: ccConfig.expectedMonthlySpending || null,
            cc_current_outstanding: ccConfig.currentOutstanding || 0,
            apr: ccConfig.apr || null,
            statement_close_day: ccConfig.billingCycle?.statementCloseDay || null,
            payment_due_day: ccConfig.billingCycle?.paymentDueDay || null,
          })
          .eq("id", realAccountId);

        if (ccAccountError) {
          console.error("CC account update error:", ccAccountError);
        }

        // Create CC Holding envelope for this card
        const holdingEnvelopeName = `${ccConfig.accountName} Holding`;
        const initialHoldingAmount = ccConfig.usageType === 'pay_in_full'
          ? (ccConfig.currentOutstanding || 0)
          : 0;

        const { data: holdingEnvelope, error: holdingError } = await supabase
          .from("envelopes")
          .insert({
            user_id: userId,
            name: holdingEnvelopeName,
            icon: "💳",
            current_amount: initialHoldingAmount,
            opening_balance: initialHoldingAmount,
            is_cc_holding: true,
            cc_account_id: realAccountId,
            envelope_type: "expense",
            is_spending: false,
            is_goal: false,
            priority: "essential",
          })
          .select("id")
          .single();

        if (holdingError) {
          console.error("CC Holding envelope error:", holdingError);
        } else if (holdingEnvelope) {
          ccHoldingEnvelopeIds.push(holdingEnvelope.id);
        }

        // Create initial billing cycle record if we have billing cycle info
        if (ccConfig.billingCycle?.statementCloseDay && ccConfig.billingCycle?.paymentDueDay) {
          const currentCycle = getCurrentBillingCycle(
            ccConfig.billingCycle.statementCloseDay
          );

          const { error: cycleError } = await supabase
            .from("credit_card_cycle_holdings")
            .insert({
              user_id: userId,
              account_id: realAccountId,
              cycle_identifier: currentCycle,
              opening_holding_amount: initialHoldingAmount,
              current_holding_amount: initialHoldingAmount,
              new_spending_total: 0,
              is_current_cycle: true,
            });

          if (cycleError) {
            console.error("CC cycle record error:", cycleError);
          }
        }

        // For paying_down types, create payoff projection
        if ((ccConfig.usageType === 'paying_down' || ccConfig.usageType === 'minimum_only') &&
            ccConfig.apr && ccConfig.minimumPayment && ccConfig.startingDebtAmount) {

          const { error: projectionError } = await supabase
            .from("credit_card_payoff_projections")
            .insert({
              user_id: userId,
              account_id: realAccountId,
              starting_balance: ccConfig.startingDebtAmount,
              current_balance: ccConfig.startingDebtAmount,
              apr: ccConfig.apr,
              minimum_payment: ccConfig.minimumPayment,
              extra_payment: 0,
              is_active: true,
            });

          if (projectionError) {
            console.error("CC payoff projection error:", projectionError);
          }
        }
      }
    }

    // 3. Create custom categories first (we need their IDs for envelopes)
    const categoryIdMap = new Map<string, string>(); // Map from temp custom category ID to real ID

    if (customCategories && customCategories.length > 0) {
      for (let index = 0; index < customCategories.length; index++) {
        const category = customCategories[index];
        // Find the category's position in categoryOrder, or use index as fallback
        const sortOrder = categoryOrder?.indexOf(category.id) ?? index;

        const { data: createdCategory, error: categoryError } = await supabase
          .from("envelope_categories")
          .insert({
            user_id: userId,
            name: category.label,
            icon: category.icon,
            sort_order: sortOrder,
          })
          .select("id")
          .single();

        if (categoryError) {
          console.error("Custom category creation error:", categoryError);
          // Continue anyway - categories are not critical
        } else if (createdCategory) {
          categoryIdMap.set(category.id, createdCategory.id);
        }
      }
    }

    // Also create categories for built-in categories if they have envelopes
    // This ensures we have proper category_id references
    const builtInCategoriesUsed = new Set<string>();
    for (const envelope of envelopes) {
      if (envelope.category && !envelope.category.startsWith('custom-')) {
        builtInCategoriesUsed.add(envelope.category);
      }
    }

    // Map built-in category names to labels
    const builtInCategoryLabels: Record<string, string> = {
      housing: 'Housing',
      utilities: 'Utilities',
      transport: 'Transport',
      insurance: 'Insurance',
      food: 'Food & Dining',
      health: 'Health',
      children: 'Children',
      pets: 'Pets',
      personal: 'Personal Care',
      entertainment: 'Entertainment',
      subscriptions: 'Subscriptions',
      debt: 'Debt',
      savings: 'Savings & Goals',
      giving: 'Giving',
      other: 'Other',
    };

    for (const categoryKey of builtInCategoriesUsed) {
      const categoryLabel = builtInCategoryLabels[categoryKey] || categoryKey;
      const sortOrder = categoryOrder?.indexOf(categoryKey) ?? 999;

      // Check if category already exists for this user
      const { data: existingCategory } = await supabase
        .from("envelope_categories")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", categoryLabel)
        .maybeSingle();

      if (existingCategory) {
        categoryIdMap.set(categoryKey, existingCategory.id);
      } else {
        const { data: createdCategory, error: categoryError } = await supabase
          .from("envelope_categories")
          .insert({
            user_id: userId,
            name: categoryLabel,
            sort_order: sortOrder,
          })
          .select("id")
          .single();

        if (categoryError) {
          console.error("Built-in category creation error:", categoryError);
        } else if (createdCategory) {
          categoryIdMap.set(categoryKey, createdCategory.id);
        }
      }
    }

    // 4. Create envelopes (we need their IDs for allocations)
    const envelopeIdMap = new Map<string, string>(); // Map from temp ID to real ID

    if (envelopes.length > 0) {
      for (const envelope of envelopes) {
        // Resolve category ID
        const categoryId = envelope.category ? categoryIdMap.get(envelope.category) : null;

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
          sort_order: envelope.sortOrder ?? 0, // Include sort order
          category_id: categoryId, // Include category reference
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

    // 3.5. Create opening balance transactions if provided
    if (openingBalances && Object.keys(openingBalances).length > 0) {
      const allocations = [];

      for (const [tempEnvelopeId, amount] of Object.entries(openingBalances)) {
        const realEnvelopeId = envelopeIdMap.get(tempEnvelopeId);
        const envelope = envelopes.find(e => e.id === tempEnvelopeId);

        if (realEnvelopeId && envelope && amount > 0) {
          allocations.push({
            envelope_id: realEnvelopeId,
            envelope_name: envelope.name,
            amount,
          });
        }
      }

      if (allocations.length > 0) {
        const result = await createOpeningBalanceTransactions(
          supabase,
          userId,
          allocations
        );

        if (!result.success) {
          console.error("Opening balance transactions error:", result.error);
          // Continue anyway - this is not critical to onboarding completion
        } else {
          console.log(`Created ${result.transactions_created} opening balance transactions`);
        }
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
