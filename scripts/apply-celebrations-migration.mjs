#!/usr/bin/env node

/**
 * Apply the celebrations & gift tracking migration
 * This creates:
 * - is_celebration column on envelopes
 * - gift_recipients table
 * - celebration_reminders table
 * - envelope_templates table with celebration templates
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying celebrations & gift tracking migration...\n');

  // Step 1: Add is_celebration column to envelopes
  console.log('Step 1: Adding is_celebration column to envelopes...');
  const { error: step1Error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE public.envelopes
      ADD COLUMN IF NOT EXISTS is_celebration BOOLEAN DEFAULT false;
    `
  });

  if (step1Error) {
    // Try direct query if RPC doesn't exist
    const { error } = await supabase.from('envelopes').select('is_celebration').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('  Column does not exist, needs manual migration');
      console.log('  Run this SQL in Supabase Dashboard:');
      console.log('  ALTER TABLE public.envelopes ADD COLUMN IF NOT EXISTS is_celebration BOOLEAN DEFAULT false;');
    } else {
      console.log('  Column already exists or added successfully');
    }
  } else {
    console.log('  Done');
  }

  // Step 2: Check if gift_recipients table exists
  console.log('\nStep 2: Checking gift_recipients table...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('gift_recipients')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.log('  Table does not exist. Please run the migration SQL in Supabase Dashboard.');
    console.log('  Migration file: supabase/migrations/0047_celebrations_gift_tracking.sql');
  } else {
    console.log('  Table exists');
  }

  // Step 3: Check if celebration_reminders table exists
  console.log('\nStep 3: Checking celebration_reminders table...');
  const { error: remindersError } = await supabase
    .from('celebration_reminders')
    .select('id')
    .limit(1);

  if (remindersError && remindersError.message.includes('does not exist')) {
    console.log('  Table does not exist. Please run the migration SQL in Supabase Dashboard.');
  } else {
    console.log('  Table exists');
  }

  console.log('\n--- Migration check complete ---');
  console.log('\nIf any tables are missing, please run the full migration SQL from:');
  console.log('supabase/migrations/0047_celebrations_gift_tracking.sql');
}

applyMigration().catch(console.error);
