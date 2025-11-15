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

console.log('🎮 Checking onboarding & gamification migration status...\n');

async function checkMigrationStatus() {
  // Check if user_achievements table exists
  const { error: achievementsError } = await supabase
    .from('user_achievements')
    .select('id')
    .limit(1);

  if (achievementsError && achievementsError.code === '42P01') {
    console.log('❌ user_achievements table does not exist');
    console.log('\n📋 Migration needs to be applied manually in Supabase Dashboard.\n');
    console.log('Run this migration file:');
    console.log('  supabase/migrations/0018_onboarding_gamification.sql\n');
    console.log('Or copy the SQL from the migration file and run it in the SQL Editor.\n');
    return false;
  } else if (!achievementsError) {
    console.log('✅ user_achievements table exists!');
  }

  // Check if persona column exists
  const { error: personaError } = await supabase
    .from('profiles')
    .select('user_persona')
    .limit(1);

  if (personaError && personaError.code === '42703') {
    console.log('❌ user_persona column does not exist in profiles table');
    console.log('\n📋 Migration needs to be applied manually in Supabase Dashboard.\n');
    return false;
  } else if (!personaError) {
    console.log('✅ user_persona column exists in profiles!');
  }

  // Check if user_progress table exists
  const { error: progressError } = await supabase
    .from('user_progress')
    .select('id')
    .limit(1);

  if (progressError && progressError.code === '42P01') {
    console.log('❌ user_progress table does not exist');
    console.log('\n📋 Migration needs to be applied manually in Supabase Dashboard.\n');
    return false;
  } else if (!progressError) {
    console.log('✅ user_progress table exists!');
  }

  // Check if demo_mode_sessions table exists
  const { error: demoError } = await supabase
    .from('demo_mode_sessions')
    .select('id')
    .limit(1);

  if (demoError && demoError.code === '42P01') {
    console.log('❌ demo_mode_sessions table does not exist');
    console.log('\n📋 Migration needs to be applied manually in Supabase Dashboard.\n');
    return false;
  } else if (!demoError) {
    console.log('✅ demo_mode_sessions table exists!');
  }

  return true;
}

try {
  const allReady = await checkMigrationStatus();

  if (allReady) {
    console.log('\n🎉 All gamification & onboarding features are ready!');
    console.log('\nNext steps:');
    console.log('  1. New users will see /onboarding flow on first login');
    console.log('  2. Users can earn achievements throughout the app');
    console.log('  3. Demo mode users will see conversion prompts after 3 days');
    console.log('  4. Check docs/culture-statement.md for language guidelines');
    console.log('  5. Check docs/email-strategy.md for future email implementation\n');
  } else {
    console.log('\n📋 To apply the migration:');
    console.log('  1. Open Supabase Dashboard → SQL Editor');
    console.log('  2. Open: supabase/migrations/0018_onboarding_gamification.sql');
    console.log('  3. Copy all SQL and run in SQL Editor');
    console.log('  4. Run this script again to verify\n');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
