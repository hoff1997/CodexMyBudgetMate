#!/usr/bin/env node
/**
 * Check for any historical data or audit logs in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqmeepudwtwkpjomxqfz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbWVlcHVkd3R3a3Bqb214cWZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIyNzQ3MiwiZXhwIjoyMDY3ODAzNDcyfQ.n-q3vamxowsXpBwsIlmMHyON3zawQQWcym4vBTDBMEE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const USER_ID = '1522df00-816f-4a63-a042-29d9da3ea03e';

async function checkHistory() {
  console.log('🔍 Checking for any historical/audit data...\n');

  // Check if there's an audit_log table
  console.log('1. Checking for audit tables...');
  const tables = ['audit_log', 'audit_logs', 'history', 'onboarding_history', 'envelope_history', 'activity_log'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (!error) {
      console.log(`   ✅ Found table: ${table}`);
      const { data: allData } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false })
        .limit(20);

      if (allData?.length) {
        console.log(`      ${allData.length} records for user`);
        console.log(JSON.stringify(allData[0], null, 2));
      }
    }
  }

  // Check auth.audit_log_entries (Supabase built-in)
  console.log('\n2. Checking auth audit logs...');
  try {
    const { data: authLogs, error: authError } = await supabase
      .rpc('get_auth_audit_logs', { user_uuid: USER_ID });

    if (!authError && authLogs) {
      console.log(`   Found ${authLogs.length} auth logs`);
    }
  } catch (e) {
    console.log('   No auth audit function available');
  }

  // Check for any tables with updated_at that might have history
  console.log('\n3. Checking onboarding_drafts full record with all timestamps...');
  const { data: draft, error: draftError } = await supabase
    .from('onboarding_drafts')
    .select('*')
    .eq('user_id', USER_ID)
    .single();

  if (draft) {
    console.log('\n   Full draft record (raw):');
    console.log(`   created_at: ${draft.created_at}`);
    console.log(`   updated_at: ${draft.updated_at}`);
    console.log(`   last_saved_at: ${draft.last_saved_at}`);

    // Check if there are any non-zero amounts hidden in the JSON
    console.log('\n   Checking for any non-zero amounts in envelopes...');
    let hasAmounts = false;
    draft.envelopes?.forEach(env => {
      const amount = env.billAmount || env.monthlyBudget || env.savingsAmount || env.targetAmount || 0;
      if (amount > 0) {
        console.log(`   ${env.name}: $${amount}`);
        hasAmounts = true;
      }
    });
    if (!hasAmounts) {
      console.log('   No amounts found - all are $0');
    }

    // Check allocations for any non-zero values
    console.log('\n   Checking for any non-zero allocations...');
    let hasAllocations = false;
    if (draft.envelope_allocations) {
      for (const [envId, incomeAllocs] of Object.entries(draft.envelope_allocations)) {
        for (const [incomeId, amount] of Object.entries(incomeAllocs)) {
          if (amount > 0) {
            console.log(`   ${envId}: $${amount}`);
            hasAllocations = true;
          }
        }
      }
    }
    if (!hasAllocations) {
      console.log('   No allocations found - all are $0');
    }
  }

  // Check for Supabase realtime/replication tables
  console.log('\n4. Checking for Supabase system tables with history...');

  // Check if user has any completed onboarding data in main tables
  console.log('\n5. Checking main tables for any saved data from previous completed onboarding...');

  const { data: existingEnvelopes } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', USER_ID);

  if (existingEnvelopes?.length) {
    console.log(`\n   Found ${existingEnvelopes.length} envelopes in main table:`);
    existingEnvelopes.forEach(env => {
      console.log(`   ${env.icon} ${env.name}: target=$${env.target_amount || 0}, current=$${env.current_amount || 0}`);
    });
  }

  const { data: existingAllocations } = await supabase
    .from('envelope_income_allocations')
    .select('*')
    .eq('user_id', USER_ID);

  if (existingAllocations?.length) {
    console.log(`\n   Found ${existingAllocations.length} allocations in main table`);
  } else {
    console.log('\n   No allocations in main table');
  }

  // Check income sources
  const { data: incomes } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', USER_ID);

  if (incomes?.length) {
    console.log(`\n   Found ${incomes.length} income sources:`);
    incomes.forEach(inc => {
      console.log(`   ${inc.name}: $${inc.typical_amount} (${inc.pay_cycle})`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('SUPABASE POINT-IN-TIME RECOVERY (PITR):');
  console.log('');
  console.log('Supabase offers PITR for Pro plan and above.');
  console.log('To check if enabled and restore:');
  console.log('1. Go to: https://supabase.com/dashboard/project/nqmeepudwtwkpjomxqfz/settings/database');
  console.log('2. Look for "Point in Time Recovery" section');
  console.log('3. If enabled, you can restore to any point in the last 7 days');
  console.log('');
  console.log('You can also check Database Backups at:');
  console.log('https://supabase.com/dashboard/project/nqmeepudwtwkpjomxqfz/database/backups');
  console.log('═'.repeat(60));
}

checkHistory().catch(console.error);
