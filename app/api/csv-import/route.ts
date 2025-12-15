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

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CSVImportParseRequest = await request.json();
    const { csvContent, accountId } = body;

    // Validate request
    if (!csvContent) {
      return NextResponse.json(
        { success: false, error: "CSV content is required" },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from("bank_accounts")
      .select("id, name")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found or access denied" },
        { status: 404 }
      );
    }

    // Calculate file size
    const fileSize = new Blob([csvContent]).size;

    // Check file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds the 5MB limit`,
        },
        { status: 400 }
      );
    }

    // Validate CSV content
    const validation = validateCSVContent(csvContent, fileSize);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join("; ") },
        { status: 400 }
      );
    }

    // Parse CSV
    const parsed = parseCSV(csvContent);

    if (parsed.headers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not parse CSV headers" },
        { status: 400 }
      );
    }

    if (parsed.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "CSV file contains no data rows" },
        { status: 400 }
      );
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse CSV",
      },
      { status: 500 }
    );
  }
}
