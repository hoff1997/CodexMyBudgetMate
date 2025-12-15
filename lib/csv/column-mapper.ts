/**
 * Column Mapper
 *
 * Handles auto-detection of column mappings and manual mapping configuration.
 * Uses bank presets for known formats and fuzzy matching for unknown formats.
 */

import type {
  ColumnMapping,
  ColumnMappingEntry,
  MappableField,
  BankPreset,
  DateFormat,
} from "./types";
import {
  detectBankPreset,
  getBankPreset,
  fuzzyMatchColumn,
} from "./bank-presets";
import { getColumnSamples } from "./csv-parser";

/**
 * Result of auto-detecting column mappings
 */
export interface AutoDetectResult {
  /** Detected bank preset ID (or null) */
  presetId: string | null;
  /** Suggested column mapping */
  mapping: ColumnMapping;
  /** Per-column mapping entries for UI */
  columnMappings: ColumnMappingEntry[];
  /** Confidence score (0-100) */
  confidence: number;
  /** Warnings about the detection */
  warnings: string[];
}

/**
 * Auto-detect column mappings from CSV headers
 *
 * @param headers - Column headers from CSV
 * @param rows - Data rows for sample extraction
 * @returns Detection result with suggested mappings
 */
export function autoDetectMapping(
  headers: string[],
  rows: string[][]
): AutoDetectResult {
  const warnings: string[] = [];

  // Try to detect bank preset first
  const presetId = detectBankPreset(headers);
  const preset = presetId ? getBankPreset(presetId) : null;

  if (preset) {
    // Use preset mapping
    return createMappingFromPreset(headers, rows, preset);
  }

  // Fall back to fuzzy matching
  return createMappingFromFuzzy(headers, rows, warnings);
}

/**
 * Create column mapping from a bank preset
 */
function createMappingFromPreset(
  headers: string[],
  rows: string[][],
  preset: BankPreset
): AutoDetectResult {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  // Find column indices
  const dateIndex = findColumnIndex(normalizedHeaders, preset.dateColumn);
  const descIndex = findColumnIndex(normalizedHeaders, preset.descriptionColumn);
  const refIndex = preset.referenceColumn
    ? findColumnIndex(normalizedHeaders, preset.referenceColumn)
    : undefined;
  const memoIndex = preset.memoColumn
    ? findColumnIndex(normalizedHeaders, preset.memoColumn)
    : undefined;

  // Handle amount columns based on format
  let amountIndex: number | undefined;
  let debitIndex: number | undefined;
  let creditIndex: number | undefined;

  if (preset.amountFormat === "split") {
    debitIndex = preset.debitColumn
      ? findColumnIndex(normalizedHeaders, preset.debitColumn)
      : undefined;
    creditIndex = preset.creditColumn
      ? findColumnIndex(normalizedHeaders, preset.creditColumn)
      : undefined;
  } else {
    amountIndex = preset.amountColumn
      ? findColumnIndex(normalizedHeaders, preset.amountColumn)
      : undefined;
  }

  // Build mapping
  const mapping: ColumnMapping = {
    dateColumnIndex: dateIndex ?? -1,
    dateFormat: preset.dateFormat,
    amountFormat: preset.amountFormat,
    descriptionColumnIndex: descIndex ?? -1,
    ...(amountIndex !== undefined && { amountColumnIndex: amountIndex }),
    ...(debitIndex !== undefined && { debitColumnIndex: debitIndex }),
    ...(creditIndex !== undefined && { creditColumnIndex: creditIndex }),
    ...(refIndex !== undefined && { referenceColumnIndex: refIndex }),
    ...(memoIndex !== undefined && { memoColumnIndex: memoIndex }),
  };

  // Build column mapping entries for UI
  const columnMappings = buildColumnMappings(headers, rows, mapping);

  // Calculate confidence
  const confidence = calculateConfidence(mapping, preset.amountFormat);

  return {
    presetId: preset.id,
    mapping,
    columnMappings,
    confidence,
    warnings: [],
  };
}

/**
 * Create column mapping using fuzzy matching
 */
