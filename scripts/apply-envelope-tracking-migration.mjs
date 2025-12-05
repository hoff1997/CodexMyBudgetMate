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

console.log('📋 Checking envelope tracking flag migration status...\n');

async function checkMigrationStatus() {
  let allReady = true;

  // Check if is_tracking_only column exists on envelopes table
  const { error: trackingError } = await supabase
    .from('envelopes')
    .select('is_tracking_only')
    .limit(1);

  if (trackingError && trackingError.code === '42703') {
    console.log('❌ is_tracking_only column does not exist in envelopes table');
    allReady = false;
  } else if (!trackingError) {
    console.log('✅ is_tracking_only column exists in envelopes!');
  }

  return allReady;
}

try {
  const allReady = await checkMigrationStatus();

  if (allReady) {
    console.log('\n🎉 Envelope tracking flag migration is ready!');
    console.log('\nFeatures enabled:');
    console.log('  ✅ Tracking-only flag for envelopes (e.g., reimbursements)');
    console.log('  ✅ Ability to mark envelopes that don\'t need budget allocation\n');
  } else {
    console.log('\n📋 To apply the migration:');
    console.log('  1. Open Supabase Dashboard → SQL Editor');
    console.log('  2. Open: supabase/migrations/0024_envelope_tracking_flag.sql');
    console.log('  3. Copy all SQL and run in SQL Editor');
    console.log('  4. Run this script again to verify\n');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
