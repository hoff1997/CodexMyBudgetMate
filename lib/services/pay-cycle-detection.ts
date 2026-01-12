import type { SupabaseClient } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  merchant_name?: string | null;
  description?: string | null;
  occurred_at: string;
}

interface IncomeSource {
  id: string;
  name: string;
  typical_amount: number | null;
  pay_cycle: string;
  next_pay_date: string | null;
  is_active: boolean;
  detection_rule_id: string | null;
}

interface DetectionResult {
  matched: boolean;
  incomeSourceId?: string;
  incomeSourceName?: string;
  confidence: number;
  reason?: string;
  advancedPayDate?: boolean;
  newNextPayDate?: string | null;
}

/**
 * Detect if a transaction matches an income source and trigger pay cycle updates
 *
 * This function combines:
 * 1. Pattern-based matching (using transaction_rules linked to income sources)
 * 2. Amount-based matching (within tolerance)
 * 3. Pay cycle advancement when a match is found
 */
export async function detectAndProcessIncome(
  supabase: SupabaseClient,
  userId: string,
  transaction: Transaction
): Promise<DetectionResult> {
  // Only process positive amounts (credits/income)
  if (transaction.amount <= 0) {
    return { matched: false, confidence: 0, reason: "Not a credit transaction" };
  }

  // Fetch active income sources with their detection rules
  const { data: incomeSources, error: fetchError } = await supabase
    .from("income_sources")
    .select(`
      id,
      name,
      typical_amount,
      pay_cycle,
      next_pay_date,
      is_active,
      detection_rule_id,
      detection_rule:transaction_rules(
        id,
        pattern,
        merchant_normalized,
        match_type,
        case_sensitive
      )
    `)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (fetchError || !incomeSources || incomeSources.length === 0) {
    return { matched: false, confidence: 0, reason: "No active income sources" };
  }

  const searchText = `${transaction.merchant_name || ""} ${transaction.description || ""}`.trim();
  if (!searchText) {
    return { matched: false, confidence: 0, reason: "No transaction description" };
  }

  let bestMatch: IncomeSource | null = null;
  let highestConfidence = 0;
  let matchedByRule = false;

  for (const source of incomeSources as any[]) {
    let confidence = 0;
    let ruleMatched = false;

    // Check rule-based matching first (highest priority)
    if (source.detection_rule) {
      const rule = source.detection_rule;
      const pattern = rule.pattern || rule.merchant_normalized;

      if (pattern) {
        const textToMatch = rule.case_sensitive ? searchText : searchText.toUpperCase();
        const patternToMatch = rule.case_sensitive ? pattern : pattern.toUpperCase();

        if (rule.match_type === "exact") {
          ruleMatched = textToMatch === patternToMatch;
        } else if (rule.match_type === "starts_with") {
          ruleMatched = textToMatch.startsWith(patternToMatch);
        } else {
          // contains (default)
          ruleMatched = textToMatch.includes(patternToMatch);
        }

        if (ruleMatched) {
          confidence += 0.6; // Rule match is 60% confidence
        }
      }
    }

    // Amount matching (adds to confidence)
    if (source.typical_amount) {
      const amountDiff = Math.abs(transaction.amount - source.typical_amount);
      const tolerancePercent = 0.1; // 10% tolerance
      const tolerance = source.typical_amount * tolerancePercent;

      if (amountDiff <= tolerance) {
        const amountScore = 1 - (amountDiff / tolerance);
        confidence += 0.3 * amountScore; // Amount match adds up to 30%
      }
    }

    // Name matching (fallback for sources without rules)
    if (!ruleMatched) {
      const sourceName = source.name.toLowerCase();
      if (searchText.toLowerCase().includes(sourceName)) {
        confidence += 0.2; // Name match adds 20%
      }
    }

    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = source;
      matchedByRule = ruleMatched;
    }
  }

  // Require at least 50% confidence to match
  if (highestConfidence < 0.5 || !bestMatch) {
    return {
      matched: false,
      confidence: highestConfidence,
      reason: "Confidence too low for automatic matching",
    };
  }

  // Advance pay cycle date
  const advanceResult = await advancePayCycle(
    supabase,
    bestMatch.id,
    transaction.id,
    transaction.occurred_at,
    transaction.amount
  );

  return {
    matched: true,
    incomeSourceId: bestMatch.id,
    incomeSourceName: bestMatch.name,
    confidence: highestConfidence,
    reason: matchedByRule ? "Matched by rule" : "Matched by name/amount",
    advancedPayDate: advanceResult.success,
    newNextPayDate: advanceResult.newDate,
  };
}

/**
 * Calculate the next pay date based on pay cycle
 */
