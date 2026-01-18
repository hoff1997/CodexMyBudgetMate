import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EnvelopeData, BankAccount, IncomeSource } from "@/app/(app)/onboarding/unified-onboarding-client";
import type { CreditCardConfig } from "@/lib/types/credit-card-onboarding";
import { createOpeningBalanceTransactions } from "@/lib/server/create-opening-balance-transactions";
import { getCurrentBillingCycle, findOrCreateDebtCategory } from "@/lib/utils/credit-card-onboarding-utils";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
} from "@/lib/utils/api-error";

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
      return createUnauthorizedError();
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const {
      fullName,
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
    if (!fullName) {
      return createValidationError("Missing required profile data");
    }

    if (!envelopes || envelopes.length === 0) {
      return createValidationError("At least one envelope is required");
    }

    if (!incomeSources || incomeSources.length === 0) {
      return createValidationError("At least one income source is required");
    }

    console.log("Processing onboarding for user:", userId, {
      envelopesCount: envelopes.length,
      incomeSourcesCount: incomeSources.length,
      bankAccountsCount: bankAccounts.length,
      creditCardConfigsCount: creditCardConfigs?.length || 0,
    });

    // Start transaction-like operations
    // 1. Update profile with name and onboarding_completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        onboarding_completed: true,
        show_onboarding_menu: false,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return createErrorResponse(profileError, 500, "Failed to update profile");
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
    // Create payoff envelopes for cards with debt (NOT per-card CC Holding)
    // The single "CC Holding" system envelope is created via suggested-envelopes.ts
    const payoffEnvelopes: Array<{
      card_name: string;
      balance: number;
      envelope_id: string;
      minimum_payment: number;
    }> = [];

    if (creditCardConfigs && creditCardConfigs.length > 0) {
      // Get or create "Debt" category for payoff envelopes
      const debtCategoryId = await findOrCreateDebtCategory(supabase, userId);

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
            // CC Holding is locked by default until all debt is paid off
            cc_holding_locked: ccConfig.usageType !== 'pay_in_full',
          })
          .eq("id", realAccountId);

        if (ccAccountError) {
          console.error("CC account update error:", ccAccountError);
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
              opening_holding_amount: 0,
              current_holding_amount: 0,
              new_spending_total: 0,
              is_current_cycle: true,
            });

          if (cycleError) {
            console.error("CC cycle record error:", cycleError);
          }
        }

        // For paying_down or minimum_only types, create payoff envelope and projection
        if ((ccConfig.usageType === 'paying_down' || ccConfig.usageType === 'minimum_only') &&
            ccConfig.startingDebtAmount && ccConfig.startingDebtAmount > 0) {

          // Calculate minimum payment (use provided or default to 2% of balance)
          const minimumPayment = ccConfig.minimumPayment || Math.ceil(ccConfig.startingDebtAmount * 0.02);

          // Create payoff envelope with debt subtype
          const { data: payoffEnvelope, error: payoffError } = await supabase
            .from("envelopes")
            .insert({
              user_id: userId,
              name: `${ccConfig.accountName} Payoff`,
              icon: "💳",
              subtype: "debt",
              is_debt: true,
              target_amount: minimumPayment,
              current_amount: 0,
              frequency: "monthly",
              due_date: ccConfig.billingCycle?.paymentDueDay,
              category_id: debtCategoryId,
              priority: "essential",
              cc_account_id: realAccountId,
              envelope_type: "expense",
              is_spending: false,
              is_goal: false,
              notes: `Debt payoff for ${ccConfig.accountName}`,
            })
            .select("id")
            .single();

          if (payoffError) {
            console.error("CC Payoff envelope error:", payoffError);
          } else if (payoffEnvelope) {
            payoffEnvelopes.push({
              card_name: ccConfig.accountName,
              balance: ccConfig.startingDebtAmount,
              envelope_id: payoffEnvelope.id,
              minimum_payment: minimumPayment,
            });

            // Create debt_item entry for this credit card debt
            const { error: debtItemError } = await supabase
              .from("debt_items")
              .insert({
                user_id: userId,
                envelope_id: payoffEnvelope.id,
                name: ccConfig.accountName,
                debt_type: 'credit_card',
                linked_account_id: realAccountId,
                starting_balance: ccConfig.startingDebtAmount,
                current_balance: ccConfig.startingDebtAmount,
                interest_rate: ccConfig.apr || null,
                minimum_payment: minimumPayment,
                display_order: 0,
              });

            if (debtItemError) {
              console.error("Debt item creation error:", debtItemError);
            }
          }

          // Create payoff projection
          if (ccConfig.apr && ccConfig.minimumPayment) {
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

      // Create debt snowball plan if there are debts to pay off
      if (payoffEnvelopes.length > 0) {
        // Sort by balance (smallest first) for snowball method
        const sortedDebts = payoffEnvelopes
          .sort((a, b) => a.balance - b.balance)
          .map((d, index) => ({
            ...d,
            order: index,
            paid_off_at: null,
          }));

        const totalDebt = sortedDebts.reduce((sum, d) => sum + d.balance, 0);

        const { error: planError } = await supabase
          .from("debt_snowball_plan")
          .insert({
            user_id: userId,
            plan_type: "balanced",
            phase: "starter_stash", // Always start with building Starter Stash
            debts: sortedDebts,
            total_debt_monthly: Math.ceil(totalDebt / 24), // Rough 2-year payoff estimate
          });

        if (planError) {
          console.error("Debt snowball plan creation error:", planError);
        } else {
          console.log(`Created debt snowball plan with ${sortedDebts.length} debts`);
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
          return createErrorResponse(envelopeError, 500, "Failed to create envelopes");
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
          return createErrorResponse(incomeError, 500, "Failed to create income sources");
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
    return createErrorResponse(error as { message: string }, 500, "Internal server error");
  }
}
