import { createClient } from "@/lib/supabase/server";
import type { RulesData, CategoryRule, MerchantStat } from "@/lib/types/rules";

type RuleRecord = {
  id: string;
  pattern: string | null;
  merchant_normalized: string | null;
  envelope_id: string | null;
  is_active: boolean | null;
  match_type: string | null;
  case_sensitive: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type EnvelopeRecord = {
  id: string;
  name: string;
  icon: string | null;
};

type TransactionRecord = {
  id: string;
  merchant_name: string;
  envelope_id: string | null;
  occurred_at: string;
};

export async function fetchRulesData(): Promise<RulesData> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return getDemoRulesData();
  }

  const [rulesRes, envelopesRes, transactionsRes] = await Promise.all([
    supabase
      .from("category_rules")
      .select(
        "id, pattern, merchant_normalized, envelope_id, is_active, match_type, case_sensitive, created_at, updated_at",
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("envelopes")
      .select("id, name, icon")
      .eq("user_id", session.user.id)
      .order("name"),
    supabase
      .from("transactions")
      .select("id, merchant_name, envelope_id, occurred_at")
      .eq("user_id", session.user.id)
      .order("occurred_at", { ascending: false })
      .limit(250),
  ]);

  const rules = (rulesRes.data ?? []) as RuleRecord[];
  const envelopes = (envelopesRes.data ?? []) as EnvelopeRecord[];
  const transactions = (transactionsRes.data ?? []) as TransactionRecord[];

  return {
    rules: mapRules(rules, envelopes),
    envelopes: envelopes.map((envelope) => ({
      id: envelope.id,
      name: envelope.name,
      icon: envelope.icon,
    })),
    merchantStats: buildMerchantStats(transactions, envelopes),
    demoMode: false,
  };
}

function mapRules(rules: RuleRecord[], envelopes: EnvelopeRecord[]): CategoryRule[] {
  return rules.map((rule) => mapRuleRecord(rule, envelopes));
}

function buildMerchantStats(transactions: TransactionRecord[], envelopes: EnvelopeRecord[]): MerchantStat[] {
  if (!transactions.length) return [];

  const envelopeLookup = new Map(envelopes.map((env) => [env.id, env]));
  const counts = new Map<
    string,
    { total: number; matched: number; lastSeen: string | null; envelopeId: string | null }
  >();

  transactions.forEach((transaction) => {
    const merchant = transaction.merchant_name?.trim() || "Unknown";
    const existing =
      counts.get(merchant) ?? { total: 0, matched: 0, lastSeen: null, envelopeId: null };
    existing.total += 1;
    if (transaction.envelope_id) {
      existing.matched += 1;
      existing.envelopeId = transaction.envelope_id;
    }
    if (!existing.lastSeen || new Date(transaction.occurred_at) > new Date(existing.lastSeen)) {
      existing.lastSeen = transaction.occurred_at;
    }
    counts.set(merchant, existing);
  });

  const stats: MerchantStat[] = Array.from(counts.entries())
    .map(([merchant, info]) => {
      const envelope = info.envelopeId ? envelopeLookup.get(info.envelopeId) : undefined;
      return {
        merchant,
        envelopeName: envelope?.name ?? null,
        envelopeIcon: envelope?.icon ?? null,
        matchRate: info.total ? Math.round((info.matched / info.total) * 100) : 0,
        lastSeen: info.lastSeen,
      };
    })
    .sort(
      (a, b) =>
        b.matchRate - a.matchRate ||
        new Date(b.lastSeen ?? 0).getTime() - new Date(a.lastSeen ?? 0).getTime(),
    )
    .slice(0, 8);

  return stats;
}

function mapRuleRecord(rule: RuleRecord, envelopes: EnvelopeRecord[]): CategoryRule {
  const envelope = rule.envelope_id
    ? envelopes.find((env) => env.id === rule.envelope_id)
    : undefined;
  const pattern = (rule.pattern ?? rule.merchant_normalized ?? "").trim();
  return {
    id: rule.id,
    pattern,
    envelopeId: rule.envelope_id ?? "",
    envelopeName: envelope?.name ?? null,
    envelopeIcon: envelope?.icon ?? null,
    isActive: rule.is_active ?? true,
    matchType: (rule.match_type as CategoryRule["matchType"]) ?? "contains",
    caseSensitive: rule.case_sensitive ?? false,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at ?? rule.created_at,
  };
}

function getDemoRulesData(): RulesData {
  const now = new Date();
  const toIso = (date: Date) => date.toISOString();
  const demoEnvelopes = [
    { id: "env-grocery", name: "Groceries", icon: "🛒" },
    { id: "env-transport", name: "Transport", icon: "🚌" },
    { id: "env-eating", name: "Dining out", icon: "🍽️" },
    { id: "env-utilities", name: "Utilities", icon: "💡" },
  ];

  const demoRules: CategoryRule[] = [
    {
      id: "rule-countdown",
      pattern: "Countdown",
      envelopeId: "env-grocery",
      envelopeName: "Groceries",
      envelopeIcon: "🛒",
      isActive: true,
      matchType: "contains",
      caseSensitive: false,
      createdAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 40)),
      updatedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6)),
    },
    {
      id: "rule-z",
      pattern: "Z Energy",
      envelopeId: "env-transport",
      envelopeName: "Transport",
      envelopeIcon: "🚌",
      isActive: true,
      matchType: "starts_with",
      caseSensitive: false,
      createdAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 26)),
      updatedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
    },
    {
      id: "rule-uber-eats",
      pattern: "UBER EATS",
      envelopeId: "env-eating",
      envelopeName: "Dining out",
      envelopeIcon: "🍽️",
      isActive: false,
      matchType: "exact",
      caseSensitive: true,
      createdAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 18)),
      updatedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10)),
    },
  ];

  const demoStats: MerchantStat[] = [
    {
      merchant: "Countdown Henderson",
      envelopeName: "Groceries",
      envelopeIcon: "🛒",
      matchRate: 95,
      lastSeen: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24)),
    },
    {
      merchant: "Z Energy Great South Rd",
      envelopeName: "Transport",
      envelopeIcon: "🚌",
      matchRate: 87,
      lastSeen: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
    },
    {
      merchant: "Genesis Energy",
      envelopeName: "Utilities",
      envelopeIcon: "💡",
      matchRate: 100,
      lastSeen: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 12)),
    },
  ];

  return {
    rules: demoRules,
    envelopes: demoEnvelopes,
    merchantStats: demoStats,
    demoMode: true,
  };
}
