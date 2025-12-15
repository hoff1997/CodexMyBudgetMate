import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SearchResult {
  id: string;
  type: "transaction" | "envelope" | "account";
  title: string;
  subtitle?: string;
  href: string;
  amount?: number;
}

/**
 * Parse a search query to extract an amount value
 * Handles formats like: $60, 60.00, $1,250, 1250.50
 * Returns null if the query doesn't look like an amount
 */
function parseAmountQuery(query: string): number | null {
  // Strip currency symbols, commas, and spaces
  const cleaned = query.replace(/[$,\s]/g, "").trim();

  // Check if it's a valid number (allow negative for expenses)
  const amount = parseFloat(cleaned);

  // Must be a valid number and the cleaned string should look numeric
  if (!isNaN(amount) && /^-?\d+(\.\d+)?$/.test(cleaned)) {
    return Math.abs(amount); // Return absolute value, we'll search both positive and negative
  }

  return null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = [];

  // Check if query looks like an amount
  const amountValue = parseAmountQuery(query);

  // Search transactions
  let transactionQuery = supabase
    .from("transactions")
    .select("id, merchant_name, description, amount, occurred_at");

  if (amountValue !== null) {
    // Search by amount (both positive and negative) AND text fields
    // Use a small tolerance (0.01) for exact decimal matching
    const positiveAmount = amountValue;
    const negativeAmount = -amountValue;

    transactionQuery = transactionQuery.or(
      `merchant_name.ilike.%${query}%,description.ilike.%${query}%,amount.eq.${positiveAmount},amount.eq.${negativeAmount}`
    );
  } else {
    // Text-only search
    transactionQuery = transactionQuery.or(
      `merchant_name.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  const { data: transactions } = await transactionQuery
    .order("occurred_at", { ascending: false })
    .limit(10);

  if (transactions) {
    for (const tx of transactions) {
      results.push({
        id: tx.id,
        type: "transaction",
        title: tx.merchant_name || "Transaction",
        subtitle: tx.description || new Date(tx.occurred_at).toLocaleDateString("en-NZ", { dateStyle: "medium" }),
        href: `/transactions?search=${encodeURIComponent(tx.merchant_name || "")}`,
        amount: Number(tx.amount ?? 0),
      });
    }
  }

  // Search envelopes
  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("id, name, current_amount, target_amount")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (envelopes) {
    for (const env of envelopes) {
      results.push({
        id: env.id,
        type: "envelope",
        title: env.name,
        subtitle: env.target_amount ? `Target: $${env.target_amount}` : undefined,
        href: `/envelope-summary`,
        amount: Number(env.current_amount ?? 0),
      });
    }
  }

  // Search accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type, balance")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (accounts) {
    for (const acc of accounts) {
      results.push({
        id: acc.id,
        type: "account",
        title: acc.name,
        subtitle: acc.type || undefined,
        href: `/accounts`,
      });
    }
  }

  return NextResponse.json({ results });
}
