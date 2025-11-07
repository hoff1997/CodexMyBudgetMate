import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type ServiceClient = SupabaseClient<any, "public", any>;

type SeedOptions = {
  fullName?: string | null;
};

async function safeDelete(
  client: ServiceClient,
  table: string,
  userId: string,
) {
  const { error } = await client.from(table).delete().eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

async function safeInsert(
  client: ServiceClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return;
  const { error } = await client.from(table).insert(rows);
  if (error) {
    throw new Error(`Failed to insert into ${table}: ${error.message}`);
  }
}

function isoDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export async function seedDemoData(
  client: ServiceClient,
  userId: string,
  options: SeedOptions = {},
) {
  const { data: authUser, error: authError } = await client.auth.admin.getUserById(userId);
  if (authError) {
    throw new Error(`Unable to load auth user: ${authError.message}`);
  }

  await safeDelete(client, "transaction_splits", userId);
  await safeDelete(client, "transactions", userId);
  await safeDelete(client, "transaction_rules", userId);
  await safeDelete(client, "recurring_income", userId);
  await safeDelete(client, "net_worth_snapshots", userId);
  await safeDelete(client, "accounts", userId);
  await safeDelete(client, "liabilities", userId);
  await safeDelete(client, "envelopes", userId);

  const envelopeIds = {
    rent: randomUUID(),
    groceries: randomUUID(),
    emergency: randomUUID(),
    creditCard: randomUUID(),
  };

  const accountIds = {
    everyday: randomUUID(),
    card: randomUUID(),
  };

  const envelopes = [
    {
      id: envelopeIds.rent,
      user_id: userId,
      name: "Rent",
      envelope_type: "expense",
      priority: "essential",
      target_amount: 2200,
      annual_amount: 26400,
      pay_cycle_amount: 550,
      opening_balance: 0,
      current_amount: 2200,
      due_date: isoDate(30),
      frequency: "monthly",
      next_payment_due: isoDate(30),
      notes: "Fixed rent",
      icon: "🏠",
      sort_order: 0,
      is_spending: false,
    },
    {
      id: envelopeIds.groceries,
      user_id: userId,
      name: "Groceries",
      envelope_type: "expense",
      priority: "essential",
      target_amount: 600,
      annual_amount: 7200,
      pay_cycle_amount: 150,
      opening_balance: 0,
      current_amount: 480,
      frequency: "weekly",
      notes: "Family of four",
      icon: "🛒",
      sort_order: 1,
      is_spending: true,
    },
    {
      id: envelopeIds.emergency,
      user_id: userId,
      name: "Emergency Fund",
      envelope_type: "expense",
      priority: "important",
      target_amount: 1000,
      annual_amount: 0,
      pay_cycle_amount: 250,
      opening_balance: 0,
      current_amount: 820,
      frequency: "monthly",
      notes: "Hold $1k buffer",
      icon: "🛟",
      sort_order: 2,
      is_spending: false,
    },
    {
      id: envelopeIds.creditCard,
      user_id: userId,
      name: "Credit Card Payment",
      envelope_type: "expense",
      priority: "important",
      target_amount: 600,
      annual_amount: 0,
      pay_cycle_amount: 150,
      opening_balance: 0,
      current_amount: 600,
      frequency: "fortnightly",
      notes: "Pay card in full",
      icon: "💳",
      sort_order: 3,
      is_spending: false,
    },
  ];

  const liabilities = [
    {
      id: randomUUID(),
      user_id: userId,
      name: "ANZ Credit Card",
      liability_type: "credit_card",
      current_balance: 4200,
      interest_rate: 19.95,
      notes: "Pay off monthly",
    },
    {
      id: randomUUID(),
      user_id: userId,
      name: "Westpac Personal Loan",
      liability_type: "personal_loan",
      current_balance: 11800,
      interest_rate: 12.5,
      notes: "Loan for renovations",
    },
  ];

  const accounts = [
    {
      id: accountIds.everyday,
      user_id: userId,
      name: "Everyday Account",
      type: "transaction",
      institution: "ANZ",
      current_balance: 2400,
      reconciled: false,
    },
    {
      id: accountIds.card,
      user_id: userId,
      name: "Credit Card Liability",
      type: "liability",
      institution: "ANZ",
      current_balance: -4200,
      reconciled: false,
    },
  ];

  const netWorthSnapshots = [
    {
      id: randomUUID(),
      user_id: userId,
      snapshot_date: isoDate(-60),
      total_assets: 41000,
      total_liabilities: 320000,
      net_worth: -279000,
    },
    {
      id: randomUUID(),
      user_id: userId,
      snapshot_date: isoDate(0),
      total_assets: 45000,
      total_liabilities: 318000,
      net_worth: -273000,
    },
  ];

  const transactions = [
    {
      id: randomUUID(),
      user_id: userId,
      envelope_id: envelopeIds.groceries,
      account_id: accountIds.everyday,
      merchant_name: "Countdown",
      description: "Weekly groceries",
      amount: -150,
      occurred_at: isoDate(-2),
      status: "pending",
    },
    {
      id: randomUUID(),
      user_id: userId,
      account_id: accountIds.everyday,
      merchant_name: "Westfield Parking",
      amount: -6,
      occurred_at: isoDate(-7),
      status: "unmatched",
    },
  ];

  const transactionRules = [
    {
      id: randomUUID(),
      user_id: userId,
      merchant_normalized: "countdown",
      envelope_id: envelopeIds.groceries,
      notes: "Automatically tag grocery spend",
      pattern: "Countdown",
      match_type: "contains",
      case_sensitive: false,
      is_active: true,
    },
  ];

  const recurringIncome = [
    {
      id: randomUUID(),
      user_id: userId,
      name: "Primary salary",
      amount: 2200,
      frequency: "fortnightly",
      next_date: isoDate(7),
      allocations: [
        { envelope: "Rent", envelopeId: envelopeIds.rent, amount: 1200 },
        { envelope: "Groceries", envelopeId: envelopeIds.groceries, amount: 300 },
        { envelope: "Savings", amount: 200 },
      ],
      surplus_envelope: "Surplus",
    },
    {
      id: randomUUID(),
      user_id: userId,
      name: "Side hustle",
      amount: 450,
      frequency: "monthly",
      next_date: isoDate(20),
      allocations: [
        { envelope: "Emergency Fund", envelopeId: envelopeIds.emergency, amount: 200 },
        { envelope: "Fun", amount: 100 },
      ],
    },
  ];

  await safeInsert(client, "envelopes", envelopes);
  await safeInsert(client, "liabilities", liabilities);
  await safeInsert(client, "accounts", accounts);
  await safeInsert(client, "net_worth_snapshots", netWorthSnapshots);
  await safeInsert(client, "transactions", transactions);
  await safeInsert(client, "transaction_rules", transactionRules);
  await safeInsert(client, "recurring_income", recurringIncome);

  const profileName =
    options.fullName ??
    authUser?.user?.user_metadata?.full_name ??
    authUser?.user?.email?.split("@")[0] ??
    "Budget Mate";

  const { error: profileError } = await client
    .from("profiles")
    .upsert({
      id: userId,
      full_name: profileName,
      pay_cycle: "fortnightly",
    });

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`);
  }

  const mergedMetadata = {
    ...(authUser?.user?.user_metadata ?? {}),
    demo_seeded: true,
  };

  await client.auth.admin.updateUserById(userId, {
    user_metadata: mergedMetadata,
  });
}
