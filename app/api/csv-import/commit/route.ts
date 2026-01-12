/**
 * CSV Import API - Commit Endpoint
 *
 * POST /api/csv-import/commit
 *
 * Actually creates transactions in the database from parsed/previewed data.
 * Handles duplicate skipping and transfer detection integration.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CSVImportCommitRequest,
  CSVImportCommitResponse,
  ParsedTransaction,
} from "@/lib/csv";
import { applyRulesToTransactions } from "@/lib/services/transaction-rules";
import { detectAndProcessIncome } from "@/lib/services/pay-cycle-detection";

/**
 * Batch size for inserting transactions
 * Keeps requests manageable and provides progress updates
 */
const BATCH_SIZE = 50;

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
    const body: CSVImportCommitRequest = await request.json();
    const { transactions, accountId, skipDuplicates, duplicatesToImport } = body;

    // Validate request
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { success: false, error: "Transactions are required" },
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

    // Filter transactions to import
    const toImport = transactions.filter((t) => {
      // Skip invalid transactions
      if (!t.isValid) return false;

      // Handle duplicates
      if (t.isDuplicate) {
        if (skipDuplicates) {
          // Check if this duplicate was specifically marked to import anyway
          return duplicatesToImport?.includes(t.tempId) ?? false;
        }
      }

      return true;
    });

    if (toImport.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          imported: 0,
          skipped: transactions.length,
          transactionIds: [],
          errors: [],
          transfersDetected: 0,
        },
      } as CSVImportCommitResponse);
    }

    // Prepare transaction records for insertion
    const transactionRecords = toImport.map((t) => ({
      user_id: user.id,
      account_id: accountId,
      merchant_name: t.merchantName,
      amount: t.amount,
      occurred_at: t.occurredAt,
      description: t.bankMemo || null,
      bank_reference: t.bankReference || null,
      bank_memo: t.bankMemo || null,
      status: "pending", // Default to pending for review
      transaction_type: t.amount >= 0 ? "income" : "expense",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Insert transactions in batches
    const importedIds: string[] = [];
    const errors: Array<{ tempId: string; message: string }> = [];

    for (let i = 0; i < transactionRecords.length; i += BATCH_SIZE) {
      const batch = transactionRecords.slice(i, i + BATCH_SIZE);
      const batchTempIds = toImport.slice(i, i + BATCH_SIZE).map((t) => t.tempId);

      const { data: inserted, error: insertError } = await supabase
        .from("transactions")
        .insert(batch)
        .select("id");

      if (insertError) {
        console.error("Error inserting batch:", insertError);
        // Add error for each transaction in failed batch
        batchTempIds.forEach((tempId) => {
          errors.push({
            tempId,
            message: insertError.message,
          });
        });
      } else if (inserted) {
        importedIds.push(...inserted.map((r) => r.id));
      }
    }

    // Apply merchant rules to imported transactions
    let rulesApplied = 0;
    if (importedIds.length > 0) {
      try {
        // Fetch the inserted transactions with their merchant names
        const { data: insertedTxs } = await supabase
          .from("transactions")
          .select("id, merchant_name")
          .in("id", importedIds);

        if (insertedTxs && insertedTxs.length > 0) {
          const ruleResults = await applyRulesToTransactions(
            supabase,
            user.id,
            insertedTxs.map((tx) => ({
              id: tx.id,
              merchantName: tx.merchant_name || "",
            })),
            true // skipIfAlreadyAssigned
          );
          rulesApplied = ruleResults.applied;
          console.log(`Applied ${rulesApplied} rules to imported transactions`);
        }
      } catch (error) {
        console.error("Rule application error:", error);
        // Don't fail the import if rule application fails
      }
    }

    // Detect income transactions and advance pay cycles
    let incomeDetected = 0;
    if (importedIds.length > 0) {
      try {
        // Fetch income transactions (positive amounts)
        const { data: incomeTxs } = await supabase
          .from("transactions")
          .select("id, user_id, amount, merchant_name, description, occurred_at")
          .in("id", importedIds)
          .gt("amount", 0);

        if (incomeTxs && incomeTxs.length > 0) {
          for (const tx of incomeTxs) {
            const incomeResult = await detectAndProcessIncome(supabase, user.id, {
              id: tx.id,
              user_id: tx.user_id,
              amount: tx.amount,
              merchant_name: tx.merchant_name,
              description: tx.description,
              occurred_at: tx.occurred_at,
            });
            if (incomeResult.matched) {
              incomeDetected++;
            }
          }
          console.log(`Detected ${incomeDetected} income transactions`);
        }
      } catch (error) {
        console.error("Income detection error:", error);
        // Don't fail the import if income detection fails
      }
    }

    // Run transfer detection on imported transactions
    let transfersDetected = 0;
    if (importedIds.length > 0) {
      try {
        // Call the transfer detection API for each imported transaction
        // This is done in the background - we don't wait for completion
        const detectTransfersPromise = detectTransfersForImportedTransactions(
          supabase,
          user.id,
          importedIds
        );

        // Wait briefly for initial detection, but don't block the response
        const detectionResult = await Promise.race([
          detectTransfersPromise,
          new Promise<number>((resolve) => setTimeout(() => resolve(0), 2000)),
        ]);

        transfersDetected = detectionResult as number;
      } catch (error) {
        console.error("Transfer detection error:", error);
        // Don't fail the import if transfer detection fails
      }
    }

    // Calculate skipped count
    const skipped = transactions.length - toImport.length + errors.length;

    // Build response
    const response: CSVImportCommitResponse = {
      success: true,
      data: {
        imported: importedIds.length,
        skipped,
        transactionIds: importedIds,
        errors,
        transfersDetected,
        rulesApplied,
        incomeDetected,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("CSV import commit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import transactions",
      },
      { status: 500 }
    );
  }
}

/**
 * Detect potential transfers for imported transactions
 * Returns the count of high-confidence matches found
 */
async function detectTransfersForImportedTransactions(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  transactionIds: string[]
): Promise<number> {
  let transferCount = 0;

  // Get the imported transactions
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, amount, occurred_at, merchant_name, account_id")
    .in("id", transactionIds);

  if (error || !transactions) {
    return 0;
  }

  // For each transaction, look for potential transfer matches
  for (const transaction of transactions) {
    // Look for opposite amount in different account within 3 days
    const oppositeAmount = -transaction.amount;
    const transactionDate = new Date(transaction.occurred_at);
    const minDate = new Date(transactionDate);
    minDate.setDate(minDate.getDate() - 3);
    const maxDate = new Date(transactionDate);
    maxDate.setDate(maxDate.getDate() + 3);

    const { data: potentialMatches } = await supabase
      .from("transactions")
      .select("id, amount, occurred_at, account_id")
      .eq("user_id", userId)
      .neq("account_id", transaction.account_id) // Different account
      .gte("amount", oppositeAmount - 0.01)
      .lte("amount", oppositeAmount + 0.01)
      .gte("occurred_at", minDate.toISOString().split("T")[0])
      .lte("occurred_at", maxDate.toISOString().split("T")[0])
      .is("linked_transaction_id", null) // Not already linked
      .limit(1);

    if (potentialMatches && potentialMatches.length > 0) {
      transferCount++;
      // Mark as potential transfer (transfer_pending = true)
      await supabase
        .from("transactions")
        .update({ transfer_pending: true })
        .eq("id", transaction.id);
    }
  }

  return transferCount;
}
