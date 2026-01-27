#!/usr/bin/env node
/**
 * Check live database tables for any saved envelope data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqmeepudwtwkpjomxqfz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbWVlcHVkd3R3a3Bqb214cWZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIyNzQ3MiwiZXhwIjoyMDY3ODAzNDcyfQ.n-q3vamxowsXpBwsIlmMHyON3zawQQWcym4vBTDBMEE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const USER_ID = '1522df00-816f-4a63-a042-29d9da3ea03e';

async function checkLiveData() {
  console.log('🔍 Checking LIVE database tables for user:', USER_ID);
  console.log('═'.repeat(60));

  // Check envelope_income_allocations for any saved allocations
  console.log('\n📊 ENVELOPE INCOME ALLOCATIONS (live table):');
  const { data: allocations, error: allocErr } = await supabase
    .from('envelope_income_allocations')
    .select('*, envelopes(name)')
    .eq('user_id', USER_ID)
    .order('updated_at', { ascending: false });

  if (allocErr) {
    console.log('Error:', allocErr.message);
  } else if (allocations?.length) {
    console.log(`Found ${allocations.length} allocations:`);
    allocations.forEach(a => {
      const envName = a.envelopes?.name || a.envelope_id;
      console.log(`  ${envName}: $${a.allocation_amount} per pay (updated: ${a.updated_at})`);
    });
  } else {
    console.log('No allocations found in live table.');
  }

  // Check envelopes table
  console.log('\n' + '═'.repeat(60));
  console.log('📦 ENVELOPES (live table):');
  const { data: envelopes, error: envErr } = await supabase
    .from('envelopes')
    .select('id, name, target_amount, monthly_budget, current_balance, updated_at')
    .eq('user_id', USER_ID)
    .order('updated_at', { ascending: false });

  if (envErr) {
    console.log('Error:', envErr.message);
  } else if (envelopes?.length) {
    console.log(`Found ${envelopes.length} envelopes:`);
    envelopes.slice(0, 20).forEach(e => {
      const target = e.target_amount || 0;
      const monthly = e.monthly_budget || 0;
      const balance = e.current_balance || 0;
      if (target > 0 || monthly > 0 || balance > 0) {
        console.log(`  ${e.name}: target=$${target}, monthly=$${monthly}, balance=$${balance}`);
      }
    });

    // Check if any have amounts
    const withAmounts = envelopes.filter(e =>
      (e.target_amount || 0) > 0 ||
      (e.monthly_budget || 0) > 0 ||
      (e.current_balance || 0) > 0
    );
    console.log(`\n  Envelopes with amounts: ${withAmounts.length} of ${envelopes.length}`);
  } else {
    console.log('No envelopes found in live table (onboarding not completed yet).');
  }

  // Check profiles table for onboarding status
  console.log('\n' + '═'.repeat(60));
  console.log('👤 PROFILE STATUS:');
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', USER_ID)
    .single();

  if (profile) {
    console.log(`  Name: ${profile.full_name}`);
    console.log(`  Onboarding completed: ${profile.onboarding_completed}`);
    console.log(`  Has draft: ${profile.has_onboarding_draft}`);
    console.log(`  Updated: ${profile.updated_at}`);
  }

  // Check for any Vercel/edge function logs (not available via Supabase)
  console.log('\n' + '═'.repeat(60));
  console.log('ℹ️ Additional places to check:');
  console.log('  1. Vercel function logs: https://vercel.com/dashboard');
  console.log('  2. Browser localStorage (in your browser dev tools)');
  console.log('  3. Browser IndexedDB');
  console.log('  4. Supabase Dashboard > Database > Logs');

  console.log('\n✅ Check complete.');
}

checkLiveData().catch(console.error);
