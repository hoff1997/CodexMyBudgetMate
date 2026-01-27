#!/usr/bin/env node
/**
 * Script to check for onboarding drafts in the database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqmeepudwtwkpjomxqfz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbWVlcHVkd3R3a3Bqb214cWZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIyNzQ3MiwiZXhwIjoyMDY3ODAzNDcyfQ.n-q3vamxowsXpBwsIlmMHyON3zawQQWcym4vBTDBMEE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDrafts() {
  console.log('🔍 Checking for onboarding drafts...\n');

  // Get all onboarding drafts
  const { data: drafts, error: draftsError } = await supabase
    .from('onboarding_drafts')
    .select('*')
    .order('last_saved_at', { ascending: false });

  if (draftsError) {
    console.error('Error fetching drafts:', draftsError);
    return;
  }

  if (!drafts || drafts.length === 0) {
    console.log('❌ No onboarding drafts found in database.\n');
  } else {
    console.log(`✅ Found ${drafts.length} onboarding draft(s):\n`);

    for (const draft of drafts) {
      console.log('─'.repeat(60));
      console.log(`User ID: ${draft.user_id}`);
      console.log(`Current Step: ${draft.current_step}`);
      console.log(`Last Saved: ${draft.last_saved_at}`);
      console.log(`Full Name: ${draft.full_name || '(not set)'}`);
      console.log(`Use Template: ${draft.use_template}`);
      console.log(`Envelopes Count: ${draft.envelopes?.length || 0}`);
      console.log(`Income Sources Count: ${draft.income_sources?.length || 0}`);
      console.log(`Bank Accounts Count: ${draft.bank_accounts?.length || 0}`);

      if (draft.envelopes?.length > 0) {
        console.log('\n📦 Envelopes in draft:');
        draft.envelopes.slice(0, 10).forEach((env, i) => {
          console.log(`  ${i + 1}. ${env.icon || '📁'} ${env.name} (${env.type || env.subtype})`);
        });
        if (draft.envelopes.length > 10) {
          console.log(`  ... and ${draft.envelopes.length - 10} more`);
        }
      }

      console.log('');
    }
  }

  // Also check for profiles with has_onboarding_draft flag
  console.log('─'.repeat(60));
  console.log('\n🔍 Checking profiles with draft flags...\n');

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, has_onboarding_draft, onboarding_completed')
    .eq('has_onboarding_draft', true);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else if (!profiles || profiles.length === 0) {
    console.log('No profiles with has_onboarding_draft=true found.');
  } else {
    console.log(`Found ${profiles.length} profile(s) with draft flag:\n`);
    profiles.forEach(p => {
      console.log(`  - ${p.full_name || 'Unknown'} (${p.id})`);
      console.log(`    Onboarding completed: ${p.onboarding_completed}`);
    });
  }

  // Check recently saved envelopes in main table
  console.log('\n─'.repeat(60));
  console.log('\n🔍 Checking recently created envelopes in main table...\n');

  const { data: recentEnvelopes, error: envError } = await supabase
    .from('envelopes')
    .select('id, name, icon, subtype, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (envError) {
    console.error('Error fetching envelopes:', envError);
  } else if (!recentEnvelopes || recentEnvelopes.length === 0) {
    console.log('No envelopes found in main table.');
  } else {
    console.log(`Most recent ${recentEnvelopes.length} envelopes:\n`);
    recentEnvelopes.forEach(env => {
      console.log(`  ${env.icon || '📁'} ${env.name} (${env.subtype}) - Created: ${env.created_at}`);
    });
  }

  console.log('\n✅ Check complete.');
}

checkDrafts().catch(console.error);
