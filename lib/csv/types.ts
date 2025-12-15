/**
 * CSV Import System - TypeScript Types
 *
 * Core type definitions for the CSV import feature including
 * parsing, column mapping, bank presets, and duplicate detection.
 */

// ============================================================================
// Bank Preset Types
// ============================================================================

/** How the bank formats amount values */
export type AmountFormat =
  | "signed"      // Single column: positive = credit, negative = debit
  | "split"       // Separate debit/credit columns
  | "absolute";   // Always positive, type determined by transaction type column

/** Supported date formats */
export type DateFormat =
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "DD-MM-YYYY"
  | "D/M/YYYY"
  | "M/D/YYYY";

/** Bank preset configuration */
export interface BankPreset {
  id: string;
  name: string;
  /** Column name for transaction date */
  dateColumn: string;
  /** Date format used by this bank */
  dateFormat: DateFormat;
  /** How amounts are formatted */
  amountFormat: AmountFormat;
  /** Column for amount (when amountFormat is "signed") */
  amountColumn?: string;
  /** Column for debit amount (when amountFormat is "split") */
  debitColumn?: string;
  /** Column for credit amount (when amountFormat is "split") */
  creditColumn?: string;
  /** Column for transaction description/payee */
  descriptionColumn: string;
  /** Column for bank reference (optional) */
  referenceColumn?: string;
  /** Column for memo/notes (optional) */
  memoColumn?: string;
  /** Column for transaction type (optional, for "absolute" format) */
  typeColumn?: string;
  /** Additional columns that help identify this bank */
  identifyingColumns?: string[];
}

// ============================================================================
// Column Mapping Types
// ============================================================================

/** Field types that can be mapped from CSV columns */
export type MappableField =
  | "date"
  | "amount"
  | "debit"
  | "credit"
  | "description"
  | "reference"
  | "memo"
  | "type"
  | "ignore";

/** Column mapping configuration */
export interface ColumnMapping {
  /** Index of the date column */
  dateColumnIndex: number;
  /** Date format to use for parsing */
  dateFormat: DateFormat;
  /** How amounts are handled */
  amountFormat: AmountFormat;
  /** Index of amount column (for "signed" format) */
  amountColumnIndex?: number;
  /** Index of debit column (for "split" format) */
  debitColumnIndex?: number;
  /** Index of credit column (for "split" format) */
  creditColumnIndex?: number;
  /** Index of description column */
  descriptionColumnIndex: number;
  /** Index of reference column (optional) */
  referenceColumnIndex?: number;
  /** Index of memo column (optional) */
  memoColumnIndex?: number;
  /** Index of type column (optional) */
  typeColumnIndex?: number;
}

/** Mapping for a single column */
export interface ColumnMappingEntry {
  /** Original column header from CSV */
  header: string;
  /** Column index in the CSV */
  index: number;
  /** What field this column maps to */
  mappedTo: MappableField;
  /** Sample values from this column (for preview) */
  sampleValues: string[];
}

// ============================================================================
// CSV Parsing Types
// ============================================================================

/** Result of parsing a CSV file */
export interface ParsedCSV {
  /** Column headers from first row */
  headers: string[];
  /** Data rows (excluding header) */
  rows: string[][];
  /** Detected delimiter */
  delimiter: string;
  /** Total row count (excluding header) */
  rowCount: number;
  /** File size in bytes */
  fileSize: number;
  /** Whether file was truncated due to size limits */
  truncated: boolean;
}

/** Options for CSV parsing */
export interface ParseOptions {
  /** Maximum rows to process (default: 1000) */
  maxRows?: number;
  /** Expected delimiter (auto-detect if not provided) */
  delimiter?: string;
  /** Whether first row contains headers (default: true) */
  hasHeaders?: boolean;
  /** Skip empty rows (default: true) */
  skipEmptyRows?: boolean;
}

// ============================================================================
// Transaction Types (for import)
// ============================================================================

/** A transaction parsed from CSV, ready for preview */
export interface ParsedTransaction {
  /** Temporary ID for tracking during import */
  tempId: string;
  /** Transaction date */
  occurredAt: string;
  /** Amount (positive = income, negative = expense) */
  amount: number;
  /** Merchant/payee name */
  merchantName: string;
  /** Bank reference (optional) */
  bankReference?: string;
  /** Memo/notes (optional) */
  bankMemo?: string;
  /** Original row index in CSV */
  rowIndex: number;
  /** Raw row data for debugging */
  rawRow: string[];
  /** Validation status */
  isValid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Whether this might be a duplicate */
  isDuplicate: boolean;
  /** Duplicate match info (if isDuplicate) */
  duplicateMatch?: DuplicateMatch;
}

