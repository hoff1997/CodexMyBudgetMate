/**
 * CSV Import API - Parse Endpoint
 *
 * POST /api/csv-import
 *
 * Accepts raw CSV content and returns:
 * - Parsed headers and rows
 * - Auto-detected bank preset
 * - Suggested column mapping
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseCSV,
  validateCSVContent,
  autoDetectMapping,
  MAX_FILE_SIZE,
} from "@/lib/csv";
import type { CSVImportParseRequest, CSVImportParseResponse } from "@/lib/csv";
import {
  createErrorResponse,
  createUnauthorizedError,
  createValidationError,
  createNotFoundError,
} from "@/lib/utils/api-error";

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createUnauthorizedError();
    }

    // Parse request body
    const body: CSVImportParseRequest = await request.json();
    const { csvContent, accountId } = body;

    // Validate request
    if (!csvContent) {
      return createValidationError("CSV content is required");
    }

    if (!accountId) {
      return createValidationError("Account ID is required");
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from("bank_accounts")
      .select("id, name")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError || !account) {
      return createNotFoundError("Account");
    }

    // Calculate file size
    const fileSize = new Blob([csvContent]).size;

    // Check file size
    if (fileSize > MAX_FILE_SIZE) {
      return createValidationError(
        `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds the 5MB limit`
      );
    }

    // Validate CSV content
    const validation = validateCSVContent(csvContent, fileSize);
    if (!validation.valid) {
      return createValidationError(validation.errors.join("; "));
    }

    // Parse CSV
    const parsed = parseCSV(csvContent);

    if (parsed.headers.length === 0) {
      return createValidationError("Could not parse CSV headers");
    }

    if (parsed.rowCount === 0) {
      return createValidationError("CSV file contains no data rows");
    }

    // Auto-detect column mapping
    const detection = autoDetectMapping(parsed.headers, parsed.rows);

    // Build response
    const response: CSVImportParseResponse = {
      success: true,
      data: {
        headers: parsed.headers,
        rows: parsed.rows,
        detectedPreset: detection.presetId,
        suggestedMapping: detection.mapping,
        columnMappings: detection.columnMappings,
        rowCount: parsed.rowCount,
        truncated: parsed.truncated,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("CSV import parse error:", error);
    return createErrorResponse(
      error instanceof Error ? { message: error.message } : null,
      500,
      "Failed to parse CSV"
    );
  }
}
