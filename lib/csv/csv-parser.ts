/**
 * CSV Parser
 *
 * Lightweight CSV parsing utility with no external dependencies.
 * Handles various delimiters, quoted fields, and encoding.
 */

import type { ParsedCSV, ParseOptions } from "./types";
import { MAX_ROWS } from "./types";

/**
 * Detect the delimiter used in a CSV string
 * Checks for comma, semicolon, tab, and pipe
 */
export function detectDelimiter(content: string): string {
  const firstLines = content.split("\n").slice(0, 5).join("\n");

  const delimiters = [",", ";", "\t", "|"];
  const counts: Record<string, number> = {};

  for (const delimiter of delimiters) {
    // Count occurrences, but ignore those inside quoted strings
    let count = 0;
    let inQuotes = false;

    for (const char of firstLines) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        count++;
      }
    }

    counts[delimiter] = count;
  }

  // Return the delimiter with the highest count
  let maxCount = 0;
  let bestDelimiter = ",";

  for (const [delimiter, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Add the last field
  fields.push(current.trim());

  return fields;
}

/**
 * Parse CSV content into structured data
 *
 * @param content - Raw CSV string
 * @param options - Parse options
 * @returns Parsed CSV data
 */
export function parseCSV(
  content: string,
  options: ParseOptions = {}
): ParsedCSV {
  const {
    maxRows = MAX_ROWS,
    delimiter: providedDelimiter,
    hasHeaders = true,
    skipEmptyRows = true,
  } = options;

  // Normalize line endings
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Detect or use provided delimiter
  const delimiter = providedDelimiter ?? detectDelimiter(normalizedContent);

  // Split into lines
  const lines = normalizedContent.split("\n");

  // Parse headers
  const headers = hasHeaders && lines.length > 0 ? parseLine(lines[0], delimiter) : [];

  // Parse data rows
  const rows: string[][] = [];
  const startIndex = hasHeaders ? 1 : 0;
  let truncated = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty rows if configured
    if (skipEmptyRows && line.trim() === "") {
      continue;
    }

    // Check row limit
    if (rows.length >= maxRows) {
      truncated = true;
      break;
    }

    const row = parseLine(line, delimiter);

    // Skip rows that don't have enough columns (likely empty or malformed)
    if (row.length < headers.length / 2) {
      continue;
    }

    rows.push(row);
  }

  return {
    headers,
    rows,
    delimiter,
    rowCount: rows.length,
    fileSize: new Blob([content]).size,
    truncated,
  };
}

/**
 * Read a File object as text
 *
 * @param file - File to read
 * @returns Promise resolving to file content
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message ?? "Unknown error"}`));
    };

    // Try UTF-8 first
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Validate CSV content before parsing
 *
 * @param content - Raw CSV string
 * @param fileSize - Size of the file in bytes
 * @returns Validation result with any errors
 */
export function validateCSVContent(
  content: string,
  fileSize: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file size (5MB limit)
  if (fileSize > 5 * 1024 * 1024) {
    errors.push("File size exceeds 5MB limit");
  }

  // Check if content is empty
  if (!content.trim()) {
    errors.push("File is empty");
  }

  // Check if it looks like CSV (has at least one delimiter)
  const firstLine = content.split("\n")[0];
  if (firstLine && !firstLine.includes(",") && !firstLine.includes(";") && !firstLine.includes("\t")) {
    errors.push("File does not appear to be a valid CSV (no delimiters found)");
  }

  // Check for minimum rows
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    errors.push("File must contain at least a header row and one data row");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get sample values from a column
 *
 * @param rows - Parsed rows
 * @param columnIndex - Index of the column
 * @param maxSamples - Maximum number of samples to return
 * @returns Array of sample values
 */
export function getColumnSamples(
  rows: string[][],
  columnIndex: number,
  maxSamples: number = 3
): string[] {
  const samples: string[] = [];

  for (const row of rows) {
    if (columnIndex < row.length) {
      const value = row[columnIndex].trim();
      if (value && !samples.includes(value)) {
        samples.push(value);
        if (samples.length >= maxSamples) {
          break;
        }
      }
    }
  }

  return samples;
}

/**
 * Normalize a currency amount string to a number
 * Handles various formats: $1,234.56, -$1234.56, (1234.56), etc.
 *
 * @param value - String value to parse
 * @returns Parsed number or NaN if invalid
 */
export function parseAmount(value: string): number {
  if (!value || typeof value !== "string") {
    return NaN;
  }

  // Trim and normalize
  let normalized = value.trim();

  // Check for negative indicators
  const isNegative =
    normalized.startsWith("-") ||
    normalized.startsWith("(") ||
    normalized.endsWith(")") ||
    normalized.endsWith("-") ||
    normalized.toLowerCase().includes("dr");

  // Remove currency symbols, parentheses, and letters
  normalized = normalized
    .replace(/[$£€¥NZD]/gi, "")
    .replace(/[()]/g, "")
    .replace(/[a-zA-Z]/g, "")
    .replace(/,/g, "")
    .replace(/-/g, "")
    .trim();

  // Parse the number
  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return NaN;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Parse a date string in various formats
 *
 * @param value - Date string to parse
 * @param format - Expected format hint
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseDate(
  value: string,
  format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD-MM-YYYY" | "D/M/YYYY" | "M/D/YYYY" = "DD/MM/YYYY"
): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return trimmed;
    }
  }

  // Parse based on format
  let day: number, month: number, year: number;

  // Try different separator patterns
  const parts = trimmed.split(/[\/\-\.]/);

  if (parts.length !== 3) {
    return null;
  }

  switch (format) {
    case "DD/MM/YYYY":
    case "DD-MM-YYYY":
    case "D/M/YYYY":
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
      break;

    case "MM/DD/YYYY":
    case "M/D/YYYY":
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
      break;

    case "YYYY-MM-DD":
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
      break;

    default:
      // Default to DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
  }

  // Handle 2-digit years
  if (year < 100) {
    year += year > 50 ? 1900 : 2000;
  }

  // Validate the date
  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900 ||
    year > 2100
  ) {
    return null;
  }

  // Create date and verify it's valid
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  // Return ISO format
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Sanitize a string for use as a description
 * Removes control characters but preserves useful content
 */
export function sanitizeDescription(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Trim
    .trim()
    // Limit length
    .slice(0, 500);
}
