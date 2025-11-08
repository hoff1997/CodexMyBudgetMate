#!/usr/bin/env node

/**
 * Data Migration: Create default income sources and Surplus envelopes
 *
 * This script:
 * 1. Creates a "Primary Income" source for each user based on their profile.pay_cycle
 * 2. Creates a "Surplus" envelope for each user if it doesn't exist
 * 3. Migrates existing allocation plans to link to the new income source
 *
 * Run with: node scripts/migrate-income-sources.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');
const envFile = readFileSync(envPath, 'utf-8');

const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrateIncomeSources() {
  console.log('🚀 Starting income source migration...\n');

  // 1. Get all users with profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, pay_cycle');

  if (profilesError) {
    console.error('❌ Failed to fetch profiles:', profilesError);
    process.exit(1);
  }

  console.log(`📊 Found ${profiles.length} user profiles\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const profile of profiles) {
    console.log(`\n👤 Processing user: ${profile.full_name || profile.id}`);

    try {
      let userProcessed = false;

      // Check if user already has an income source
      const { data: existingSources } = await supabase
        .from('income_sources')
        .select('id')
        .eq('user_id', profile.id)
        .limit(1);

      let incomeSource = null;
      if (existingSources && existingSources.length > 0) {
        console.log('   ✅ Income source already exists');
        incomeSource = existingSources[0];
      } else {

        // Create default income source
        const payCycle = profile.pay_cycle || 'fortnightly';
        const { data: newIncomeSource, error: incomeError } = await supabase
          .from('income_sources')
          .insert({
            user_id: profile.id,
            name: 'Primary Income',
            pay_cycle: payCycle,
            typical_amount: null, // User will set this in wizard
            detection_rule_id: null, // User will set this in wizard
            auto_allocate: true,
            is_active: true,
          })
          .select()
          .single();

        if (incomeError) {
          console.error('   ❌ Failed to create income source:', incomeError.message);
          errorCount++;
          continue;
        }

        incomeSource = newIncomeSource;
        console.log(`   ✅ Created income source: "${incomeSource.name}" (${payCycle})`);

        // Update existing allocation plans to link to this income source
        const { error: updateError } = await supabase
          .from('allocation_plans')
          .update({ income_source_id: incomeSource.id })
          .eq('user_id', profile.id)
          .is('income_source_id', null);

        if (updateError) {
          console.warn('   ⚠️  Failed to update allocation plans:', updateError.message);
        } else {
          console.log('   ✅ Linked existing allocation plans to income source');
        }
        userProcessed = true;
      }

      // Check if Surplus envelope exists
      const { data: existingSurplus } = await supabase
        .from('envelopes')
        .select('id')
        .eq('user_id', profile.id)
        .eq('name', 'Surplus')
        .limit(1);

      if (existingSurplus && existingSurplus.length > 0) {
        console.log('   ✅ Surplus envelope already exists');
      } else {
        // Create Surplus envelope
        const { error: surplusError } = await supabase
          .from('envelopes')
          .insert({
            user_id: profile.id,
            name: 'Surplus',
            envelope_type: 'expense',
            priority: 'discretionary',
            target_amount: 0,
            annual_amount: 0,
            pay_cycle_amount: 0,
          });

        if (surplusError) {
          console.warn('   ⚠️  Failed to create Surplus envelope:', surplusError.message);
        } else {
          console.log('   ✅ Created Surplus envelope');
          userProcessed = true;
        }
      }

      if (userProcessed) {
        successCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error('   ❌ Unexpected error:', error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully migrated: ${successCount}`);
  console.log(`⏭️  Skipped (already migrated): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with some errors. Please review above.');
  }
}

// Run migration
migrateIncomeSources().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
