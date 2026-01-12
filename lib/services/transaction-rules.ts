import { SupabaseClient } from "@supabase/supabase-js";
import type { MatchType } from "@/lib/types/rules";

interface TransactionRule {
  id: string;
  pattern: string;
  merchant_normalized: string | null;
  envelope_id: string;
  match_type: MatchType;
  case_sensitive: boolean;
  is_active: boolean;
}

interface RuleMatchResult {
  matched: boolean;
  ruleId?: string;
  envelopeId?: string;
  envelopeName?: string;
  confidence: "exact" | "high" | "medium" | "low";
  reason?: string;
}

interface ApplyRulesResult {
  applied: boolean;
  ruleId?: string;
  envelopeId?: string;
  envelopeName?: string;
  transactionUpdated: boolean;
  error?: string;
  reason?: string;
}

/**
 * Check if a merchant name matches a rule pattern
 */
function matchesPattern(
  merchantName: string,
  pattern: string,
  matchType: MatchType,
  caseSensitive: boolean
): boolean {
  const merchant = caseSensitive ? merchantName : merchantName.toLowerCase();
  const matchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  switch (matchType) {
    case "exact":
      return merchant === matchPattern;
    case "starts_with":
      return merchant.startsWith(matchPattern);
    case "contains":
      return merchant.includes(matchPattern);
    default:
      return false;
  }
}

/**
 * Find the best matching rule for a merchant name
 */
