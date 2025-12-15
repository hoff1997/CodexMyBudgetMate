/**
 * NZ Bank Presets
 *
 * Predefined column mappings for major New Zealand banks.
 * These presets are used for auto-detection when a user uploads a CSV.
 */

import type { BankPreset } from "./types";

/**
 * ASB Bank CSV format
 * Standard export from ASB internet banking
 */
const ASB_PRESET: BankPreset = {
  id: "asb",
  name: "ASB Bank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Payee",
  referenceColumn: "Reference",
  memoColumn: "Memo",
  identifyingColumns: ["Date", "Amount", "Payee", "Reference"],
};

/**
 * ANZ Bank CSV format
 * Uses separate debit/credit columns
 */
const ANZ_PRESET: BankPreset = {
  id: "anz",
  name: "ANZ Bank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "split",
  debitColumn: "Debit Amount",
  creditColumn: "Credit Amount",
  descriptionColumn: "Details",
  referenceColumn: "Reference",
  identifyingColumns: ["Date", "Debit Amount", "Credit Amount", "Details"],
};

/**
 * BNZ Bank CSV format
 * Bank of New Zealand standard export
 */
const BNZ_PRESET: BankPreset = {
  id: "bnz",
  name: "BNZ",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Payee",
  referenceColumn: "Reference",
  memoColumn: "Particulars",
  identifyingColumns: ["Date", "Amount", "Payee", "Particulars"],
};

/**
 * Westpac Bank CSV format
 */
const WESTPAC_PRESET: BankPreset = {
  id: "westpac",
  name: "Westpac",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  memoColumn: "Other Party",
  identifyingColumns: ["Date", "Amount", "Description", "Other Party"],
};

/**
 * Kiwibank CSV format
 */
const KIWIBANK_PRESET: BankPreset = {
  id: "kiwibank",
  name: "Kiwibank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  memoColumn: "Particulars",
  identifyingColumns: ["Date", "Amount", "Description", "Particulars"],
};

/**
 * TSB Bank CSV format
 */
const TSB_PRESET: BankPreset = {
  id: "tsb",
  name: "TSB Bank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  identifyingColumns: ["Date", "Amount", "Description"],
};

/**
 * Rabobank NZ CSV format
 */
const RABOBANK_PRESET: BankPreset = {
  id: "rabobank",
  name: "Rabobank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  identifyingColumns: ["Date", "Amount", "Description"],
};

/**
 * SBS Bank CSV format
 */
const SBS_PRESET: BankPreset = {
  id: "sbs",
  name: "SBS Bank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  identifyingColumns: ["Date", "Amount", "Description"],
};

/**
 * Co-operative Bank CSV format
 */
const COOP_PRESET: BankPreset = {
  id: "coop",
  name: "Co-operative Bank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  identifyingColumns: ["Date", "Amount", "Description"],
};

/**
 * Heartland Bank CSV format
 */
const HEARTLAND_PRESET: BankPreset = {
  id: "heartland",
  name: "Heartland Bank",
  dateColumn: "Date",
  dateFormat: "DD/MM/YYYY",
  amountFormat: "signed",
  amountColumn: "Amount",
  descriptionColumn: "Description",
  referenceColumn: "Reference",
  identifyingColumns: ["Date", "Amount", "Description"],
};

/**
 * All available bank presets
 */
export const NZ_BANK_PRESETS: Record<string, BankPreset> = {
  asb: ASB_PRESET,
  anz: ANZ_PRESET,
  bnz: BNZ_PRESET,
  westpac: WESTPAC_PRESET,
  kiwibank: KIWIBANK_PRESET,
  tsb: TSB_PRESET,
  rabobank: RABOBANK_PRESET,
  sbs: SBS_PRESET,
  coop: COOP_PRESET,
  heartland: HEARTLAND_PRESET,
};

/**
 * Get a bank preset by ID
 */
export function getBankPreset(id: string): BankPreset | undefined {
  return NZ_BANK_PRESETS[id];
}

/**
 * Get all bank presets as an array (for dropdowns)
 */
export function getAllBankPresets(): BankPreset[] {
  return Object.values(NZ_BANK_PRESETS);
}

/**
 * Attempt to detect which bank preset matches the given headers
 *
 * @param headers - Column headers from the CSV
 * @returns The matching preset ID, or null if no match
 */
export function detectBankPreset(headers: string[]): string | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  // Score each preset based on how many identifying columns match
  let bestMatch: { id: string; score: number } | null = null;

  for (const preset of Object.values(NZ_BANK_PRESETS)) {
    if (!preset.identifyingColumns) continue;

    const matchCount = preset.identifyingColumns.filter((col) =>
      normalizedHeaders.includes(col.toLowerCase())
    ).length;

    const score = matchCount / preset.identifyingColumns.length;

    // Require at least 75% of identifying columns to match
    if (score >= 0.75 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: preset.id, score };
    }
  }

  return bestMatch?.id ?? null;
}

/**
 * Common column name patterns for fuzzy matching
 * Used when no bank preset is detected
 */
export const COMMON_COLUMN_PATTERNS = {
  date: [
    "date",
    "transaction date",
    "trans date",
    "posted date",
    "value date",
    "effective date",
  ],
  amount: [
    "amount",
    "transaction amount",
    "trans amount",
    "value",
    "sum",
  ],
  debit: [
    "debit",
    "debit amount",
    "withdrawal",
    "withdrawals",
    "money out",
    "dr",
  ],
  credit: [
    "credit",
    "credit amount",
    "deposit",
    "deposits",
    "money in",
    "cr",
  ],
  description: [
    "description",
    "details",
    "payee",
    "merchant",
    "narrative",
    "transaction description",
    "particulars",
    "name",
  ],
  reference: [
    "reference",
    "ref",
    "reference number",
    "trans ref",
    "transaction reference",
    "code",
  ],
  memo: [
    "memo",
    "notes",
    "other party",
    "particulars",
    "analysis",
  ],
};

/**
 * Try to match a column header to a field type using fuzzy matching
 *
 * @param header - The column header to match
 * @returns The matched field type, or null if no match
 */
export function fuzzyMatchColumn(
  header: string
): "date" | "amount" | "debit" | "credit" | "description" | "reference" | "memo" | null {
  const normalized = header.toLowerCase().trim();

  for (const [field, patterns] of Object.entries(COMMON_COLUMN_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalized === pattern || normalized.includes(pattern)) {
        return field as "date" | "amount" | "debit" | "credit" | "description" | "reference" | "memo";
      }
    }
  }

  return null;
}
