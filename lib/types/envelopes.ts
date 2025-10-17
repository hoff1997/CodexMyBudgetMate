export type RawTransferRow = {
  id: string;
  amount: number | string | null;
  note: string | null;
  created_at: string;
  from_envelope: { id: string | null; name: string | null } | null;
  to_envelope: { id: string | null; name: string | null } | null;
};

export type TransferHistoryItem = {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  from: { id: string | null; name: string | null };
  to: { id: string | null; name: string | null };
};

function normaliseEnvelope(envelope: { id: string | null; name: string | null } | null) {
  if (!envelope) {
    return { id: null, name: null };
  }
  return {
    id: envelope.id ?? null,
    name: envelope.name ?? null,
  };
}

export function mapTransferHistory(rows: RawTransferRow[] | null | undefined): TransferHistoryItem[] {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    note: row.note ?? null,
    createdAt: row.created_at,
    from: normaliseEnvelope(row.from_envelope ?? null),
    to: normaliseEnvelope(row.to_envelope ?? null),
  }));
}