/** Validation error for a parsed transaction */
export interface ValidationError {
  /** Field that has the error */
  field: "date" | "amount" | "description" | "reference" | "memo" | "general";
  /** Error message */
  message: string;
  /** Original value that caused the error */
  value?: string;
}

// ============================================================================
// Duplicate Detection Types
// ============================================================================

/** Match information for a potential duplicate */
export interface DuplicateMatch {
  /** ID of the existing transaction */
  existingTransactionId: string;
  /** Merchant name of existing transaction */
  existingMerchantName: string;
  /** Amount of existing transaction */
  existingAmount: number;
  /** Date of existing transaction */
  existingDate: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Reasons for the match */
  matchReasons: string[];
}

/** Result of duplicate detection for a batch */
export interface DuplicateCheckResult {
  /** Transactions with potential duplicates */
  duplicates: Array<{
    tempId: string;
    match: DuplicateMatch;
  }>;
  /** Count of transactions checked */
  checkedCount: number;
  /** Count of potential duplicates found */
  duplicateCount: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Request body for /api/csv-import (parse endpoint) */
export interface CSVImportParseRequest {
  /** Raw CSV content */
  csvContent: string;
  /** Target account ID */
  accountId: string;
}

/** Response from /api/csv-import (parse endpoint) */
export interface CSVImportParseResponse {
  success: boolean;
  error?: string;
  data?: {
    /** Parsed headers */
    headers: string[];
    /** Parsed rows */
    rows: string[][];
    /** Detected bank preset ID (or null) */
    detectedPreset: string | null;
    /** Suggested column mapping */
    suggestedMapping: ColumnMapping;
    /** Per-column mapping entries for UI */
    columnMappings: ColumnMappingEntry[];
    /** Total row count */
    rowCount: number;
    /** Whether file was truncated */
    truncated: boolean;
  };
}

/** Request body for /api/csv-import/preview */
export interface CSVImportPreviewRequest {
  /** Parsed rows (without headers) */
  rows: string[][];
  /** Column mapping to apply */
  mapping: ColumnMapping;
  /** Target account ID */
  accountId: string;
}

/** Response from /api/csv-import/preview */
export interface CSVImportPreviewResponse {
  success: boolean;
  error?: string;
  data?: {
    /** Parsed and validated transactions */
    transactions: ParsedTransaction[];
    /** Summary counts */
    validCount: number;
    duplicateCount: number;
    errorCount: number;
    /** Total amount if imported */
    totalAmount: number;
    /** Date range of transactions */
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

/** Request body for /api/csv-import/commit */
export interface CSVImportCommitRequest {
  /** Transactions to import */
  transactions: ParsedTransaction[];
  /** Target account ID */
  accountId: string;
  /** Whether to skip detected duplicates */
  skipDuplicates: boolean;
  /** Specific duplicate tempIds to import anyway */
  duplicatesToImport: string[];
}

/** Response from /api/csv-import/commit */
export interface CSVImportCommitResponse {
  success: boolean;
  error?: string;
  data?: {
    /** Number of transactions imported */
    imported: number;
    /** Number of transactions skipped */
    skipped: number;
    /** IDs of created transactions */
    transactionIds: string[];
    /** Errors encountered during import */
    errors: Array<{
      tempId: string;
      message: string;
    }>;
    /** Transfer detection results */
    transfersDetected: number;
  };
}

// ============================================================================
// UI State Types
// ============================================================================

/** Steps in the import wizard */
export type ImportWizardStep =
  | "upload"
  | "mapping"
  | "preview"
  | "importing"
  | "complete";

/** State for the import wizard */
export interface ImportWizardState {
  /** Current step */
  step: ImportWizardStep;
  /** Raw CSV content */
  csvContent: string | null;
  /** Parsed CSV data */
  parsedData: ParsedCSV | null;
  /** Selected account ID */
  accountId: string | null;
  /** Detected bank preset */
  detectedPreset: string | null;
  /** Current column mapping */
  mapping: ColumnMapping | null;
  /** Column mapping entries for UI */
  columnMappings: ColumnMappingEntry[];
  /** Parsed transactions */
  transactions: ParsedTransaction[];
  /** Import progress (0-100) */
  progress: number;
  /** Import result */
  result: CSVImportCommitResponse | null;
  /** Error message */
  error: string | null;
  /** Loading state */
  isLoading: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum file size in bytes (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum rows to process */
export const MAX_ROWS = 1000;

/** Large file threshold for showing processing message (2MB) */
export const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024;
