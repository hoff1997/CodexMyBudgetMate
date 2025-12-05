import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { processTransactionForAllocation } from "@/lib/server/auto-envelope-allocator";

/**
 * POST /api/transactions/process-income
 *
 * Process a transaction for automatic income detection and envelope allocation.
 * This endpoint should be called after a transaction is created or imported.
 *
 * Request body:
 * - transaction_id: string (required)
 *
 * Response:
 * - processed: boolean
 * - income_detected: boolean
 * - allocated: boolean
 * - allocations_count: number
 * - message: string
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json(
        { error: "transaction_id is required" },
        { status: 400 }
      );
    }

    // Process the transaction
    const result = await processTransactionForAllocation(
      supabase,
      transaction_id,
      user.id
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error processing income transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process transaction" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions/process-income/batch
 *
 * Process multiple transactions in batch for automatic income detection.
 * Useful for bulk imports or syncing transactions from bank.
 *
 * Request body:
 * - transaction_ids: string[] (required)
 *
 * Response:
 * - total_processed: number
 * - income_detected: number
 * - allocated: number
 * - results: array of individual results
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transaction_ids } = body;

    if (!transaction_ids || !Array.isArray(transaction_ids)) {
      return NextResponse.json(
        { error: "transaction_ids array is required" },
        { status: 400 }
      );
    }

    const results = [];
    let totalProcessed = 0;
    let incomeDetected = 0;
    let allocated = 0;

    for (const transactionId of transaction_ids) {
      const result = await processTransactionForAllocation(
        supabase,
        transactionId,
        user.id
      );

      results.push({
        transaction_id: transactionId,
        ...result,
      });

      if (result.processed) totalProcessed++;
      if (result.income_detected) incomeDetected++;
      if (result.allocated) allocated++;
    }

    return NextResponse.json({
      total_processed: totalProcessed,
      income_detected: incomeDetected,
      allocated,
      results,
    });
  } catch (error: any) {
    console.error("Error processing batch income transactions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process transactions" },
      { status: 500 }
    );
  }
}
