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
-- Add interest rate field for debt payoff goals
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2) DEFAULT NULL;

-- Add index for debt payoff goals (only if goal_type column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'envelopes'
    AND column_name = 'goal_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_envelopes_debt_payoff
      ON public.envelopes(goal_type)
      WHERE goal_type = 'debt_payoff';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.envelopes.interest_rate IS
  'Annual interest rate (APR) for debt payoff goals. Used to calculate interest and optimize payment strategies.';
`;

console.log('🚀 Applying debt tracking migration...\n');

try {
  const { error } = await supabase.rpc('exec', { sql });

  if (error) {
    // Try direct query to check if column exists
    const { error: directError } = await supabase.from('envelopes').select('interest_rate').limit(1);

    if (directError && directError.code === '42703') {
      console.error('❌ Column does not exist and cannot be added via client.');
      console.log('\n📋 Please run this SQL manually in Supabase Dashboard:\n');
      console.log(sql);
      process.exit(1);
    } else if (!directError) {
      console.log('✅ Column already exists!');
      console.log('🎉 Debt tracking feature is ready!');
      process.exit(0);
    }

    throw error;
  }

  console.log('✅ Migration applied successfully!');
  console.log('🎉 Debt tracking feature is ready!');
} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('\n📋 Please run this SQL manually in Supabase Dashboard:\n');
  console.log(sql);
  process.exit(1);
}
