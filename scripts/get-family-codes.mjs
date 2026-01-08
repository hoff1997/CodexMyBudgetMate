import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getFamilyCodes() {
  const { data, error } = await supabase
    .from('child_profiles')
    .select('id, name, family_access_code, parent_user_id');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No child profiles found.');
    return;
  }

  console.log('\nChild Profiles and Family Codes:\n');
  data.forEach(child => {
    console.log('Name:', child.name);
    console.log('Family Code:', child.family_access_code);
    console.log('Child ID:', child.id);
    console.log('---');
  });
}

getFamilyCodes();
