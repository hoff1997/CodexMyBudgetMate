#!/usr/bin/env node
/**
 * Supabase Auth Diagnostics
 *
 * Run with: node scripts/diagnose-supabase-auth.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function diagnose() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   SUPABASE AUTH DIAGNOSTICS                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Project URL:', SUPABASE_URL);
  console.log('');

  // 1. Check database connection
  console.log('1️⃣  Testing database connection...');
  const { data: profiles, error: connErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (connErr) {
    console.log('   ❌ Connection failed:', connErr.message);
  } else {
    console.log('   ✅ Database connection OK');
  }

  // 2. Try to list users
  console.log('\n2️⃣  Testing auth.admin.listUsers()...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 5 });
    if (error) {
      console.log('   ❌ listUsers failed:', error.message);
      console.log('   This is the core issue - the auth database has a problem.');
    } else {
      console.log('   ✅ listUsers OK - found', data.users?.length || 0, 'users');
      if (data.users && data.users.length > 0) {
        console.log('\n   Existing users:');
        data.users.forEach(u => {
          console.log(`   - ${u.email} (ID: ${u.id})`);
        });
      }
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  // 3. Try to create a test user
  console.log('\n3️⃣  Testing auth.admin.createUser()...');
  const testEmail = 'diagnostic-test-' + Date.now() + '@test.local';
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'DiagTest123!',
      email_confirm: true
    });
    if (error) {
      console.log('   ❌ createUser failed:', error.message);

      if (error.message.includes('Database error')) {
        console.log('\n   ⚠️  DIAGNOSIS: Auth database schema issue');
        console.log('   This usually means:');
        console.log('   - A trigger or function in auth schema is broken');
        console.log('   - The auth.users table has constraint issues');
        console.log('   - There may be orphaned records or FK violations');
        console.log('\n   RECOMMENDED FIX:');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Run this query to check for issues:');
        console.log('      SELECT * FROM auth.users LIMIT 5;');
        console.log('   3. Check if there are any failed triggers:');
        console.log('      SELECT * FROM pg_trigger WHERE tgname LIKE \'%auth%\';');
      }
    } else {
      console.log('   ✅ createUser OK - created user:', data.user?.id);
      // Clean up
      if (data.user?.id) {
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log('   🧹 Cleaned up test user');
      }
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }

  // 4. Check service role key
  console.log('\n4️⃣  Service Role Key check...');
  if (!SERVICE_KEY) {
    console.log('   ❌ SUPABASE_SERVICE_ROLE_KEY is missing');
  } else if (SERVICE_KEY.startsWith('eyJ')) {
    console.log('   ✅ Service key format looks correct (JWT)');
    try {
      const payload = JSON.parse(Buffer.from(SERVICE_KEY.split('.')[1], 'base64').toString());
      console.log('   Role:', payload.role);
      if (payload.role !== 'service_role') {
        console.log('   ⚠️  WARNING: Expected role "service_role" but got "' + payload.role + '"');
      }
    } catch (e) {
      console.log('   ⚠️ Could not decode JWT payload');
    }
  } else {
    console.log('   ⚠️ Key format unexpected (should start with eyJ)');
  }

  // 5. Check for custom triggers on auth.users
  console.log('\n5️⃣  Checking for custom triggers on auth schema...');
  try {
    const { data: triggers, error: trigErr } = await supabase.rpc('get_auth_triggers');
    if (trigErr) {
      console.log('   ℹ️  Cannot query triggers directly (RPC not available)');
      console.log('   Check manually in Supabase Dashboard → Database → Triggers');
    } else {
      console.log('   Triggers found:', triggers);
    }
  } catch (e) {
    console.log('   ℹ️  RPC not available - check triggers manually in Dashboard');
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   NEXT STEPS                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('If user creation failed with "Database error":');
  console.log('');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Run this diagnostic query:');
  console.log('');
  console.log('   -- Check auth.users table');
  console.log('   SELECT count(*) FROM auth.users;');
  console.log('');
  console.log('   -- Check for triggers on auth.users');
  console.log('   SELECT tgname, tgtype, tgenabled');
  console.log('   FROM pg_trigger t');
  console.log('   JOIN pg_class c ON t.tgrelid = c.oid');
  console.log('   WHERE c.relname = \'users\'');
  console.log('   AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = \'auth\');');
  console.log('');
  console.log('3. If there\'s a broken trigger, you may need to disable it temporarily');
  console.log('4. Or contact Supabase support if the auth schema is corrupted');
  console.log('');
}

diagnose().catch(console.error);
