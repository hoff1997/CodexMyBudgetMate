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

const sql = `
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pay_cycle text
  CHECK (pay_cycle IN ('weekly', 'fortnightly', 'monthly'))
  DEFAULT 'fortnightly';

COMMENT ON COLUMN public.profiles.pay_cycle IS
  'User pay cycle frequency: weekly, fortnightly, or monthly. Used for payday allocation calculations and budget planning.';
`;

console.log('🚀 Applying pay_cycle migration...\n');

try {
  const { error } = await supabase.rpc('exec', { sql });

  if (error) {
    // Try direct query if RPC doesn't exist
    const { error: directError } = await supabase.from('profiles').select('pay_cycle').limit(1);

    if (directError && directError.code === '42703') {
      console.error('❌ Column does not exist and cannot be added via client.');
      console.log('\n📋 Please run this SQL manually in Supabase Dashboard:\n');
      console.log(sql);
      process.exit(1);
    } else if (!directError) {
      console.log('✅ Column already exists!');
      console.log('🎉 The "Load sample data" button should now work!');
      process.exit(0);
    }

    throw error;
  }

  console.log('✅ Migration applied successfully!');
  console.log('🎉 The "Load sample data" button should now work!');
} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('\n📋 Please run this SQL manually in Supabase Dashboard:\n');
  console.log(sql);
  process.exit(1);
}