function createMappingFromFuzzy(
  headers: string[],
  rows: string[][],
  warnings: string[]
): AutoDetectResult {
  const mapping: ColumnMapping = {
    dateColumnIndex: -1,
    dateFormat: "DD/MM/YYYY" as DateFormat, // Default to NZ format
    amountFormat: "signed",
    descriptionColumnIndex: -1,
  };

  let hasDebitCredit = false;

  // Try to match each header
  headers.forEach((header, index) => {
    const matched = fuzzyMatchColumn(header);

    switch (matched) {
      case "date":
        if (mapping.dateColumnIndex === -1) {
          mapping.dateColumnIndex = index;
        }
        break;
      case "amount":
        if (!mapping.amountColumnIndex && !hasDebitCredit) {
          mapping.amountColumnIndex = index;
        }
        break;
      case "debit":
        mapping.debitColumnIndex = index;
        hasDebitCredit = true;
        break;
      case "credit":
        mapping.creditColumnIndex = index;
        hasDebitCredit = true;
        break;
      case "description":
        if (mapping.descriptionColumnIndex === -1) {
          mapping.descriptionColumnIndex = index;
        }
        break;
      case "reference":
        if (!mapping.referenceColumnIndex) {
          mapping.referenceColumnIndex = index;
        }
        break;
      case "memo":
        if (!mapping.memoColumnIndex) {
          mapping.memoColumnIndex = index;
        }
        break;
    }
  });

  // Update amount format if debit/credit columns found
  if (hasDebitCredit) {
    mapping.amountFormat = "split";
    delete mapping.amountColumnIndex;
  }

  // Add warnings for missing required fields
  if (mapping.dateColumnIndex === -1) {
    warnings.push("Could not detect date column - please select manually");
  }
  if (
    mapping.amountFormat === "signed" &&
    mapping.amountColumnIndex === undefined
  ) {
    warnings.push("Could not detect amount column - please select manually");
  }
  if (
    mapping.amountFormat === "split" &&
    (mapping.debitColumnIndex === undefined ||
      mapping.creditColumnIndex === undefined)
  ) {
    warnings.push(
      "Could not detect debit/credit columns - please select manually"
    );
  }
  if (mapping.descriptionColumnIndex === -1) {
    warnings.push(
      "Could not detect description column - please select manually"
    );
  }

  // Build column mapping entries
  const columnMappings = buildColumnMappings(headers, rows, mapping);

  // Calculate confidence
  const confidence = calculateConfidence(mapping, mapping.amountFormat);

  return {
    presetId: null,
    mapping,
    columnMappings,
    confidence,
    warnings,
  };
}

/**
 * Find column index by name (case-insensitive)
 */
function findColumnIndex(
  normalizedHeaders: string[],
  columnName: string
): number | undefined {
  const normalized = columnName.toLowerCase().trim();
  const index = normalizedHeaders.indexOf(normalized);
  return index >= 0 ? index : undefined;
}

/**
 * Build column mapping entries for UI display
 */
function buildColumnMappings(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping
): ColumnMappingEntry[] {
  return headers.map((header, index) => {
    let mappedTo: MappableField = "ignore";

    if (index === mapping.dateColumnIndex) {
      mappedTo = "date";
    } else if (index === mapping.amountColumnIndex) {
      mappedTo = "amount";
    } else if (index === mapping.debitColumnIndex) {
      mappedTo = "debit";
    } else if (index === mapping.creditColumnIndex) {
      mappedTo = "credit";
    } else if (index === mapping.descriptionColumnIndex) {
      mappedTo = "description";
    } else if (index === mapping.referenceColumnIndex) {
      mappedTo = "reference";
    } else if (index === mapping.memoColumnIndex) {
      mappedTo = "memo";
    }

    return {
      header,
      index,
      mappedTo,
      sampleValues: getColumnSamples(rows, index),
    };
  });
}

/**
 * Calculate confidence score for a mapping
 */
function calculateConfidence(
  mapping: ColumnMapping,
  amountFormat: "signed" | "split" | "absolute"
): number {
  let score = 0;
  let maxScore = 0;

  // Required fields
  maxScore += 30;
  if (mapping.dateColumnIndex >= 0) score += 30;

  maxScore += 30;
  if (amountFormat === "signed" && mapping.amountColumnIndex !== undefined) {
    score += 30;
  } else if (
    amountFormat === "split" &&
    mapping.debitColumnIndex !== undefined &&
    mapping.creditColumnIndex !== undefined
  ) {
    score += 30;
  }

  maxScore += 20;
  if (mapping.descriptionColumnIndex >= 0) score += 20;

  // Optional fields
  maxScore += 10;
  if (mapping.referenceColumnIndex !== undefined) score += 10;

  maxScore += 10;
  if (mapping.memoColumnIndex !== undefined) score += 10;

  return Math.round((score / maxScore) * 100);
}

