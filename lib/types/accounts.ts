export type AccountRow = {
  id: string;
  name: string;
  type: string;
  current_balance: number | string | null;
  institution: string | null;
  reconciled?: boolean | null;
  updated_at?: string | null;
  /** User-friendly nickname for display (e.g., "Bills Account" instead of "ANZ Everyday Account") */
  nickname?: string | null;
};
