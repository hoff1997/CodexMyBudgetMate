#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials (need SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔄 Checking for snoozed_until column...');

  // Check if column already exists by trying to query it
  const { data: testData, error: testError } = await supabase
    .from('envelopes')
    .select('snoozed_until')
    .limit(1);

  if (!testError) {
    console.log('✅ Column snoozed_until already exists! Migration not needed.');
    return;
  }

  if (testError && !testError.message.includes('column')) {
    console.error('❌ Unexpected error:', testError.message);
    return;
  }

  console.log('⚠️ Column snoozed_until needs to be added.');
  console.log('');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('');
  console.log(`-- Add snoozed_until column for snooze functionality
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ DEFAULT NULL;

-- Create index for snooze queries
CREATE INDEX IF NOT EXISTS idx_envelopes_snoozed ON public.envelopes(user_id, snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.envelopes.snoozed_until IS 'Timestamp when snooze expires - envelope reappears after this time';`);
  console.log('');
  console.log('Go to: https://supabase.com/dashboard/project/nqmeepudwtwkpjomxqfz/sql/new');
}

run().catch(console.error);
