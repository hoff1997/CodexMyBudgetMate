#!/usr/bin/env node
/**
 * Show full detail of specific user's draft
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqmeepudwtwkpjomxqfz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbWVlcHVkd3R3a3Bqb214cWZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIyNzQ3MiwiZXhwIjoyMDY3ODAzNDcyfQ.n-q3vamxowsXpBwsIlmMHyON3zawQQWcym4vBTDBMEE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const USER_ID = '1522df00-816f-4a63-a042-29d9da3ea03e';

async function showDraft() {
  console.log(`🔍 Getting full draft for user: ${USER_ID}\n`);

  const { data: draft, error } = await supabase
    .from('onboarding_drafts')
    .select('*')
    .eq('user_id', USER_ID)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!draft) {
    console.log('No draft found for this user.');
    return;
  }

  console.log('═'.repeat(60));
  console.log('DRAFT METADATA:');
  console.log(`  User ID: ${draft.user_id}`);
  console.log(`  Full Name: ${draft.full_name}`);
  console.log(`  Current Step: ${draft.current_step}`);
  console.log(`  Use Template: ${draft.use_template}`);
  console.log(`  Last Saved: ${draft.last_saved_at}`);
  console.log(`  Updated At: ${draft.updated_at}`);
  console.log(`  Created At: ${draft.created_at}`);

  console.log('\n' + '═'.repeat(60));
  console.log(`ENVELOPES (${draft.envelopes?.length || 0} total):\n`);

  if (draft.envelopes?.length) {
    draft.envelopes.forEach((env, i) => {
      console.log(`${i + 1}. ${env.icon || '📁'} ${env.name}`);
      console.log(`   Type: ${env.type || env.subtype}, Priority: ${env.priority}`);
      console.log(`   Amount: $${env.billAmount || env.monthlyBudget || env.savingsAmount || 0}`);
      console.log(`   Category: ${env.category || 'other'}`);
      if (env.levelingData) {
        console.log(`   Leveling: ${JSON.stringify(env.levelingData)}`);
      }
      console.log('');
    });
  } else {
    console.log('NO ENVELOPES IN DRAFT!');
  }

  console.log('═'.repeat(60));
  console.log(`INCOME SOURCES (${draft.income_sources?.length || 0}):\n`);

  if (draft.income_sources?.length) {
    draft.income_sources.forEach((inc, i) => {
      console.log(`${i + 1}. ${inc.name} - $${inc.amount} (${inc.frequency})`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`ALLOCATIONS:\n`);
  console.log(JSON.stringify(draft.envelope_allocations, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log(`OPENING BALANCES:\n`);
  console.log(JSON.stringify(draft.opening_balances, null, 2));
}

showDraft().catch(console.error);
