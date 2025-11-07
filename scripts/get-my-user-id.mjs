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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getUsers() {
  console.log('🔍 Fetching users...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No users found.');
    process.exit(0);
  }

  console.log(`Found ${data.length} user(s):\n`);

  data.forEach((user, index) => {
    console.log(`${index + 1}. Name: ${user.full_name || 'No name set'}`);
    console.log(`   User ID: ${user.id}\n`);
  });

  if (data.length === 1) {
    console.log('To clear all data for this user, run:');
    console.log(`node scripts/clear-user-data.mjs ${data[0].id}\n`);
  }
}

getUsers();
