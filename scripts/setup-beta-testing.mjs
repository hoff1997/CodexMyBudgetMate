#!/usr/bin/env node

/**
 * Beta Testing Setup Script
 *
 * Part 1: Clears beta user data for fresh onboarding
 * Part 2: Creates demo user with seed data
 */

import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const BETA_EMAIL = 'hoff1997@gmail.com';
const DEMO_EMAIL = 'futureproperty97@gmail.com';
const DEMO_PASSWORD = 'DemoUser2026!';

// Known user IDs from the database (fallback when Admin API unavailable)
// Run `node scripts/get-my-user-id.mjs` to find these
const KNOWN_USERS = {
  'Demo Budget Mate': '00000000-0000-0000-0000-000000000001',
  'Preview User': '5d029227-09d6-4eab-b899-fbf346dd9e2d',
};

// Use 'Preview User' as the demo user since Admin API can't create users
const DEMO_USER_ID = KNOWN_USERS['Preview User'];

// Helper to find user by email using auth.users (via admin API or RPC)
async function findUserByEmail(email) {
  try {
    // Try admin API first
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error && data?.users) {
      const user = data.users.find(u => u.email === email);
      if (user) return user.id;
    }
  } catch (e) {
    // Admin API not available, try alternative
  }

  // Fallback: look up all profiles and ask user which is the beta user
  const { data: profiles } = await supabase.from('profiles').select('id, full_name');
  if (profiles && profiles.length > 0) {
    console.log('\n📋 Found profiles in database:');
    profiles.forEach((p, i) => console.log(`   ${i + 1}. ${p.full_name || 'No name'} - ${p.id}`));
  }

  return null;
}

// ============================================================================
// PART 1: CLEAR BETA USER DATA
// ============================================================================

async function clearBetaUser() {
  console.log('\n🧹 PART 1: Clearing Beta User Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Find beta user
    const userId = await findUserByEmail(BETA_EMAIL);

    if (!userId) {
      console.log('ℹ️  Beta user not found - will be created on first login');
      console.log(`   Looking for: ${BETA_EMAIL}`);
      return;
    }
    console.log(`📧 Found beta user: ${BETA_EMAIL}`);
    console.log(`🆔 User ID: ${userId}`);

    // Delete all related data (order matters due to foreign keys)
    console.log('\n🗑️  Deleting user data...');

    // Delete envelope-related data first
    const { error: allocError } = await supabase.from('envelope_income_allocations').delete().eq('user_id', userId);
    if (!allocError) console.log('  ✓ Deleted envelope allocations');

    const { error: envTxnError } = await supabase.from('envelope_transactions').delete().eq('user_id', userId);
    if (!envTxnError) console.log('  ✓ Deleted envelope transactions');

    const { error: envError } = await supabase.from('envelopes').delete().eq('user_id', userId);
    if (!envError) console.log('  ✓ Deleted envelopes');

    // Delete income sources
    const { error: incomeError } = await supabase.from('income_sources').delete().eq('user_id', userId);
    if (!incomeError) console.log('  ✓ Deleted income sources');

    // Delete transactions
    const { error: txnError } = await supabase.from('transactions').delete().eq('user_id', userId);
    if (!txnError) console.log('  ✓ Deleted transactions');

    // Delete accounts
    const { error: accError } = await supabase.from('accounts').delete().eq('user_id', userId);
    if (!accError) console.log('  ✓ Deleted accounts');

    // Delete goals
    const { error: goalError } = await supabase.from('goals').delete().eq('user_id', userId);
    if (!goalError) console.log('  ✓ Deleted goals');

    // Delete achievements
    const { error: achError } = await supabase.from('achievements').delete().eq('user_id', userId);
    if (!achError) console.log('  ✓ Deleted achievements');

    // Delete credit card data (check if tables exist)
    await supabase.from('payment_reconciliations').delete().eq('user_id', userId);
    await supabase.from('payoff_projections').delete().eq('user_id', userId);
    await supabase.from('credit_card_cycle_holdings').delete().eq('user_id', userId);
    await supabase.from('credit_card_configs').delete().eq('user_id', userId);
    console.log('  ✓ Deleted credit card data');

    // Delete onboarding draft
    await supabase.from('onboarding_drafts').delete().eq('user_id', userId);
    console.log('  ✓ Deleted onboarding draft');

    // Delete envelope categories
    await supabase.from('envelope_categories').delete().eq('user_id', userId);
    console.log('  ✓ Deleted envelope categories');

    // Reset profile onboarding status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        onboarding_step: 1,
        has_onboarding_draft: false
      })
      .eq('id', userId);

    if (profileError) {
      console.error('❌ Error resetting profile:', profileError);
    } else {
      console.log('  ✓ Reset onboarding status');
    }

    console.log('\n✅ Beta user cleared and ready for fresh onboarding!');
    console.log(`📧 Email: ${BETA_EMAIL}`);
    console.log('🔐 User can login with their existing password');

  } catch (error) {
    console.error('❌ Error clearing beta user:', error);
    throw error;
  }
}

