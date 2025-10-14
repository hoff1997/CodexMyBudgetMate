export type AccountRow = {
  id: string;
  name: string;
  type: string;
  current_balance: number | string | null;
  institution: string | null;
  reconciled?: boolean | null;
  updated_at?: string | null;
};