export async function findMatchingRule(
  supabase: SupabaseClient,
  userId: string,
  merchantName: string
): Promise<RuleMatchResult> {
  if (!merchantName || merchantName.trim() === "") {
    return { matched: false, confidence: "low", reason: "No merchant name provided" };
  }

  // Fetch all active rules for this user, ordered by specificity
  // (exact matches first, then starts_with, then contains)
  const { data: rules, error } = await supabase
    .from("transaction_rules")
    .select("id, pattern, merchant_normalized, envelope_id, match_type, case_sensitive, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("match_type", { ascending: true }); // exact < starts_with < contains

  if (error || !rules || rules.length === 0) {
    return { matched: false, confidence: "low", reason: "No active rules found" };
  }

  // Sort rules by match type priority (exact > starts_with > contains)
  const priorityOrder: Record<MatchType, number> = {
    exact: 1,
    starts_with: 2,
    contains: 3,
  };

  const sortedRules = [...rules].sort((a, b) => {
    const priorityA = priorityOrder[a.match_type as MatchType] || 4;
    const priorityB = priorityOrder[b.match_type as MatchType] || 4;
    return priorityA - priorityB;
  });

  // Find the first matching rule
  for (const rule of sortedRules as TransactionRule[]) {
    const pattern = rule.pattern || rule.merchant_normalized || "";
    if (matchesPattern(merchantName, pattern, rule.match_type, rule.case_sensitive)) {
      // Get envelope name for the match
      const { data: envelope } = await supabase
        .from("envelopes")
        .select("name")
        .eq("id", rule.envelope_id)
        .single();

      const confidence: RuleMatchResult["confidence"] =
        rule.match_type === "exact" ? "exact" :
        rule.match_type === "starts_with" ? "high" : "medium";

      return {
        matched: true,
        ruleId: rule.id,
        envelopeId: rule.envelope_id,
        envelopeName: envelope?.name,
        confidence,
        reason: `Matched rule: "${pattern}" (${rule.match_type})`,
      };
    }
  }

  return { matched: false, confidence: "low", reason: "No matching rule found" };
}

/**
 * Apply rules to a transaction and update the envelope assignment
 * This is the main function called when a transaction is created/imported
 */
export async function applyRulesToTransaction(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  merchantName: string,
  skipIfAlreadyAssigned: boolean = true
): Promise<ApplyRulesResult> {
  try {
    // First check if transaction already has an envelope assigned
    if (skipIfAlreadyAssigned) {
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("envelope_id")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .single();

      if (existingTx?.envelope_id) {
        return {
          applied: false,
          transactionUpdated: false,
          reason: "Transaction already has an envelope assigned",
        };
      }
    }

    // Find matching rule
    const matchResult = await findMatchingRule(supabase, userId, merchantName);

    if (!matchResult.matched || !matchResult.envelopeId) {
      return {
        applied: false,
        transactionUpdated: false,
        reason: matchResult.reason,
      };
    }

    // Update the transaction with the matched envelope
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        envelope_id: matchResult.envelopeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("user_id", userId);

    if (updateError) {
      return {
        applied: false,
        transactionUpdated: false,
        error: updateError.message,
      };
    }

    // Log the rule application for analytics (best-effort)
    try {
      await supabase.from("rule_application_logs").insert({
        user_id: userId,
        transaction_id: transactionId,
        rule_id: matchResult.ruleId,
        envelope_id: matchResult.envelopeId,
        merchant_name: merchantName,
        confidence: matchResult.confidence,
      });
    } catch {
      // Silently fail if log table doesn't exist
    }

    return {
      applied: true,
      ruleId: matchResult.ruleId,
      envelopeId: matchResult.envelopeId,
      envelopeName: matchResult.envelopeName,
      transactionUpdated: true,
    };
  } catch (error: any) {
    return {
      applied: false,
      transactionUpdated: false,
      error: error.message,
    };
  }
}

/**
 * Apply rules to multiple transactions (batch processing)
 * Used for CSV imports and bank sync
 */
export async function applyRulesToTransactions(
  supabase: SupabaseClient,
  userId: string,
  transactions: Array<{ id: string; merchantName: string }>
): Promise<{
  processed: number;
  matched: number;
  results: ApplyRulesResult[];
}> {
  const results: ApplyRulesResult[] = [];
  let matched = 0;

  for (const tx of transactions) {
    const result = await applyRulesToTransaction(
      supabase,
      userId,
      tx.id,
      tx.merchantName
    );
    results.push(result);
    if (result.applied) matched++;
  }

  return {
    processed: transactions.length,
    matched,
    results,
  };
}

/**
 * Create a rule from a transaction approval
 * Called when user assigns an envelope to a transaction
 */
export async function createRuleFromApproval(
  supabase: SupabaseClient,
  userId: string,
  merchantName: string,
  envelopeId: string,
  matchType: MatchType = "contains"
): Promise<{ created: boolean; ruleId?: string; error?: string }> {
  if (!merchantName || merchantName.trim() === "") {
    return { created: false, error: "Merchant name is required" };
  }

  // Check if a similar rule already exists
  const { data: existingRules } = await supabase
    .from("transaction_rules")
    .select("id, pattern, envelope_id")
    .eq("user_id", userId)
    .ilike("pattern", merchantName);

  if (existingRules && existingRules.length > 0) {
    // Update existing rule if envelope is different
    const existingRule = existingRules[0];
    if (existingRule.envelope_id !== envelopeId) {
      const { error: updateError } = await supabase
        .from("transaction_rules")
        .update({
          envelope_id: envelopeId,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRule.id);

      if (updateError) {
        return { created: false, error: updateError.message };
      }
      return { created: true, ruleId: existingRule.id };
    }
    return { created: false, error: "Rule already exists for this merchant" };
  }

  // Create new rule
  const normalized = merchantName.toLowerCase().trim();
  const { data: newRule, error: createError } = await supabase
    .from("transaction_rules")
    .insert({
      user_id: userId,
      pattern: merchantName.trim(),
      merchant_normalized: normalized,
      envelope_id: envelopeId,
      match_type: matchType,
      case_sensitive: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError) {
    return { created: false, error: createError.message };
  }

  return { created: true, ruleId: newRule?.id };
}

/**
 * Get rule suggestions based on merchant patterns in unassigned transactions
 */
export async function getSuggestedRules(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10
): Promise<Array<{
  merchantName: string;
  transactionCount: number;
  suggestedEnvelopeId?: string;
  suggestedEnvelopeName?: string;
}>> {
  // Find merchants with multiple unassigned transactions
  const { data: unassigned } = await supabase
    .from("transactions")
    .select("merchant_name")
    .eq("user_id", userId)
    .is("envelope_id", null)
    .not("merchant_name", "is", null);

  if (!unassigned || unassigned.length === 0) {
    return [];
  }

  // Count occurrences of each merchant
  const merchantCounts = new Map<string, number>();
  for (const tx of unassigned) {
    const merchant = tx.merchant_name?.trim() || "";
    if (merchant) {
      merchantCounts.set(merchant, (merchantCounts.get(merchant) || 0) + 1);
    }
  }

  // Sort by count and take top N
  const sorted = Array.from(merchantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // For each merchant, check if they have any previously assigned transactions
  const suggestions = [];
  for (const [merchantName, count] of sorted) {
    // Find most common envelope for this merchant from past assignments
    const { data: pastAssignments } = await supabase
      .from("transactions")
      .select("envelope_id, envelopes(name)")
      .eq("user_id", userId)
      .eq("merchant_name", merchantName)
      .not("envelope_id", "is", null)
      .limit(10);

    let suggestedEnvelopeId: string | undefined;
    let suggestedEnvelopeName: string | undefined;

    if (pastAssignments && pastAssignments.length > 0) {
      // Find most common envelope
      const envelopeCounts = new Map<string, number>();
      for (const pa of pastAssignments) {
        if (pa.envelope_id) {
          envelopeCounts.set(pa.envelope_id, (envelopeCounts.get(pa.envelope_id) || 0) + 1);
        }
      }
      const mostCommon = Array.from(envelopeCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (mostCommon) {
        suggestedEnvelopeId = mostCommon[0];
        const match = pastAssignments.find(pa => pa.envelope_id === suggestedEnvelopeId);
        suggestedEnvelopeName = (match?.envelopes as any)?.name;
      }
    }

    suggestions.push({
      merchantName,
      transactionCount: count,
      suggestedEnvelopeId,
      suggestedEnvelopeName,
    });
  }

  return suggestions;
}
