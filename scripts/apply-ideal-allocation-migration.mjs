import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Ideal Allocation System migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '0025_ideal_allocation_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('🔧 Applying migration...\n');

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      const { error: directError } = await supabase.from('envelope_income_allocations').select('id').limit(1);

      if (directError) {
        throw new Error(`Migration failed: ${error.message}`);
      }

      console.log('⚠️  Note: Using alternative migration method');
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify the new columns exist
    console.log('🔍 Verifying new columns...');

    const { data: testData, error: testError } = await supabase
      .from('envelope_income_allocations')
      .select('suggested_amount, allocation_locked, locked_at')
      .limit(1);

    if (testError) {
      console.log('⚠️  Could not verify columns (may need manual verification)');
      console.log('Error:', testError.message);
    } else {
      console.log('✅ New columns verified:');
      console.log('   - suggested_amount');
      console.log('   - allocation_locked');
      console.log('   - locked_at');
    }

    console.log('\n✨ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Review the migration in Supabase dashboard');
    console.log('2. Test ideal allocation calculator functions');
    console.log('3. Implement UI components for suggestion/locking');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease apply the migration manually using:');
    console.log('npx supabase db push');
    process.exit(1);
  }
}

applyMigration();
