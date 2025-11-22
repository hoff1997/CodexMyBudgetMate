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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkUserEnvelopes() {
  const targetUserId = process.argv[2] || '5d029227-09d6-4eab-b899-fbf346dd9e2d';

  console.log(`\n📊 Checking envelopes for user: ${targetUserId}\n`);

  // Check categories
  const { data: categories, error: catError } = await supabase
    .from('envelope_categories')
    .select('*')
    .eq('user_id', targetUserId);

  if (catError) {
    console.error('❌ Error fetching categories:', catError.message);
  } else {
    console.log(`📁 Categories: ${categories?.length || 0}`);
    categories?.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
    });
  }

  // Check envelopes
  const { data: envelopes, error: envError } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', targetUserId);

  if (envError) {
    console.error('\n❌ Error fetching envelopes:', envError.message);
  } else {
    console.log(`\n📊 Envelopes: ${envelopes?.length || 0}`);
    if (envelopes && envelopes.length > 0) {
      envelopes.forEach(env => {
        console.log(`   - ${env.name}: $${env.current_amount || 0}/$${env.target_amount || 0}`);
      });
    } else {
      console.log('   (No envelopes found)');
    }
  }

  console.log('\n' + '='.repeat(60));
}

checkUserEnvelopes();
