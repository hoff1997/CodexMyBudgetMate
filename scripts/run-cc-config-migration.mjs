#!/usr/bin/env node

/**
 * Run Credit Card Configs Migration
 * Creates the credit_card_configs table directly via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🔧 Creating credit_card_configs table...\n');

  // Check if table already exists
  const { data: existing, error: checkError } = await supabase
    .from('credit_card_configs')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Table credit_card_configs already exists!');

    // Count existing rows
    const { count } = await supabase
      .from('credit_card_configs')
      .select('*', { count: 'exact', head: true });

    console.log(`   Current rows: ${count || 0}`);
    return;
  }

  // If error is "relation does not exist", we need to create it
  if (checkError.message.includes('does not exist')) {
    console.log('Table does not exist. Please run this SQL in Supabase Dashboard:\n');
    console.log('----------------------------------------');
    console.log(`
-- Credit Card Configuration Table
CREATE TABLE IF NOT EXISTS credit_card_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('pay_in_full', 'paying_down', 'minimum_only')),
  statement_close_day INTEGER CHECK (statement_close_day >= 1 AND statement_close_day <= 31),
  payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
  apr NUMERIC(5, 2),
  minimum_payment NUMERIC(10, 2),
  still_using BOOLEAN DEFAULT true,
  starting_debt_amount NUMERIC(10, 2),
  starting_debt_date TIMESTAMPTZ,
  expected_monthly_spending NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_credit_card_configs_user_id ON credit_card_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_configs_account_id ON credit_card_configs(account_id);

-- RLS Policies
ALTER TABLE credit_card_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit card configs"
  ON credit_card_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit card configs"
  ON credit_card_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit card configs"
  ON credit_card_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit card configs"
  ON credit_card_configs FOR DELETE
  USING (auth.uid() = user_id);
`);
    console.log('----------------------------------------');
    console.log('\n📋 Go to: Supabase Dashboard → SQL Editor → Paste & Run');
  } else {
    console.error('❌ Unexpected error:', checkError.message);
  }
}

runMigration();
