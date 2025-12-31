#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔄 Applying suggested envelopes migration...');

  // Check if columns already exist by trying to query them
  const { data: testData, error: testError } = await supabase
    .from('envelopes')
    .select('is_suggested')
    .limit(1);

  if (!testError) {
    console.log('✅ Columns already exist! Migration not needed.');
    return;
  }

  if (testError && !testError.message.includes('column')) {
    console.error('❌ Unexpected error:', testError.message);
    return;
  }

  console.log('⚠️ New columns need to be added to the database.');
  console.log('');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('');
  console.log('-- Suggested Envelopes migration');
  console.log(`ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_suggested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggestion_type TEXT CHECK (suggestion_type IN ('starter-stash', 'safety-net', NULL)),
ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_calculate_target BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_envelopes_is_suggested ON public.envelopes(user_id, is_suggested) WHERE is_suggested = true;
CREATE INDEX IF NOT EXISTS idx_envelopes_is_dismissed ON public.envelopes(user_id, is_dismissed) WHERE is_dismissed = true;`);
  console.log('');
  console.log('Go to: https://supabase.com/dashboard/project/nqmeepudwtwkpjomxqfz/sql/new');
}

run().catch(console.error);