// ============================================================================
// PART 2: CREATE DEMO USER WITH SEED DATA
// ============================================================================

async function createDemoUser() {
  console.log('\n🚀 PART 2: Creating Demo User with Seed Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Use existing 'Preview User' as demo user since Admin API can't create users
    console.log('📋 Using existing Preview User as demo user...');
    let userId = DEMO_USER_ID;

    // Check if the user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      console.error('❌ Preview User not found in database');
      console.log('   Please ensure a user exists before running this script.');
      return;
    }

    console.log(`👤 Found user: ${existingProfile.full_name} (${userId})`);

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await supabase.from('envelope_income_allocations').delete().eq('user_id', userId);
    await supabase.from('envelope_transactions').delete().eq('user_id', userId);
    await supabase.from('envelopes').delete().eq('user_id', userId);
    await supabase.from('income_sources').delete().eq('user_id', userId);
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('accounts').delete().eq('user_id', userId);
    await supabase.from('goals').delete().eq('user_id', userId);
    await supabase.from('achievements').delete().eq('user_id', userId);
    await supabase.from('payment_reconciliations').delete().eq('user_id', userId);
    await supabase.from('payoff_projections').delete().eq('user_id', userId);
    await supabase.from('credit_card_cycle_holdings').delete().eq('user_id', userId);
    await supabase.from('credit_card_configs').delete().eq('user_id', userId);
    await supabase.from('onboarding_drafts').delete().eq('user_id', userId);
    await supabase.from('envelope_categories').delete().eq('user_id', userId);
    console.log('  ✓ Cleared existing user data');

    // 2. Create or update profile
    console.log('\n📝 Setting up profile...');
    if (existingProfile) {
      await supabase.from('profiles').update({
        full_name: 'Demo User',
        preferred_name: 'Demo',
        onboarding_completed: true,
        onboarding_step: 11,
        primary_pay_cycle: 'fortnightly',
      }).eq('id', userId);
    } else {
      await supabase.from('profiles').insert({
        id: userId,
        email: DEMO_EMAIL,
        full_name: 'Demo User',
        preferred_name: 'Demo',
        onboarding_completed: true,
        onboarding_step: 11,
        primary_pay_cycle: 'fortnightly',
        created_at: new Date().toISOString(),
      });
    }
    console.log('✅ Profile configured');

    // 3. Create default envelope categories
    console.log('\n📁 Creating envelope categories...');
    const categories = [
      { name: 'Bank', icon: '🏦', is_system: true, display_order: 1 },
      { name: 'Household', icon: '🏠', is_system: true, display_order: 2 },
      { name: 'Subscriptions', icon: '📺', is_system: true, display_order: 3 },
      { name: 'Extras', icon: '🛍️', is_system: true, display_order: 4 },
      { name: 'Celebrations', icon: '🎉', is_system: true, display_order: 5 },
      { name: 'Vehicles', icon: '🚗', is_system: true, display_order: 6 },
      { name: 'Insurance', icon: '🛡️', is_system: true, display_order: 7 },
      { name: 'Phone/Internet', icon: '📱', is_system: true, display_order: 8 },
    ];

    for (const cat of categories) {
      await supabase.from('envelope_categories').insert({
        user_id: userId,
        ...cat,
      });
    }
    console.log(`✅ Created ${categories.length} categories`);

    // 4. Create bank accounts
    // Account types: 'transaction', 'savings', 'debt', 'investment', 'cash', 'liability'
    // Balance column is 'current_balance'
    console.log('\n🏦 Creating bank accounts...');
    const { data: checkingAccount, error: checkErr } = await supabase.from('accounts').insert({
      user_id: userId,
      name: 'ANZ Everyday Account',
      type: 'transaction',
      current_balance: 5000.00,
      institution: 'ANZ',
    }).select().single();

    if (checkErr) console.error('  ❌ Checking account error:', checkErr.message);

    const { data: savingsAccount, error: saveErr } = await supabase.from('accounts').insert({
      user_id: userId,
      name: 'ANZ Savings Account',
      type: 'savings',
      current_balance: 12000.00,
      institution: 'ANZ',
    }).select().single();

    if (saveErr) console.error('  ❌ Savings account error:', saveErr.message);

    const { data: creditCard, error: ccErr } = await supabase.from('accounts').insert({
      user_id: userId,
      name: 'ANZ Visa Credit Card',
      type: 'debt',
      current_balance: -1200.00,
      institution: 'ANZ',
    }).select().single();

    if (ccErr) console.error('  ❌ Credit card error:', ccErr.message);

    if (checkingAccount && savingsAccount && creditCard) {
      console.log('✅ Created 3 accounts:');
      console.log(`  - ${checkingAccount.name}: $${checkingAccount.current_balance}`);
      console.log(`  - ${savingsAccount.name}: $${savingsAccount.current_balance}`);
      console.log(`  - ${creditCard.name}: $${creditCard.current_balance}`);
    } else {
      console.log('⚠️  Some accounts may not have been created');
    }

    // 5. Create income sources
    // Columns: name, pay_cycle, typical_amount, next_pay_date, is_active
    console.log('\n💰 Creating income sources...');
    const nextFriday = new Date('2026-01-17');
    const endOfMonth = new Date('2026-01-31');

    const { data: salaryIncome, error: salaryErr } = await supabase.from('income_sources').insert({
      user_id: userId,
      name: 'Salary',
      typical_amount: 3000.00,
      pay_cycle: 'fortnightly',
      next_pay_date: nextFriday.toISOString().split('T')[0],
      is_active: true,
    }).select().single();

    if (salaryErr) console.error('  ❌ Salary income error:', salaryErr.message);

    const { data: sideIncome, error: sideErr } = await supabase.from('income_sources').insert({
      user_id: userId,
      name: 'Freelance Work',
      typical_amount: 800.00,
      pay_cycle: 'monthly',
      next_pay_date: endOfMonth.toISOString().split('T')[0],
      is_active: true,
    }).select().single();

    if (sideErr) console.error('  ❌ Side income error:', sideErr.message);

    if (salaryIncome && sideIncome) {
      console.log('✅ Created 2 income sources:');
      console.log(`  - ${salaryIncome.name}: $${salaryIncome.typical_amount} (${salaryIncome.pay_cycle})`);
      console.log(`  - ${sideIncome.name}: $${sideIncome.typical_amount} (${sideIncome.pay_cycle})`);
    } else {
      console.log('⚠️  Some income sources may not have been created');
    }

    // 6. Create envelopes
    // Columns: name, icon, target_amount, current_amount, frequency, due_date
    // subtype: 'bill' | 'spending' | 'savings' | 'goal'
    // priority: 'essential' | 'important' | 'discretionary' (NOT 'flexible')
    // is_spending: boolean, is_tracking_only: boolean, is_celebration: boolean
    console.log('\n📧 Creating envelopes...');
    const envelopeData = [
      // Bank category - tracking envelopes use is_tracking_only=true
      { name: 'Surplus', subtype: 'savings', priority: null, icon: '💰', target_amount: 0, current_amount: 500, is_spending: false, is_tracking_only: true },
      { name: 'Starter Stash', subtype: 'goal', priority: 'essential', icon: '🛡️', target_amount: 1000, current_amount: 1000, is_spending: false },
      { name: 'Safety Net', subtype: 'goal', priority: 'essential', icon: '🏦', target_amount: 15000, current_amount: 3000, is_spending: false },

      // Household
      { name: 'Groceries', subtype: 'spending', priority: 'essential', icon: '🛒', target_amount: 0, current_amount: 150, is_spending: true },
      { name: 'Rates', subtype: 'bill', priority: 'essential', icon: '🏡', target_amount: 550, current_amount: 550, frequency: 'quarterly', due_date: '2026-03-31', is_spending: false },
      { name: 'Electricity', subtype: 'bill', priority: 'essential', icon: '⚡', target_amount: 180, current_amount: 90, frequency: 'monthly', due_date: '2026-01-25', is_spending: false },
      { name: 'Water', subtype: 'bill', priority: 'essential', icon: '💧', target_amount: 80, current_amount: 80, frequency: 'monthly', due_date: '2026-01-20', is_spending: false },

      // Subscriptions - using 'discretionary' instead of 'flexible'
      { name: 'Netflix', subtype: 'bill', priority: 'discretionary', icon: '📺', target_amount: 24.99, current_amount: 24.99, frequency: 'monthly', due_date: '2026-01-15', is_spending: false },
      { name: 'Spotify', subtype: 'bill', priority: 'discretionary', icon: '🎵', target_amount: 16.99, current_amount: 16.99, frequency: 'monthly', due_date: '2026-01-10', is_spending: false },
      { name: 'My Budget Mate', subtype: 'bill', priority: 'important', icon: '✨', target_amount: 9.99, current_amount: 9.99, frequency: 'monthly', due_date: '2026-01-20', is_spending: false },

      // Extras
      { name: 'Fun Money', subtype: 'spending', priority: 'discretionary', icon: '🎉', target_amount: 0, current_amount: 200, is_spending: true },
      { name: 'Takeaways/Restaurants', subtype: 'spending', priority: 'discretionary', icon: '🍽️', target_amount: 0, current_amount: 80, is_spending: true },
      { name: 'Holidays', subtype: 'goal', priority: 'important', icon: '✈️', target_amount: 5000, current_amount: 1200, is_spending: false },

      // Celebrations
      { name: 'Birthdays', subtype: 'savings', priority: 'discretionary', icon: '🎂', target_amount: 600, current_amount: 150, is_spending: false, is_celebration: true },
      { name: 'Christmas', subtype: 'savings', priority: 'discretionary', icon: '🎄', target_amount: 1200, current_amount: 200, is_spending: false, is_celebration: true },

      // Vehicles
      { name: 'Petrol', subtype: 'bill', priority: 'essential', icon: '⛽', target_amount: 200, current_amount: 100, frequency: 'monthly', is_spending: false },
      { name: 'Maintenance', subtype: 'savings', priority: 'essential', icon: '🔧', target_amount: 800, current_amount: 400, is_spending: false },

      // Insurance
      { name: 'Car Insurance', subtype: 'bill', priority: 'essential', icon: '🚗', target_amount: 120, current_amount: 120, frequency: 'monthly', due_date: '2026-01-28', is_spending: false },

      // Phone/Internet
      { name: 'Cellphone', subtype: 'bill', priority: 'essential', icon: '📱', target_amount: 59.99, current_amount: 59.99, frequency: 'monthly', due_date: '2026-01-18', is_spending: false },
      { name: 'Internet', subtype: 'bill', priority: 'essential', icon: '🌐', target_amount: 89.99, current_amount: 89.99, frequency: 'monthly', due_date: '2026-01-22', is_spending: false },
    ];

    const createdEnvelopes = [];
    for (const env of envelopeData) {
      const { data, error } = await supabase.from('envelopes').insert({
        user_id: userId,
        ...env,
      }).select().single();

      if (error) {
        console.error(`  ❌ Error creating envelope ${env.name}:`, error.message);
      } else {
        createdEnvelopes.push(data);
      }
    }

    console.log(`✅ Created ${createdEnvelopes.length} envelopes`);

    // 7. Create envelope allocations (for bills with targets)
    console.log('\n🎯 Creating envelope allocations...');
    let allocationCount = 0;

    for (const envelope of createdEnvelopes) {
      if (envelope.subtype === 'bill' && envelope.target_amount > 0) {
        const amountPerPay = envelope.target_amount / 2;

        const { error } = await supabase.from('envelope_income_allocations').insert({
          user_id: userId,
          envelope_id: envelope.id,
          income_source_id: salaryIncome.id,
          allocation_amount: amountPerPay,
          suggested_amount: amountPerPay,
          allocation_locked: true,
          locked_at: new Date().toISOString(),
        });

        if (!error) allocationCount++;
      }
    }

    console.log(`✅ Created ${allocationCount} envelope allocations`);

    // 8. Create sample transactions
    // Columns: merchant_name (not merchant), occurred_at (not date), description, amount, account_id
    console.log('\n💳 Creating transactions...');
    const transactions = [
      // Income transactions
      { account_id: checkingAccount?.id, occurred_at: '2026-01-03', description: 'Salary - Fortnightly', amount: 3000, merchant_name: 'Employer Ltd' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-20', description: 'Salary - Fortnightly', amount: 3000, merchant_name: 'Employer Ltd' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-06', description: 'Salary - Fortnightly', amount: 3000, merchant_name: 'Employer Ltd' },

      // Expenses
      { account_id: checkingAccount?.id, occurred_at: '2026-01-02', description: 'Countdown Groceries', amount: -85.50, merchant_name: 'Countdown' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-30', description: 'Countdown Groceries', amount: -92.30, merchant_name: 'Countdown' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-28', description: 'BP Petrol', amount: -95.00, merchant_name: 'BP' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-27', description: 'Hell Pizza', amount: -42.90, merchant_name: 'Hell Pizza' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-25', description: 'Warehouse Stationery', amount: -34.50, merchant_name: 'Warehouse' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-22', description: 'Z Energy', amount: -88.00, merchant_name: 'Z Energy' },

      // Subscriptions
      { account_id: checkingAccount?.id, occurred_at: '2025-12-20', description: 'My Budget Mate Subscription', amount: -9.99, merchant_name: 'My Budget Mate' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-15', description: 'Netflix Subscription', amount: -24.99, merchant_name: 'Netflix' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-10', description: 'Spotify Premium', amount: -16.99, merchant_name: 'Spotify' },

      // Bills
      { account_id: checkingAccount?.id, occurred_at: '2025-12-25', description: 'Electricity Bill', amount: -180.00, merchant_name: 'Contact Energy' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-20', description: 'Water Bill', amount: -80.00, merchant_name: 'Watercare' },
      { account_id: checkingAccount?.id, occurred_at: '2025-12-18', description: 'Vodafone Mobile', amount: -59.99, merchant_name: 'Vodafone' },

      // Credit card transactions
      { account_id: creditCard?.id, occurred_at: '2025-12-15', description: 'Countdown', amount: -120.50, merchant_name: 'Countdown' },
      { account_id: creditCard?.id, occurred_at: '2025-12-10', description: 'Mobil Petrol', amount: -95.00, merchant_name: 'Mobil' },
      { account_id: creditCard?.id, occurred_at: '2025-12-05', description: 'Uber Eats', amount: -38.90, merchant_name: 'Uber Eats' },

      // Credit card payment
      { account_id: checkingAccount?.id, occurred_at: '2025-12-30', description: 'Credit Card Payment', amount: -500, merchant_name: 'ANZ' },
      { account_id: creditCard?.id, occurred_at: '2025-12-30', description: 'Payment Received', amount: 500, merchant_name: 'ANZ' },
    ];

    let txnCount = 0;
    for (const txn of transactions) {
      if (!txn.account_id) continue; // Skip if account wasn't created

      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        ...txn,
      });
      if (error) {
        console.error(`  ❌ Transaction error: ${error.message}`);
      } else {
        txnCount++;
      }
    }

    console.log(`✅ Created ${txnCount} transactions`);

    // 9. Create achievements
    // Table: achievements (0034) uses: achievement_type, unlocked_at
    console.log('\n🏆 Unlocking achievements...');
    const achievements = [
      { achievement_type: 'onboarding_complete', unlocked_at: new Date().toISOString() },
      { achievement_type: 'first_envelope', unlocked_at: new Date().toISOString() },
      { achievement_type: 'emergency_fund_1000', unlocked_at: new Date().toISOString() },
      { achievement_type: 'emergency_fund_started', unlocked_at: new Date().toISOString() },
    ];

    let achCount = 0;
    for (const achievement of achievements) {
      const { error } = await supabase.from('achievements').insert({
        user_id: userId,
        ...achievement,
      });
      if (error) {
        console.error(`  ❌ Achievement error: ${error.message}`);
      } else {
        achCount++;
      }
    }

    console.log(`✅ Unlocked ${achCount} achievements`);

    // 10. Create credit card config
    console.log('\n💳 Setting up credit card...');
    const { error: ccError } = await supabase.from('credit_card_configs').insert({
      user_id: userId,
      account_id: creditCard.id,
      usage_type: 'pay_in_full',
      statement_close_day: 25,
      payment_due_day: 10,
      still_using: true,
      expected_monthly_spending: 300,
      created_at: new Date().toISOString(),
    });

    if (ccError) {
      console.log('  ⚠️ Credit card config skipped (table may not exist)');
    } else {
      console.log('✅ Created credit card config');
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEMO USER SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n👤 User: Preview User`);
    console.log(`🆔 User ID: ${userId}`);
    console.log(`ℹ️  Login with the Preview User credentials from Supabase`);
    console.log('\n📊 Data Summary:');
    const totalBalance = (checkingAccount?.current_balance || 0) + (savingsAccount?.current_balance || 0) + (creditCard?.current_balance || 0);
    console.log(`  - 3 bank accounts ($${totalBalance.toFixed(2)} total)`);
    const totalIncome = (salaryIncome?.typical_amount || 0) + (sideIncome?.typical_amount || 0);
    console.log(`  - 2 income sources ($${totalIncome.toFixed(2)}/month combined)`);
    console.log(`  - ${createdEnvelopes.length} envelopes`);
    console.log(`  - ${txnCount} transactions`);
    console.log(`  - ${achCount} achievements`);

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   MY BUDGET MATE - BETA TESTING SETUP                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Part 1: Clear beta user
    await clearBetaUser();

    // Part 2: Create demo user
    await createDemoUser();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   🎉 BETA TESTING SETUP COMPLETE!                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📝 NEXT STEPS:');
    console.log(`  1. Test beta user: ${BETA_EMAIL} (fresh onboarding)`);
    console.log(`  2. Test demo user: ${DEMO_EMAIL} (full features)`);
    console.log('  3. Monitor user activity and collect feedback');
    console.log('  4. Check Vercel logs for any errors\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main();
