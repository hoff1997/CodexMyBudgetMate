/**
 * One-time migration script to import gift recipients from onboarding
 * Run with: npx tsx scripts/migrate-onboarding-gift-recipients.ts
 *
 * This script will:
 * 1. Find all envelopes in the 'celebrations' category
 * 2. Check if they have any gift_recipients already
 * 3. Allow manual input of recipients to add
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n=== Gift Recipients Migration Script ===\n');

  // Get user email to find their ID
  const userEmail = await question('Enter user email: ');

  // Try to find user via auth admin API (using listUsers with email filter since getUserByEmail is deprecated)
  const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError || !usersData?.users) {
    console.error('Error fetching users:', authError);
    rl.close();
    return;
  }

  // Find the user by email
  const foundUser = usersData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());

  if (!foundUser) {
    console.error('User not found with email:', userEmail);
    rl.close();
    return;
  }

  const userId = foundUser.id;
  console.log(`Found user: ${foundUser.email} (${userId})`);

  // Find celebration envelopes
  const { data: envelopes, error: envError } = await supabase
    .from('envelopes')
    .select(`
      id,
      name,
      icon,
      category_id,
      envelope_categories(name)
    `)
    .eq('user_id', userId);

  if (envError) {
    console.error('Error fetching envelopes:', envError);
    rl.close();
    return;
  }

  // Filter for celebration-related envelopes
  const celebrationEnvelopes = envelopes?.filter(e => {
    const catName = (e.envelope_categories as any)?.name?.toLowerCase() || '';
    const envName = e.name.toLowerCase();
    return catName.includes('celebration') ||
           envName.includes('birthday') ||
           envName.includes('christmas') ||
           envName.includes('gift');
  }) || [];

  if (celebrationEnvelopes.length === 0) {
    console.log('\nNo celebration envelopes found for this user.');
    console.log('\nAvailable envelopes:');
    envelopes?.forEach(e => {
      console.log(`  - ${e.name} (${e.id})`);
    });
    rl.close();
    return;
  }

  console.log('\n=== Celebration Envelopes Found ===');
  celebrationEnvelopes.forEach((e, idx) => {
    console.log(`${idx + 1}. ${e.icon} ${e.name} (${e.id})`);
  });

  // Check existing recipients
  const { data: existingRecipients } = await supabase
    .from('gift_recipients')
    .select('*')
    .eq('user_id', userId);

  console.log(`\nExisting gift recipients: ${existingRecipients?.length || 0}`);
  existingRecipients?.forEach(r => {
    console.log(`  - ${r.recipient_name}: $${r.gift_amount} gift, $${r.party_amount || 0} party (${r.celebration_date || 'no date'})`);
  });

  // Ask which envelope to add recipients to
  const envChoice = await question('\nEnter envelope number to add recipients (or "q" to quit): ');

  if (envChoice.toLowerCase() === 'q') {
    rl.close();
    return;
  }

  const selectedEnvelope = celebrationEnvelopes[parseInt(envChoice) - 1];
  if (!selectedEnvelope) {
    console.error('Invalid envelope selection');
    rl.close();
    return;
  }

  console.log(`\nAdding recipients to: ${selectedEnvelope.name}`);
  console.log('Enter recipients (empty name to finish):\n');

  const newRecipients: Array<{
    user_id: string;
    envelope_id: string;
    recipient_name: string;
    gift_amount: number;
    party_amount: number;
    celebration_date: string | null;
    needs_gift: boolean;
  }> = [];

  while (true) {
    const name = await question('Recipient name (or Enter to finish): ');
    if (!name.trim()) break;

    const giftAmount = await question('Gift amount ($): ');
    const partyAmount = await question('Party amount ($, or Enter for 0): ');
    const dateStr = await question('Birthday date (YYYY-MM-DD, or Enter for none): ');

    newRecipients.push({
      user_id: userId,
      envelope_id: selectedEnvelope.id,
      recipient_name: name.trim(),
      gift_amount: parseFloat(giftAmount) || 0,
      party_amount: parseFloat(partyAmount) || 0,
      celebration_date: dateStr.trim() || null,
      needs_gift: true,
    });

    console.log(`Added: ${name}\n`);
  }

  if (newRecipients.length === 0) {
    console.log('No recipients to add.');
    rl.close();
    return;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Adding ${newRecipients.length} recipients to ${selectedEnvelope.name}:`);
  newRecipients.forEach(r => {
    console.log(`  - ${r.recipient_name}: $${r.gift_amount} gift, $${r.party_amount} party (${r.celebration_date || 'no date'})`);
  });

  const confirm = await question('\nConfirm insert? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('gift_recipients')
    .insert(newRecipients)
    .select();

  if (insertError) {
    console.error('Insert error:', insertError);
  } else {
    console.log(`\nSuccessfully inserted ${inserted?.length} gift recipients!`);
  }

  rl.close();
}

main().catch(console.error);
