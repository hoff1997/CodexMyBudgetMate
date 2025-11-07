import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import readline from 'readline';

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

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function clearUserData(userId) {
  console.log('\n⚠️  WARNING: This will delete ALL data for your account:');
  console.log('   • Transactions and transaction splits');
  console.log('   • Transaction rules');
  console.log('   • Recurring income');
  console.log('   • Net worth snapshots');
  console.log('   • Accounts and liabilities');
  console.log('   • Envelopes');
  console.log('   • Allocation plans\n');

  const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled. No data was deleted.');
    process.exit(0);
  }

  console.log('\n🗑️  Clearing user data...\n');

  const tables = [
    'allocation_plan_items',
    'allocation_plans',
    'transaction_splits',
    'transactions',
    'transaction_rules',
    'recurring_income',
    'net_worth_snapshots',
    'accounts',
    'liabilities',
    'envelopes',
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ ${table}: deleted ${count || 0} records`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully cleared: ${successCount} tables`);
  console.log(`   ❌ Errors: ${errorCount} tables\n`);

  if (errorCount === 0) {
    console.log('🎉 All data cleared! You can now see the "Load sample data" button on your dashboard.');
  } else {
    console.log('⚠️  Some tables had errors. Please check the messages above.');
  }
}

// Get user ID from command line or prompt
const args = process.argv.slice(2);
const userId = args[0];

if (!userId) {
  console.error('❌ Error: Please provide your user ID');
  console.log('\nUsage: node scripts/clear-user-data.mjs <user-id>');
  console.log('\nYou can find your user ID by logging into your app and checking');
  console.log('the Supabase dashboard under Authentication > Users');
  process.exit(1);
}

clearUserData(userId);
