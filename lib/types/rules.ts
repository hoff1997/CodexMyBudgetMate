export type MatchType = "contains" | "starts_with" | "exact";

export type CategoryRule = {
  id: string;
  pattern: string;
  envelopeId: string;
  envelopeName?: string | null;
  envelopeIcon?: string | null;
  isActive: boolean;
  matchType: MatchType;
  caseSensitive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MerchantStat = {
  merchant: string;
  envelopeName: string | null;
  envelopeIcon?: string | null;
  matchRate: number;
  lastSeen: string | null;
};

export type RulesData = {
  rules: CategoryRule[];
  envelopes: Array<{ id: string; name: string; icon?: string | null }>;
  merchantStats: MerchantStat[];
  demoMode: boolean;
};