function calculateNextPayDate(fromDate: Date, payCycle: string): Date {
  const result = new Date(fromDate);

  switch (payCycle) {
    case "weekly":
      result.setDate(result.getDate() + 7);
      break;
    case "fortnightly":
      result.setDate(result.getDate() + 14);
      break;
    case "four-weekly":
      result.setDate(result.getDate() + 28);
      break;
    case "monthly":
      result.setMonth(result.getMonth() + 1);
      break;
    case "twice-monthly":
      // Approximate: advance by 15 days
      result.setDate(result.getDate() + 15);
      break;
    default:
      // Default to fortnightly
      result.setDate(result.getDate() + 14);
  }

  return result;
}

interface AdvanceResult {
  success: boolean;
  previousDate: string | null;
  newDate: string | null;
  error?: string;
}

/**
 * Advance the next_pay_date for an income source after a transaction is matched
 */
async function advancePayCycle(
  supabase: SupabaseClient,
  incomeSourceId: string,
  transactionId: string,
  transactionDate: string,
  transactionAmount: number
): Promise<AdvanceResult> {
  try {
    // Get current income source details
    const { data: incomeSource, error: fetchError } = await supabase
      .from("income_sources")
      .select("id, user_id, next_pay_date, pay_cycle, typical_amount")
      .eq("id", incomeSourceId)
      .single();

    if (fetchError || !incomeSource) {
      return {
        success: false,
        previousDate: null,
        newDate: null,
        error: "Income source not found",
      };
    }

    const previousDate = incomeSource.next_pay_date;
    const txDate = new Date(transactionDate);
    const newDate = calculateNextPayDate(txDate, incomeSource.pay_cycle);
    const newDateStr = newDate.toISOString().split("T")[0];

    // Update the income source with new next_pay_date
    const { error: updateError } = await supabase
      .from("income_sources")
      .update({
        next_pay_date: newDateStr,
        last_reconciled_date: transactionDate,
        last_reconciled_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incomeSourceId);

    if (updateError) {
      console.error("Failed to advance next_pay_date:", updateError);
      return {
        success: false,
        previousDate,
        newDate: null,
        error: updateError.message,
      };
    }

    // Log reconciliation event (best-effort)
    await supabase
      .from("income_reconciliation_events")
      .insert({
        user_id: incomeSource.user_id,
        income_source_id: incomeSourceId,
        transaction_id: transactionId,
        expected_amount: incomeSource.typical_amount,
        actual_amount: transactionAmount,
        expected_date: previousDate,
        actual_date: transactionDate,
        previous_next_pay_date: previousDate,
        new_next_pay_date: newDateStr,
      })
      .catch((err) => {
        console.warn("Failed to log reconciliation event:", err);
      });

    console.log(`✅ Pay cycle advanced for income source ${incomeSourceId}: ${previousDate} → ${newDateStr}`);

    return {
      success: true,
      previousDate,
      newDate: newDateStr,
    };
  } catch (error: unknown) {
    console.error("Error advancing pay cycle:", error);
    return {
      success: false,
      previousDate: null,
      newDate: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a detection rule for an income source
 * Called when user manually assigns a transaction to an income source
 */
export async function createIncomeDetectionRule(
  supabase: SupabaseClient,
  userId: string,
  incomeSourceId: string,
  merchantName: string,
  matchType: "contains" | "exact" | "starts_with" = "contains"
): Promise<{ created: boolean; ruleId?: string; error?: string }> {
  try {
    // Check if rule already exists for this income source
    const { data: existingSource } = await supabase
      .from("income_sources")
      .select("detection_rule_id")
      .eq("id", incomeSourceId)
      .single();

    if (existingSource?.detection_rule_id) {
      // Update existing rule
      const { error: updateError } = await supabase
        .from("transaction_rules")
        .update({
          pattern: merchantName,
          merchant_normalized: merchantName.toLowerCase().trim(),
          match_type: matchType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSource.detection_rule_id);

      if (updateError) {
        return { created: false, error: updateError.message };
      }

      return { created: true, ruleId: existingSource.detection_rule_id };
    }

    // Create new rule
    const { data: rule, error: ruleError } = await supabase
      .from("transaction_rules")
      .insert({
        user_id: userId,
        pattern: merchantName,
        merchant_normalized: merchantName.toLowerCase().trim(),
        match_type: matchType,
        case_sensitive: false,
        is_income_rule: true,
      })
      .select()
      .single();

    if (ruleError || !rule) {
      return { created: false, error: ruleError?.message || "Failed to create rule" };
    }

    // Link rule to income source
    const { error: linkError } = await supabase
      .from("income_sources")
      .update({
        detection_rule_id: rule.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incomeSourceId);

    if (linkError) {
      // Clean up the rule
      await supabase.from("transaction_rules").delete().eq("id", rule.id);
      return { created: false, error: linkError.message };
    }

    return { created: true, ruleId: rule.id };
  } catch (error: unknown) {
    console.error("Error creating income detection rule:", error);
    return {
      created: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
