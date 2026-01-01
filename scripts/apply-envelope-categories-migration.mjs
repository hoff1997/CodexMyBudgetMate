#!/usr/bin/env node
/**
 * Apply Envelope Categories Migration
 *
 * This script adds the icon, is_system, display_order, and updated_at columns
 * to the envelope_categories table, and category_display_order to envelopes.
 *
 * Run with: node scripts/apply-envelope-categories-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
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
  console.log('🚀 Starting envelope categories migration...\n');

  try {
    // Step 1: Add icon column if it doesn't exist
    console.log('📦 Adding icon column...');
    const { error: iconError } = await supabase.rpc('run_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'envelope_categories'
            AND column_name = 'icon'
          ) THEN
            ALTER TABLE envelope_categories ADD COLUMN icon VARCHAR(10);
            RAISE NOTICE 'Added icon column';
          ELSE
            RAISE NOTICE 'icon column already exists';
          END IF;
        END $$;
      `
    });
    if (iconError) {
      // Try direct approach if RPC fails
      console.log('  RPC not available, trying direct column add...');
      const { error: directIconError } = await supabase
        .from('envelope_categories')
        .select('icon')
        .limit(1);

      if (directIconError?.code === '42703') {
        // Column doesn't exist, but we can't add it via API
        console.log('  ⚠️ icon column needs to be added via SQL');
      } else if (!directIconError) {
        console.log('  ✅ icon column already exists');
      }
    } else {
      console.log('  ✅ Done');
    }

    // Step 2: Add is_system column if it doesn't exist
    console.log('📦 Adding is_system column...');
    const { data: testIsSystem, error: isSystemCheck } = await supabase
      .from('envelope_categories')
      .select('is_system')
      .limit(1);

    if (isSystemCheck?.code === '42703') {
      console.log('  ⚠️ is_system column needs to be added via SQL');
    } else if (!isSystemCheck) {
      console.log('  ✅ is_system column already exists');
    }

    // Step 3: Add display_order column if it doesn't exist
    console.log('📦 Adding display_order column...');
    const { data: testDisplayOrder, error: displayOrderCheck } = await supabase
      .from('envelope_categories')
      .select('display_order')
      .limit(1);

    if (displayOrderCheck?.code === '42703') {
      console.log('  ⚠️ display_order column needs to be added via SQL');
    } else if (!displayOrderCheck) {
      console.log('  ✅ display_order column already exists');
    }

    // Step 4: Add updated_at column if it doesn't exist
    console.log('📦 Adding updated_at column...');
    const { data: testUpdatedAt, error: updatedAtCheck } = await supabase
      .from('envelope_categories')
      .select('updated_at')
      .limit(1);

    if (updatedAtCheck?.code === '42703') {
      console.log('  ⚠️ updated_at column needs to be added via SQL');
    } else if (!updatedAtCheck) {
      console.log('  ✅ updated_at column already exists');
    }

    // Step 5: Add category_display_order to envelopes
    console.log('📦 Adding category_display_order to envelopes...');
    const { data: testCatOrder, error: catOrderCheck } = await supabase
      .from('envelopes')
      .select('category_display_order')
      .limit(1);

    if (catOrderCheck?.code === '42703') {
      console.log('  ⚠️ category_display_order column needs to be added via SQL');
    } else if (!catOrderCheck) {
      console.log('  ✅ category_display_order column already exists');
    }

    // Check if all columns exist
    console.log('\n📊 Checking final column state...');
    const { data: testAll, error: testAllError } = await supabase
      .from('envelope_categories')
      .select('id, name, icon, is_system, display_order, updated_at')
      .limit(1);

    if (testAllError) {
      console.log('\n⚠️ Some columns are still missing. Please run this SQL in Supabase Dashboard:');
      console.log('─'.repeat(60));
      console.log(`
-- Add missing columns to envelope_categories
ALTER TABLE envelope_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(10);
ALTER TABLE envelope_categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE envelope_categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE envelope_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing column to envelopes
ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS category_display_order INT DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_envelope_categories_user_order
  ON envelope_categories(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_envelopes_category_order
  ON envelopes(category_id, category_display_order);
      `);
      console.log('─'.repeat(60));
    } else {
      console.log('✅ All columns exist in envelope_categories');
    }

    console.log('\n🎉 Migration check complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
