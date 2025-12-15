/**
 * CSV Import Module
 *
 * Exports all CSV-related utilities for bank statement import.
 */

// Types
export * from "./types";

// Bank presets
export {
  NZ_BANK_PRESETS,
  getBankPreset,
  getAllBankPresets,
  detectBankPreset,
  fuzzyMatchColumn,
  COMMON_COLUMN_PATTERNS,
} from "./bank-presets";

// CSV parsing
export {
  parseCSV,
  detectDelimiter,
  readFileAsText,
  validateCSVContent,
  getColumnSamples,
  parseAmount,
  parseDate,
  sanitizeDescription,
} from "./csv-parser";

// Column mapping
export {
  autoDetectMapping,
  columnMappingsToMapping,
  validateMapping,
  getAvailableDateFormats,
  getAvailableFieldTypes,
  type AutoDetectResult,
} from "./column-mapper";

// Duplicate detection
export {
  checkForDuplicates,
  markDuplicates,
  DUPLICATE_CONFIG,
} from "./duplicate-detector";
