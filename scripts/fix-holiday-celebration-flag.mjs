#!/usr/bin/env node
/**
 * Fix Holiday Goal envelope celebration flag
 *
 * This script removes the is_celebration flag from Holiday envelopes
 * that were incorrectly marked as celebrations.
 *
 * Usage: node scripts/fix-holiday-celebration-flag.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixHolidayCelebrationFlag(userEmail) {
  console.log(`Looking for user: ${userEmail}`);

  // Find the user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    process.exit(1);
  }

  const user = users.users.find(u => u.email === userEmail);

  if (!user) {
    console.error(`User not found: ${userEmail}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id}`);

  // Find Holiday envelopes marked as celebrations
  const { data: envelopes, error: envError } = await supabase
    .from('envelopes')
    .select('id, name, is_celebration')
    .eq('user_id', user.id)
    .eq('is_celebration', true)
    .or('name.ilike.%holiday%,name.ilike.%Holiday Goal%');

  if (envError) {
    console.error('Error fetching envelopes:', envError);
    process.exit(1);
  }

  if (!envelopes || envelopes.length === 0) {
    console.log('No Holiday envelopes with is_celebration=true found');
    return;
  }

  console.log(`Found ${envelopes.length} envelope(s) to fix:`, envelopes);

  // Update each envelope
  for (const env of envelopes) {
    const { error: updateError } = await supabase
      .from('envelopes')
      .update({ is_celebration: false })
      .eq('id', env.id);

    if (updateError) {
      console.error(`Error updating envelope ${env.id}:`, updateError);
    } else {
      console.log(`✅ Fixed envelope: ${env.name} (${env.id})`);
    }
  }

  console.log('Done!');
}

// Run for the specified user
fixHolidayCelebrationFlag('hoff1997@gmail.com');
