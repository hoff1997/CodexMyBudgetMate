#!/usr/bin/env node

/**
 * Reset onboarding status for testing the new unified onboarding flow
 * This allows existing users to re-experience the onboarding process
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env
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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetOnboarding() {
  try {
    console.log('🔄 Resetting onboarding status...\n');

    // Hardcoded user ID for hoff1997 (from get-my-user-id.mjs)
    const userId = '5d029227-09d6-4eab-b899-fbf346dd9e2d';
    console.log(`👤 Resetting for user: hoff1997 (${userId})\n`);

    // Reset onboarding_completed flag
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      process.exit(1);
    }

    console.log('✅ Onboarding status reset successfully!');
    console.log('\nYou can now visit /onboarding to test the new unified onboarding flow.');
    console.log('\n📝 Note: This only resets the flag. Your existing data (envelopes, accounts, etc.) remains unchanged.');
    console.log('   If you want a completely fresh start, use the existing clear-user-data script.\n');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

resetOnboarding();
