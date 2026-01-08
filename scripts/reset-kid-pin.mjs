import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NEW_PIN = '1234'; // Simple test PIN

async function resetKidPins() {
  // Hash the new PIN
  const pinHash = await bcrypt.hash(NEW_PIN, 10);

  // Update all child profiles with the new PIN
  const { data, error } = await supabase
    .from('child_profiles')
    .update({ pin_hash: pinHash })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all
    .select('id, name');

  if (error) {
    console.error('Error resetting PINs:', error.message);
    return;
  }

  console.log(`\nReset PIN to "${NEW_PIN}" for ${data.length} children:\n`);
  data.forEach(child => {
    console.log(`- ${child.name} (${child.id})`);
  });
  console.log('\nYou can now login with family code TEST-2026 and PIN 1234');
}

resetKidPins();
