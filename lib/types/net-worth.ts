export type AssetRow = {
  id: string;
  name: string;
  asset_type: string;
  current_value: number | string;
  notes: string | null;
  updated_at?: string | null;
};

export type LiabilityRow = {
  id: string;
  name: string;
  liability_type: string;
  current_balance: number | string;
  interest_rate: number | string | null;
  notes: string | null;
  updated_at?: string | null;
};

export type NetWorthSnapshotRow = {
  id: string;
  snapshot_date: string;
  total_assets: number | string;
  total_liabilities: number | string;
  net_worth: number | string;
};
