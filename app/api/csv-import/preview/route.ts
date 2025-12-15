/**
 * CSV Import API - Preview Endpoint
 *
 * POST /api/csv-import/preview
 *
 * Applies column mapping to parsed rows and:
 * - Validates each transaction
 * - Checks for duplicates
 * - Returns parsed transactions with validation status
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseAmount,
  parseDate,
  sanitizeDescription,
  validateMapping,
  checkForDuplicates,
  markDuplicates,
} from "@/lib/csv";
import type {
  CSVImportPreviewRequest,
  CSVImportPreviewResponse,
  ParsedTransaction,
  ValidationError,
  ColumnMapping,
} from "@/lib/csv";
import { v4 as uuidv4 } from "uuid";

/**
 * Transform a CSV row into a parsed transaction using the column mapping
 */
function transformRow(
  row: string[],
  rowIndex: number,
  mapping: ColumnMapping
): ParsedTransaction {
  const errors: ValidationError[] = [];
  let amount = 0;
  let occurredAt = "";
  let merchantName = "";
  let bankReference: string | undefined;
  let bankMemo: string | undefined;

  // Parse date
  const dateValue = row[mapping.dateColumnIndex];
  const parsedDate = parseDate(dateValue, mapping.dateFormat);
  if (!parsedDate) {
    errors.push({
      field: "date",
      message: `Invalid date format: "${dateValue}"`,
      value: dateValue,
    });
  } else {
    occurredAt = parsedDate;
  }

  // Parse amount
  if (mapping.amountFormat === "signed" && mapping.amountColumnIndex !== undefined) {
    const amountValue = row[mapping.amountColumnIndex];
    const parsedAmount = parseAmount(amountValue);
    if (isNaN(parsedAmount)) {
      errors.push({
        field: "amount",
        message: `Invalid amount: "${amountValue}"`,
        value: amountValue,
      });
    } else {
      amount = parsedAmount;
    }
  } else if (mapping.amountFormat === "split") {
    // Handle split debit/credit columns
    const debitValue = mapping.debitColumnIndex !== undefined ? row[mapping.debitColumnIndex] : "";
    const creditValue = mapping.creditColumnIndex !== undefined ? row[mapping.creditColumnIndex] : "";

    const debit = parseAmount(debitValue);
    const credit = parseAmount(creditValue);

    if (!isNaN(debit) && debit !== 0) {
      amount = -Math.abs(debit); // Debits are negative (expenses)
    } else if (!isNaN(credit) && credit !== 0) {
      amount = Math.abs(credit); // Credits are positive (income)
    } else if (debitValue.trim() === "" && creditValue.trim() === "") {
      // Both empty - might be a header row or invalid
      errors.push({
        field: "amount",
        message: "Both debit and credit columns are empty",
      });
    } else {
      errors.push({
        field: "amount",
        message: `Invalid debit/credit values: "${debitValue}" / "${creditValue}"`,
        value: `${debitValue}/${creditValue}`,
      });
    }
  }

  // Parse description
  const descValue = row[mapping.descriptionColumnIndex];
  merchantName = sanitizeDescription(descValue);
  if (!merchantName) {
    errors.push({
      field: "description",
      message: "Description is empty",
      value: descValue,
    });
  }

  // Parse optional fields
  if (mapping.referenceColumnIndex !== undefined) {
    bankReference = sanitizeDescription(row[mapping.referenceColumnIndex]);
  }
  if (mapping.memoColumnIndex !== undefined) {
    bankMemo = sanitizeDescription(row[mapping.memoColumnIndex]);
  }

  return {
    tempId: uuidv4(),
    occurredAt: occurredAt || new Date().toISOString().split("T")[0],
    amount,
    merchantName,
    bankReference,
    bankMemo,
    rowIndex,
    rawRow: row,
    isValid: errors.length === 0,
    errors,
    isDuplicate: false,
  };
}

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
    const body: CSVImportPreviewRequest = await request.json();
    const { rows, mapping, accountId } = body;

    // Validate request
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: "Rows are required" },
        { status: 400 }
      );
    }

    if (!mapping) {
      return NextResponse.json(
        { success: false, error: "Column mapping is required" },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Validate mapping configuration
    const mappingValidation = validateMapping(mapping);
    if (!mappingValidation.valid) {
      return NextResponse.json(
        { success: false, error: mappingValidation.errors.join("; ") },
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

    // Transform rows into transactions
    const transactions: ParsedTransaction[] = [];
    for (let i = 0; i < rows.length; i++) {
      const transaction = transformRow(rows[i], i, mapping);
      transactions.push(transaction);
    }

    // Filter to valid transactions for duplicate check
    const validTransactions = transactions.filter((t) => t.isValid);

    // Check for duplicates
    if (validTransactions.length > 0) {
      const duplicateResult = await checkForDuplicates(
        supabase,
        user.id,
        accountId,
        validTransactions
      );
      markDuplicates(transactions, duplicateResult);
    }

    // Calculate summary stats
    const validCount = transactions.filter((t) => t.isValid).length;
    const duplicateCount = transactions.filter((t) => t.isDuplicate).length;
    const errorCount = transactions.filter((t) => !t.isValid).length;

    const validAmounts = transactions
      .filter((t) => t.isValid)
      .map((t) => t.amount);
    const totalAmount = validAmounts.reduce((sum, amt) => sum + amt, 0);

    // Calculate date range
    const validDates = transactions
      .filter((t) => t.isValid && t.occurredAt)
      .map((t) => new Date(t.occurredAt).getTime());

    const dateRange = validDates.length > 0
      ? {
          earliest: new Date(Math.min(...validDates)).toISOString().split("T")[0],
          latest: new Date(Math.max(...validDates)).toISOString().split("T")[0],
        }
      : {
          earliest: "",
          latest: "",
        };

    // Build response
    const response: CSVImportPreviewResponse = {
      success: true,
      data: {
        transactions,
        validCount,
        duplicateCount,
        errorCount,
        totalAmount,
        dateRange,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("CSV import preview error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview transactions",
      },
      { status: 500 }
    );
  }
}
