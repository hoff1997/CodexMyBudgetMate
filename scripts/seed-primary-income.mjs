/**
 * Seed Primary Income with test data
 *
 * This script:
 * 1. Sets up the Primary Income with a typical amount
 * 2. Creates envelope allocations from Primary Income
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env from .env.local
function loadEnv() {
  try {
    const envFile = readFileSync('.env.local', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPrimaryIncome() {
  console.log('🌱 Seeding Primary Income with test data...\n');

  // Get the current user (you may need to adjust this based on your auth setup)
  // For now, we'll get the first user or use a specific user ID
  const { data: users, error: usersError } = await supabase
    .from('income_sources')
    .select('user_id')
    .limit(1);

  if (usersError || !users?.length) {
    console.error('❌ Could not find any users with income sources');
    console.log('Error:', usersError);
    process.exit(1);
  }

  const userId = users[0].user_id;
  console.log(`📋 Using user ID: ${userId}\n`);

  // Step 1: Get Primary Income source
  const { data: primaryIncome, error: incomeError } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', '%primary%')
    .single();

  if (incomeError || !primaryIncome) {
    console.error('❌ Could not find Primary Income source');
    console.log('Error:', incomeError);

    // Try to find any income source
    const { data: anyIncome } = await supabase
      .from('income_sources')
      .select('id, name, typical_amount')
      .eq('user_id', userId);

    console.log('\nAvailable income sources:', anyIncome);
    process.exit(1);
  }

  console.log(`✅ Found Primary Income: ${primaryIncome.name}`);
  console.log(`   Current typical_amount: $${primaryIncome.typical_amount || 0}`);

  // Step 2: Update Primary Income with a test amount if not set
  if (!primaryIncome.typical_amount || primaryIncome.typical_amount === 0) {
    const testIncomeAmount = 3000; // $3000 per pay

    const { error: updateError } = await supabase
      .from('income_sources')
      .update({ typical_amount: testIncomeAmount })
      .eq('id', primaryIncome.id);

    if (updateError) {
      console.error('❌ Failed to update income amount:', updateError);
    } else {
      console.log(`✅ Updated typical_amount to $${testIncomeAmount}`);
      primaryIncome.typical_amount = testIncomeAmount;
    }
  }

  // Step 3: Get some envelopes to allocate to
  const { data: envelopes, error: envelopesError } = await supabase
    .from('envelopes')
    .select('id, name, subtype, priority, target_amount, pay_cycle_amount')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('priority')
    .limit(10);

  if (envelopesError) {
    console.error('❌ Error fetching envelopes:', envelopesError);
    process.exit(1);
  }

  if (!envelopes?.length) {
    console.log('⚠️  No envelopes found. Creating test allocations manually...');

    // Just show the income update was successful
    console.log('\n📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Primary Income: $${primaryIncome.typical_amount.toLocaleString()}`);
    console.log(`   No envelopes to allocate to yet`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Income updated! Create some envelopes and run again.');
    process.exit(0);
  }

  console.log(`\n📋 Found ${envelopes.length} envelopes to allocate to:`);
  envelopes.forEach(e => {
    console.log(`   - ${e.name} (${e.subtype}, ${e.priority}) - Pay cycle: $${e.pay_cycle_amount || 0}`);
  });

  // Step 4: Check existing allocations
  const { data: existingAllocations } = await supabase
    .from('envelope_income_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('income_source_id', primaryIncome.id);

  console.log(`\n📊 Existing allocations from Primary Income: ${existingAllocations?.length || 0}`);

  // Step 5: Create allocations based on pay_cycle_amount
  const allocationsToCreate = [];
  let totalAllocated = 0;

  for (const envelope of envelopes) {
    // Skip if already allocated
    const existingAlloc = existingAllocations?.find(a => a.envelope_id === envelope.id);
    if (existingAlloc) {
      console.log(`   ⏭️  ${envelope.name} already has allocation: $${existingAlloc.allocation_amount}`);
      totalAllocated += existingAlloc.allocation_amount;
      continue;
    }

    // Use pay_cycle_amount if set, otherwise estimate based on target
    let allocationAmount = envelope.pay_cycle_amount || 0;

    if (!allocationAmount && envelope.target_amount) {
      // Estimate: assume fortnightly pay, monthly bill = target / 2.17
      allocationAmount = Math.round(envelope.target_amount / 2.17);
    }

    if (allocationAmount > 0 && totalAllocated + allocationAmount <= primaryIncome.typical_amount) {
      allocationsToCreate.push({
        user_id: userId,
        income_source_id: primaryIncome.id,
        envelope_id: envelope.id,
        allocation_amount: allocationAmount,
      });
      totalAllocated += allocationAmount;
      console.log(`   ✨ Will allocate $${allocationAmount} to ${envelope.name}`);
    }
  }

  if (allocationsToCreate.length === 0) {
    console.log('\n⚠️  No new allocations to create (all envelopes already allocated or no pay_cycle_amount set)');
  } else {
    // Step 6: Insert allocations
    const { data: inserted, error: insertError } = await supabase
      .from('envelope_income_allocations')
      .insert(allocationsToCreate)
      .select();

    if (insertError) {
      console.error('\n❌ Failed to create allocations:', insertError);
    } else {
      console.log(`\n✅ Created ${inserted.length} new allocations`);
    }
  }

  // Step 7: Summary
  const { data: finalAllocations } = await supabase
    .from('envelope_income_allocations')
    .select('allocation_amount')
    .eq('user_id', userId)
    .eq('income_source_id', primaryIncome.id);

  const finalTotal = finalAllocations?.reduce((sum, a) => sum + (a.allocation_amount || 0), 0) || 0;
  const remaining = primaryIncome.typical_amount - finalTotal;
  const percentAllocated = primaryIncome.typical_amount > 0
    ? Math.round((finalTotal / primaryIncome.typical_amount) * 100)
    : 0;

  console.log('\n📊 SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Income:        $${primaryIncome.typical_amount.toLocaleString()}`);
  console.log(`   Allocated:     $${finalTotal.toLocaleString()}`);
  console.log(`   Remaining:     $${remaining.toLocaleString()}`);
  console.log(`   % Allocated:   ${percentAllocated}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n✅ Done! Refresh the allocation page to see changes.');
}

seedPrimaryIncome().catch(console.error);
