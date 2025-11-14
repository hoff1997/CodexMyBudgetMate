import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env
function loadEnv() {
  try {
    const envFile = readFileSync('.env.local', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedTransactions() {
  // Get the first user
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (usersError || !users || users.length === 0) {
    console.error('No users found:', usersError);
    process.exit(1);
  }

  const userId = users[0].id;
  console.log('Seeding transactions for user:', userId);

  // Get or create a checking account
  let { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  let accountId;
  if (accountsError || !accounts || accounts.length === 0) {
    console.log('Creating checking account...');
    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: 'Checking Account',
        type: 'transaction',
        current_balance: 5000,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create account:', createError);
      process.exit(1);
    }
    accountId = newAccount.id;
  } else {
    accountId = accounts[0].id;
  }

  // Get envelopes
  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, name')
    .eq('user_id', userId);

  const envelopeMap = envelopes?.reduce((acc, env) => {
    acc[env.name.toLowerCase()] = env.id;
    return acc;
  }, {}) || {};

  // Create test transactions
  const now = new Date();
  const transactions = [
    // Income transactions (last 3 months)
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Salary Deposit',
      description: 'Monthly salary from employer',
      amount: 4500.00,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      status: 'pending',
      envelope_id: null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Salary Deposit',
      description: 'Monthly salary from employer',
      amount: 4500.00,
      occurred_at: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
      status: 'approved',
      envelope_id: null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Freelance Payment',
      description: 'Client project payment',
      amount: 850.00,
      occurred_at: new Date(now.getFullYear(), now.getMonth() - 1, 22).toISOString(),
      status: 'approved',
      envelope_id: null,
    },

    // Expense transactions (recent)
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Countdown',
      description: 'Groceries',
      amount: -127.45,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString(),
      status: 'pending',
      envelope_id: envelopeMap['groceries'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Pak n Save',
      description: 'Weekly groceries',
      amount: -98.32,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 9).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['groceries'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'BP Service Station',
      description: 'Fuel',
      amount: -85.00,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).toISOString(),
      status: 'pending',
      envelope_id: envelopeMap['transport'] || envelopeMap['car'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Netflix',
      description: 'Monthly subscription',
      amount: -21.99,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['entertainment'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Spark NZ',
      description: 'Mobile phone bill',
      amount: -65.00,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['utilities'] || envelopeMap['phone'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Cafe Coffee',
      description: 'Morning coffee',
      amount: -5.50,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(),
      status: 'pending',
      envelope_id: envelopeMap['dining out'] || envelopeMap['eating out'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Warehouse',
      description: 'Household items',
      amount: -45.80,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['household'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Hell Pizza',
      description: 'Dinner',
      amount: -38.50,
      occurred_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['dining out'] || envelopeMap['eating out'] || null,
    },

    // Older transactions (2-3 months ago)
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Countdown',
      description: 'Groceries',
      amount: -115.60,
      occurred_at: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['groceries'] || null,
    },
    {
      user_id: userId,
      account_id: accountId,
      merchant_name: 'Power Company',
      description: 'Electricity bill',
      amount: -185.00,
      occurred_at: new Date(now.getFullYear(), now.getMonth() - 2, 10).toISOString(),
      status: 'approved',
      envelope_id: envelopeMap['utilities'] || null,
    },
  ];

  console.log('Inserting transactions...');
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactions)
    .select();

  if (error) {
    console.error('Failed to insert transactions:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully created ${data.length} test transactions`);
  console.log('Transactions span from:', new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]);
  console.log('To:', now.toISOString().split('T')[0]);
}

seedTransactions();
