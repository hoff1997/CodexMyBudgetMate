#!/usr/bin/env node
/**
 * Script to find ALL recent data across tables
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqmeepudwtwkpjomxqfz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbWVlcHVkd3R3a3Bqb214cWZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIyNzQ3MiwiZXhwIjoyMDY3ODAzNDcyfQ.n-q3vamxowsXpBwsIlmMHyON3zawQQWcym4vBTDBMEE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findRecentData() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`🔍 Looking for data from the last 2 hours (since ${twoHoursAgo})...\n`);
  console.log(`Today's date: ${today}\n`);

  // Check onboarding_drafts with updated_at
  console.log('═'.repeat(60));
  console.log('📋 ONBOARDING DRAFTS (all):\n');

  const { data: allDrafts, error: draftsError } = await supabase
    .from('onboarding_drafts')
    .select('*')
    .order('last_saved_at', { ascending: false });

  if (draftsError) {
    console.error('Error:', draftsError.message);
  } else if (allDrafts?.length) {
    allDrafts.forEach(draft => {
      console.log(`User: ${draft.user_id}`);
      console.log(`Name: ${draft.full_name}`);
      console.log(`Step: ${draft.current_step}`);
      console.log(`Last Saved: ${draft.last_saved_at}`);
      console.log(`Envelopes: ${draft.envelopes?.length || 0}`);
      console.log(`Updated At: ${draft.updated_at || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('No drafts found.');
  }

  // Check envelopes created today
  console.log('═'.repeat(60));
  console.log('📦 ENVELOPES (last 50, ordered by created_at desc):\n');

  const { data: envelopes, error: envError } = await supabase
    .from('envelopes')
    .select('id, name, icon, subtype, user_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (envError) {
    console.error('Error:', envError.message);
  } else if (envelopes?.length) {
    // Group by user
    const byUser = {};
    envelopes.forEach(env => {
      if (!byUser[env.user_id]) byUser[env.user_id] = [];
      byUser[env.user_id].push(env);
    });

    for (const [userId, userEnvs] of Object.entries(byUser)) {
      console.log(`\nUser: ${userId}`);
      console.log(`Count: ${userEnvs.length} envelopes`);
      console.log(`Latest created: ${userEnvs[0].created_at}`);
      userEnvs.slice(0, 5).forEach(env => {
        console.log(`  ${env.icon} ${env.name} - Created: ${env.created_at}`);
      });
      if (userEnvs.length > 5) {
        console.log(`  ... and ${userEnvs.length - 5} more`);
      }
    }
  }

  // Check profiles
  console.log('\n' + '═'.repeat(60));
  console.log('👤 PROFILES:\n');

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, full_name, email, onboarding_completed, has_onboarding_draft, updated_at, created_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (profError) {
    console.error('Error:', profError.message);
  } else if (profiles?.length) {
    profiles.forEach(p => {
      console.log(`${p.full_name || p.email || 'Unknown'}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Onboarding completed: ${p.onboarding_completed}`);
      console.log(`  Has draft: ${p.has_onboarding_draft}`);
      console.log(`  Updated: ${p.updated_at}`);
      console.log('');
    });
  }

  // Check income_sources
  console.log('═'.repeat(60));
  console.log('💰 INCOME SOURCES (recent):\n');

  const { data: incomes, error: incError } = await supabase
    .from('income_sources')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (incError) {
    console.error('Error:', incError.message);
  } else if (incomes?.length) {
    incomes.forEach(inc => {
      console.log(`${inc.name} - $${inc.typical_amount} (${inc.pay_cycle})`);
      console.log(`  User: ${inc.user_id}`);
      console.log(`  Created: ${inc.created_at}`);
    });
  }

  // Check envelope_income_allocations
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ENVELOPE ALLOCATIONS (recent):\n');

  const { data: allocations, error: allocError } = await supabase
    .from('envelope_income_allocations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (allocError) {
    console.error('Error:', allocError.message);
  } else if (allocations?.length) {
    console.log(`Found ${allocations.length} allocation records`);
    const userIds = [...new Set(allocations.map(a => a.user_id))];
    console.log(`Users with allocations: ${userIds.join(', ')}`);
  } else {
    console.log('No allocations found.');
  }

  console.log('\n✅ Search complete.');
}

findRecentData().catch(console.error);
