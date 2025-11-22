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
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

async function applyMigration() {
  console.log('📝 Applying user preferences migration...\n');

  try {
    // Execute the full migration SQL
    const migrationSQL = `
      -- Add user preferences for navigation
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS default_page TEXT DEFAULT '/reconcile',
      ADD COLUMN IF NOT EXISTS show_onboarding_menu BOOLEAN DEFAULT true;

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_profiles_default_page ON profiles(default_page);

      -- Update existing users who have completed onboarding
      UPDATE profiles
      SET show_onboarding_menu = false
      WHERE onboarding_completed = true;
    `;

    console.log('Running migration SQL...');

    // Use the REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      // Try a simpler approach - direct SQL execution via psql or add columns one by one
      console.log('Trying alternative approach with individual statements...\n');

      // Try to add default_page column
      const { error: e1 } = await supabase.from('profiles').select('default_page').limit(1);
      if (e1 && e1.message.includes('column "default_page" does not exist')) {
        console.log('⚠️  default_page column does not exist yet');
        console.log('Please run this SQL in Supabase Dashboard SQL Editor:');
        console.log('\n' + '='.repeat(60));
        console.log(migrationSQL);
        console.log('='.repeat(60) + '\n');
        process.exit(1);
      } else {
        console.log('✅ default_page column already exists');
      }

      // Try to add show_onboarding_menu column
      const { error: e2 } = await supabase.from('profiles').select('show_onboarding_menu').limit(1);
      if (e2 && e2.message.includes('column "show_onboarding_menu" does not exist')) {
        console.log('⚠️  show_onboarding_menu column does not exist yet');
        console.log('Please run this SQL in Supabase Dashboard SQL Editor:');
        console.log('\n' + '='.repeat(60));
        console.log(migrationSQL);
        console.log('='.repeat(60) + '\n');
        process.exit(1);
      } else {
        console.log('✅ show_onboarding_menu column already exists');
      }
    }

    // Verify the migration
    console.log('\n📊 Verifying migration...');
    const { data, error: verifyError } = await supabase
      .from('profiles')
      .select('id, default_page, show_onboarding_menu, onboarding_completed')
      .limit(5);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.log('\nPlease run this SQL in Supabase Dashboard SQL Editor:');
      console.log('\n' + '='.repeat(60));
      console.log(migrationSQL);
      console.log('='.repeat(60) + '\n');
      process.exit(1);
    } else {
      console.log('✅ Migration verified! Sample profiles:');
      console.table(data);

      console.log('\n' + '='.repeat(60));
      console.log('✅ User preferences migration complete!');
      console.log('='.repeat(60));
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.log('\nPlease run this SQL manually in Supabase Dashboard SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log(`
-- Add user preferences for navigation
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_page TEXT DEFAULT '/reconcile',
ADD COLUMN IF NOT EXISTS show_onboarding_menu BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_default_page ON profiles(default_page);

-- Update existing users who have completed onboarding
UPDATE profiles
SET show_onboarding_menu = false
WHERE onboarding_completed = true;
    `);
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

applyMigration();
