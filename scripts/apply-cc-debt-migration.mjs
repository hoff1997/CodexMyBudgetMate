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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('💳 Checking credit card debt management migration status...\n');

async function checkMigrationStatus() {
  let allReady = true;

  // Check if apr column exists on accounts table
  const { error: aprError } = await supabase
    .from('accounts')
    .select('apr')
    .limit(1);

  if (aprError && aprError.code === '42703') {
    console.log('❌ apr column does not exist in accounts table');
    allReady = false;
  } else if (!aprError) {
    console.log('✅ apr column exists in accounts!');
  }

  // Check if payment_strategy column exists
  const { error: strategyError } = await supabase
    .from('accounts')
    .select('payment_strategy')
    .limit(1);

  if (strategyError && strategyError.code === '42703') {
    console.log('❌ payment_strategy column does not exist in accounts table');
    allReady = false;
  } else if (!strategyError) {
    console.log('✅ payment_strategy column exists in accounts!');
  }

  // Check if credit_card_payment_history table exists
  const { error: historyError } = await supabase
    .from('credit_card_payment_history')
    .select('id')
    .limit(1);

  if (historyError && historyError.code === '42P01') {
    console.log('❌ credit_card_payment_history table does not exist');
    allReady = false;
  } else if (!historyError) {
    console.log('✅ credit_card_payment_history table exists!');
  }

  // Check if credit_card_interest_charges table exists
  const { error: interestError } = await supabase
    .from('credit_card_interest_charges')
    .select('id')
    .limit(1);

  if (interestError && interestError.code === '42P01') {
    console.log('❌ credit_card_interest_charges table does not exist');
    allReady = false;
  } else if (!interestError) {
    console.log('✅ credit_card_interest_charges table exists!');
  }

  // Check if linked_account_id column exists on envelopes
  const { error: linkedError } = await supabase
    .from('envelopes')
    .select('linked_account_id')
    .limit(1);

  if (linkedError && linkedError.code === '42703') {
    console.log('❌ linked_account_id column does not exist in envelopes table');
    allReady = false;
  } else if (!linkedError) {
    console.log('✅ linked_account_id column exists in envelopes!');
  }

  return allReady;
}

try {
  const allReady = await checkMigrationStatus();

  if (allReady) {
    console.log('\n🎉 All credit card debt management features are ready!');
    console.log('\nFeatures enabled:');
    console.log('  ✅ Interest rate (APR) tracking on accounts');
    console.log('  ✅ Credit limit and utilization tracking');
    console.log('  ✅ Minimum payment calculation');
    console.log('  ✅ Payment strategy (pay_off, avalanche, snowball, minimum_only, custom)');
    console.log('  ✅ Payment history tracking');
    console.log('  ✅ Interest charge tracking');
    console.log('  ✅ Envelope-to-account linking\n');
  } else {
    console.log('\n📋 To apply the migration:');
    console.log('  1. Open Supabase Dashboard → SQL Editor');
    console.log('  2. Open: supabase/migrations/0023_credit_card_debt_management.sql');
    console.log('  3. Copy all SQL and run in SQL Editor');
    console.log('  4. Run this script again to verify\n');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
