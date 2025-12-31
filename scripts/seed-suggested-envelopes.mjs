#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials (need SERVICE_ROLE_KEY)');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

const SUGGESTED_ENVELOPE_CATEGORY = "The My Budget Way";

async function run() {
  // Get user ID from an existing envelope (since we know the user has envelopes)
  console.log(`🔄 Finding user from existing envelopes...`);

  const { data: anyEnvelope, error: envError } = await supabase
    .from('envelopes')
    .select('user_id')
    .limit(1)
    .maybeSingle();

  if (envError || !anyEnvelope) {
    console.error('❌ Could not find any envelopes to get user ID:', envError?.message || 'No envelopes found');
    process.exit(1);
  }

  const userId = anyEnvelope.user_id;
  console.log(`✅ Found user ID: ${userId}`);

  // Check if suggested envelopes already exist
  const { data: existing } = await supabase
    .from('envelopes')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_suggested', true);

  if (existing && existing.length > 0) {
    console.log('✅ Suggested envelopes already exist:', existing.map(e => e.name).join(', '));
    return;
  }

  // Create or get "The My Budget Way" category
  console.log('🔄 Creating category...');

  let categoryId;
  const { data: existingCat } = await supabase
    .from('envelope_categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', SUGGESTED_ENVELOPE_CATEGORY)
    .maybeSingle();

  if (existingCat) {
    categoryId = existingCat.id;
    console.log('✅ Category already exists');
  } else {
    const { data: newCat, error: catError } = await supabase
      .from('envelope_categories')
      .insert({
        user_id: userId,
        name: SUGGESTED_ENVELOPE_CATEGORY,
      })
      .select('id')
      .single();

    if (catError) {
      console.error('❌ Failed to create category:', catError.message);
      process.exit(1);
    }
    categoryId = newCat.id;
    console.log('✅ Category created');
  }

  // Calculate Safety Net target (3x essential monthly expenses)
  console.log('🔄 Calculating Safety Net target...');

  const { data: essentialEnvelopes } = await supabase
    .from('envelopes')
    .select('target_amount, frequency')
    .eq('user_id', userId)
    .eq('priority', 'essential');

  const frequencyMultipliers = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    annually: 1 / 12,
  };

  let monthlyTotal = 0;
  if (essentialEnvelopes) {
    for (const env of essentialEnvelopes) {
      const multiplier = frequencyMultipliers[env.frequency] || 1;
      monthlyTotal += (env.target_amount || 0) * multiplier;
    }
  }

  const safetyNetTarget = Math.round(monthlyTotal * 3);
  console.log(`✅ Monthly essential expenses: $${monthlyTotal.toFixed(2)}`);
  console.log(`✅ Safety Net target (3 months): $${safetyNetTarget}`);

  // Update constraint to include cc-holding (in case migration wasn't run with new value)
  console.log('🔄 Updating constraint for cc-holding...');
  try {
    // Drop old constraint and add new one
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.envelopes DROP CONSTRAINT IF EXISTS envelopes_suggestion_type_check;
        ALTER TABLE public.envelopes ADD CONSTRAINT envelopes_suggestion_type_check
        CHECK (suggestion_type IN ('starter-stash', 'cc-holding', 'safety-net', NULL));
      `
    });
  } catch (e) {
    // Constraint update might fail if rpc doesn't exist, continue anyway
    console.log('⚠️ Could not update constraint (may already be correct)');
  }

  // Create suggested envelopes
  console.log('🔄 Creating suggested envelopes...');

  const envelopes = [
    {
      user_id: userId,
      name: 'Starter Stash',
      category_id: categoryId,
      target_amount: 1000,
      current_amount: 0,
      icon: '🌱',
      subtype: 'savings',
      priority: 'essential',
      is_suggested: true,
      suggestion_type: 'starter-stash',
      is_dismissed: false,
      auto_calculate_target: false,
      description: "Your first $1,000 emergency buffer. A safety cushion for life's little surprises.",
    },
    {
      user_id: userId,
      name: 'CC Holding',
      category_id: categoryId,
      target_amount: 0,
      current_amount: 0,
      icon: '💳',
      subtype: 'savings', // Use savings subtype for database compatibility
      priority: 'essential',
      is_suggested: true,
      suggestion_type: 'cc-holding',
      is_dismissed: false,
      auto_calculate_target: false,
      is_tracking_only: true,
      description: 'Tracks money set aside for credit card payments. Spend on CC, transfer here.',
    },
    {
      user_id: userId,
      name: 'Safety Net',
      category_id: categoryId,
      target_amount: safetyNetTarget,
      current_amount: 0,
      icon: '🛡️',
      subtype: 'savings',
      priority: 'essential',
      is_suggested: true,
      suggestion_type: 'safety-net',
      is_dismissed: false,
      auto_calculate_target: true,
      description: monthlyTotal > 0
        ? `Three months of essential expenses ($${Math.round(monthlyTotal).toLocaleString()}/mo × 3)`
        : 'Three months of essential expenses. Your full emergency fund goal.',
    },
  ];

  const { error: insertError } = await supabase
    .from('envelopes')
    .insert(envelopes);

  if (insertError) {
    console.error('❌ Failed to create envelopes:', insertError.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ Successfully created suggested envelopes!');
  console.log('   🌱 Starter Stash - $1,000 target');
  console.log('   💳 CC Holding - tracking envelope');
  console.log(`   🛡️ Safety Net - $${safetyNetTarget.toLocaleString()} target`);
  console.log('');
  console.log('Refresh the Budget Allocation page to see them.');
}

run().catch(console.error);