/**
 * Convert column mapping entries back to a ColumnMapping object
 * Used when user manually adjusts mappings in the UI
 */
export function columnMappingsToMapping(
  entries: ColumnMappingEntry[],
  dateFormat: DateFormat = "DD/MM/YYYY"
): ColumnMapping {
  const mapping: ColumnMapping = {
    dateColumnIndex: -1,
    dateFormat,
    amountFormat: "signed",
    descriptionColumnIndex: -1,
  };

  let hasDebitCredit = false;

  for (const entry of entries) {
    switch (entry.mappedTo) {
      case "date":
        mapping.dateColumnIndex = entry.index;
        break;
      case "amount":
        mapping.amountColumnIndex = entry.index;
        break;
      case "debit":
        mapping.debitColumnIndex = entry.index;
        hasDebitCredit = true;
        break;
      case "credit":
        mapping.creditColumnIndex = entry.index;
        hasDebitCredit = true;
        break;
      case "description":
        mapping.descriptionColumnIndex = entry.index;
        break;
      case "reference":
        mapping.referenceColumnIndex = entry.index;
        break;
      case "memo":
        mapping.memoColumnIndex = entry.index;
        break;
    }
  }

  if (hasDebitCredit) {
    mapping.amountFormat = "split";
    delete mapping.amountColumnIndex;
  }

  return mapping;
}

/**
 * Validate a column mapping configuration
 */
export function validateMapping(mapping: ColumnMapping): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (mapping.dateColumnIndex < 0) {
    errors.push("Date column is required");
  }

  if (mapping.amountFormat === "signed") {
    if (mapping.amountColumnIndex === undefined) {
      errors.push("Amount column is required");
    }
  } else if (mapping.amountFormat === "split") {
    if (mapping.debitColumnIndex === undefined) {
      errors.push("Debit column is required for split format");
    }
    if (mapping.creditColumnIndex === undefined) {
      errors.push("Credit column is required for split format");
    }
  }

  if (mapping.descriptionColumnIndex < 0) {
    errors.push("Description column is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get available date formats for manual selection
 */
export function getAvailableDateFormats(): Array<{
  value: DateFormat;
  label: string;
  example: string;
}> {
  return [
    { value: "DD/MM/YYYY", label: "Day/Month/Year", example: "31/12/2024" },
    { value: "MM/DD/YYYY", label: "Month/Day/Year", example: "12/31/2024" },
    { value: "YYYY-MM-DD", label: "Year-Month-Day", example: "2024-12-31" },
    { value: "DD-MM-YYYY", label: "Day-Month-Year", example: "31-12-2024" },
    { value: "D/M/YYYY", label: "Day/Month/Year (short)", example: "1/3/2024" },
    { value: "M/D/YYYY", label: "Month/Day/Year (short)", example: "3/1/2024" },
  ];
}

/**
 * Get available field types for column mapping dropdown
 */
export function getAvailableFieldTypes(): Array<{
  value: MappableField;
  label: string;
  description: string;
}> {
  return [
    {
      value: "date",
      label: "Transaction Date",
      description: "When the transaction occurred",
    },
    {
      value: "amount",
      label: "Amount (signed)",
      description: "Single amount column (negative = expense)",
    },
    {
      value: "debit",
      label: "Debit Amount",
      description: "Money out (expenses)",
    },
    {
      value: "credit",
      label: "Credit Amount",
      description: "Money in (income)",
    },
    {
      value: "description",
      label: "Description / Payee",
      description: "Transaction description or merchant name",
    },
    {
      value: "reference",
      label: "Reference",
      description: "Bank reference number",
    },
    {
      value: "memo",
      label: "Memo / Notes",
      description: "Additional notes or particulars",
    },
    {
      value: "ignore",
      label: "Ignore",
      description: "Do not import this column",
    },
  ];
}
