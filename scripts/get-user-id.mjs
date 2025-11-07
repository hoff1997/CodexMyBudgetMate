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

async function listUsers() {
  console.log('🔍 Fetching users from database...\n');

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }

  if (!data.users || data.users.length === 0) {
    console.log('No users found in database.');
    process.exit(0);
  }

  console.log(`Found ${data.users.length} user(s):\n`);

  data.users.forEach((user, index) => {
    console.log(`${index + 1}. Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });

  if (data.users.length === 1) {
    console.log('To clear data for this user, run:');
    console.log(`node scripts/clear-user-data.mjs ${data.users[0].id}`);
  }
}

listUsers();
