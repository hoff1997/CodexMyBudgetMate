import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manually load .env.local
function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env.local');
    const envFile = readFileSync(envPath, 'utf8');
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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

console.log('✅ Loaded Supabase credentials');
console.log(`   URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationsDir = join(__dirname, '../supabase/migrations');

// Only run the new migrations from this session
const newMigrations = [
  { file: '0006_add_envelope_type.sql', name: 'Add envelope_type field' },
  { file: '0007_credit_card_holding_system.sql', name: 'Credit card holding system' },
  { file: '0011_envelope_monitoring.sql', name: 'Envelope monitoring feature' }
];

async function runMigration(migration) {
  const filepath = join(migrationsDir, migration.file);
  const sql = readFileSync(filepath, 'utf8');

  console.log(`📄 ${migration.name}`);
  console.log(`   File: ${migration.file}`);

  try {
    // Execute the full SQL content
    // Most Supabase setups will handle multiple statements in one call
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql
    }).catch(() => ({ data: null, error: { code: 'NO_RPC' } }));

    if (error && error.code === 'NO_RPC') {
      // If exec_sql RPC doesn't exist, we need to apply migrations manually
      console.log(`   ⚠️  Direct SQL execution not available`);
      console.log(`   Please run this migration manually in Supabase SQL Editor`);
      console.log(`   Or use the Supabase CLI: supabase db push\n`);
      return 'manual';
    }

    if (error) {
      // Check if it's an "already exists" error (which is okay)
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.code === '42P07' || // duplicate table
          error.code === '42710' || // duplicate object
          error.code === '42701') { // duplicate column
        console.log(`   ⚠️  Already applied (skipping)\n`);
        return 'skipped';
      }
      throw error;
    }

    console.log(`   ✅ Applied successfully\n`);
    return 'success';
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}\n`);
    return 'error';
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  console.log(`Running ${newMigrations.length} new migrations:\n`);

  const results = {
    success: 0,
    skipped: 0,
    error: 0,
    manual: 0
  };

  for (const migration of newMigrations) {
    const result = await runMigration(migration);
    results[result]++;
  }

  console.log('📊 Migration Summary:');
  console.log(`   ✅ Applied: ${results.success}`);
  console.log(`   ⚠️  Skipped (already applied): ${results.skipped}`);
  console.log(`   ❌ Failed: ${results.error}`);
  if (results.manual > 0) {
    console.log(`   📝 Needs manual application: ${results.manual}`);
  }
  console.log('');

  if (results.manual > 0) {
    console.log('⚠️  Some migrations need to be applied manually.');
    console.log('   Option 1: Copy the SQL from supabase/migrations/ and run in Supabase SQL Editor');
    console.log('   Option 2: Install Supabase CLI and run: supabase db push');
  } else if (results.error > 0) {
    console.log('⚠️  Some migrations failed. Check the error messages above.');
  } else if (results.success > 0) {
    console.log('🎉 All migrations completed successfully!');
  } else {
    console.log('✅ All migrations already applied!');
  }

  process.exit(0);
}

main();
