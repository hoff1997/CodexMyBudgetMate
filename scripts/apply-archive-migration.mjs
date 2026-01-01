#!/usr/bin/env node
/**
 * Apply Archive System Migration
 *
 * Run with: node scripts/apply-archive-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 Starting archive system migration...\n');

  try {
    // Check if is_archived column exists
    console.log('📦 Checking is_archived column...');
    const { data: testArchived, error: archivedCheck } = await supabase
      .from('envelopes')
      .select('is_archived')
      .limit(1);

    if (archivedCheck?.code === '42703') {
      console.log('  ⚠️ is_archived column needs to be added via SQL');
    } else if (!archivedCheck) {
      console.log('  ✅ is_archived column already exists');
    }

    // Check if archived_at column exists
    console.log('📦 Checking archived_at column...');
    const { data: testArchivedAt, error: archivedAtCheck } = await supabase
      .from('envelopes')
      .select('archived_at')
      .limit(1);

    if (archivedAtCheck?.code === '42703') {
      console.log('  ⚠️ archived_at column needs to be added via SQL');
    } else if (!archivedAtCheck) {
      console.log('  ✅ archived_at column already exists');
    }

    // Check if archive_reason column exists
    console.log('📦 Checking archive_reason column...');
    const { data: testReason, error: reasonCheck } = await supabase
      .from('envelopes')
      .select('archive_reason')
      .limit(1);

    if (reasonCheck?.code === '42703') {
      console.log('  ⚠️ archive_reason column needs to be added via SQL');
    } else if (!reasonCheck) {
      console.log('  ✅ archive_reason column already exists');
    }

    // Check if all columns exist
    console.log('\n📊 Checking final column state...');
    const { data: testAll, error: testAllError } = await supabase
      .from('envelopes')
      .select('id, is_archived, archived_at, archive_reason')
      .limit(1);

    if (testAllError) {
      console.log('\n⚠️ Some columns are still missing. Please run this SQL in Supabase Dashboard:');
      console.log('─'.repeat(60));
      console.log(`
-- Add archive columns to envelopes
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_envelopes_archived ON envelopes(user_id, is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_envelopes_archived_at ON envelopes(user_id, archived_at) WHERE is_archived = true;
      `);
      console.log('─'.repeat(60));
    } else {
      console.log('✅ All archive columns exist in envelopes table');
    }

    console.log('\n🎉 Migration check complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
