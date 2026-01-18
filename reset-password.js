require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function resetPassword() {
  const userId = 'b80740ec-11b6-463b-884f-c18d8ad9a812';
  const newPassword = 'TestPassword123!';

  console.log('Updating password for user:', userId);

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: newPassword })
  });

  if (response.ok) {
    console.log('\n✅ Password updated successfully!');
    console.log('Email: test@mybudgetmate.co.nz');
    console.log('Password: TestPassword123!');
  } else {
    const error = await response.text();
    console.log('Update failed:', response.status, error);
  }
}

resetPassword();
