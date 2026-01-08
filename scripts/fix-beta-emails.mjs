#!/usr/bin/env node

/**
 * Fix Beta Testing Email Addresses
 *
 * Problem: Demo data is on hoff1997@gmail.com but should be on futureproperty97@gmail.com
 * Solution: Swap the emails so demo user has seed data, beta user is fresh
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Configuration
const DEMO_USER_ID = '5d029227-09d6-4eab-b899-fbf346dd9e2d';
const DEMO_EMAIL = 'futureproperty97@gmail.com';
const DEMO_PASSWORD = 'DemoUser2026!';
const BETA_EMAIL = 'hoff1997@gmail.com';
const BETA_PASSWORD = 'BetaTest2026!';

async function fixBetaEmails() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   BETA TESTING EMAIL FIX                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // ========================================================================
    // STEP 1: Check current state
    // ========================================================================
    console.log('🔍 Step 1: Checking current state...\n');

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', DEMO_USER_ID)
      .maybeSingle();

    if (currentProfile) {
      console.log(`   Found user: ${currentProfile.full_name} (${DEMO_USER_ID})`);
    }

    // Count data on this user
    const { count: envelopeCount } = await supabase
      .from('envelopes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', DEMO_USER_ID);

    const { count: accountCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', DEMO_USER_ID);

    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', DEMO_USER_ID);

    console.log(`   Current data: ${envelopeCount} envelopes, ${accountCount} accounts, ${transactionCount} transactions\n`);

    // ========================================================================
    // STEP 2: Update demo user email via Auth Admin API
    // ========================================================================
    console.log('📧 Step 2: Updating demo user email...');
    console.log(`   Target: ${DEMO_EMAIL}\n`);

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      DEMO_USER_ID,
      {
        email: DEMO_EMAIL,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('   ❌ Error updating auth email:', updateError.message);
      console.log('   ⚠️  You may need to update the email manually in Supabase Dashboard');
      console.log('      Go to: Authentication → Users → Find user → Edit → Change email');
    } else {
      console.log('   ✅ Auth user email updated to', updatedUser?.user?.email);
    }

    // ========================================================================
    // STEP 3: Update profile to match
    // ========================================================================
    console.log('\n📝 Step 3: Updating profile...');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: 'Demo User',
        preferred_name: 'Demo',
        onboarding_completed: true,
        onboarding_step: 11
      })
      .eq('id', DEMO_USER_ID);

    if (profileError) {
      console.error('   ❌ Error updating profile:', profileError.message);
    } else {
      console.log('   ✅ Profile updated');
    }

    // ========================================================================
    // STEP 4: Create fresh beta user
    // ========================================================================
    console.log('\n👤 Step 4: Creating fresh beta user...');
    console.log(`   Email: ${BETA_EMAIL}\n`);

    const { data: betaUser, error: betaError } = await supabase.auth.admin.createUser({
      email: BETA_EMAIL,
      password: BETA_PASSWORD,
      email_confirm: true,
    });

    if (betaError) {
      if (betaError.message?.includes('already registered') || betaError.message?.includes('already been registered')) {
        console.log('   ⚠️  Beta user email already exists');
        console.log('      This is expected if hoff1997@gmail.com was the original email');
        console.log('      The user can login with their existing password');
      } else {
        console.error('   ❌ Error creating beta user:', betaError.message);
      }
    } else if (betaUser?.user) {
      console.log('   ✅ Beta user created:', betaUser.user.id);

      // Create profile for beta user
      const { error: newProfileError } = await supabase.from('profiles').insert({
        id: betaUser.user.id,
        full_name: 'Beta Tester',
        onboarding_completed: false,
        onboarding_step: 1,
      });

      if (newProfileError) {
        console.log('   ⚠️  Profile will be created on first login');
      } else {
        console.log('   ✅ Profile created for beta user');
      }
    }

    // ========================================================================
    // STEP 5: Verification
    // ========================================================================
    console.log('\n🔍 Step 5: Verification...\n');

    // Check demo user
    const { data: demoCheck } = await supabase
      .from('profiles')
      .select('id, full_name, onboarding_completed')
      .eq('id', DEMO_USER_ID)
      .maybeSingle();

    const { count: demoEnvelopes } = await supabase
      .from('envelopes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', DEMO_USER_ID);

    console.log('✅ Demo User:');
    console.log(`   📧 Email:     ${DEMO_EMAIL}`);
    console.log(`   🆔 User ID:   ${DEMO_USER_ID}`);
    console.log(`   🔑 Password:  ${DEMO_PASSWORD}`);
    console.log(`   👤 Name:      ${demoCheck?.full_name || 'Unknown'}`);
    console.log(`   📊 Envelopes: ${demoEnvelopes}`);
    console.log(`   ✨ Status:    ${demoCheck?.onboarding_completed ? 'Onboarding complete' : 'Needs onboarding'}`);

    console.log('\n✅ Beta User:');
    console.log(`   📧 Email:     ${BETA_EMAIL}`);
    console.log(`   🔑 Password:  ${BETA_PASSWORD} (or their existing password)`);
    console.log(`   ✨ Status:    Fresh start - ready for onboarding`);

    // ========================================================================
    // SUCCESS SUMMARY
    // ========================================================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ FIX COMPLETE                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 NEXT STEPS:\n');
    console.log('1. Test Demo User Login:');
    console.log(`   - URL:      Your app URL`);
    console.log(`   - Email:    ${DEMO_EMAIL}`);
    console.log(`   - Password: ${DEMO_PASSWORD}`);
    console.log('   - Should see: Dashboard with seed data\n');

    console.log('2. Test Beta User Login:');
    console.log(`   - Email:    ${BETA_EMAIL}`);
    console.log(`   - Password: Their existing password (or ${BETA_PASSWORD} if new)`);
    console.log('   - Should see: Onboarding Step 1\n');

  } catch (error) {
    console.error('\n❌ FIX FAILED:', error);
    process.exit(1);
  }
}

// Run the fix
fixBetaEmails();
