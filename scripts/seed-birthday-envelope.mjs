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
    console.error('Error reading .env.local:', err.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedBirthdayEnvelope() {
  // Get user ID from command line argument or use default
  const targetUserId = process.argv[2] || '5d029227-09d6-4eab-b899-fbf346dd9e2d';

  // Verify user exists
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, celebration_reminder_weeks')
    .eq('id', targetUserId)
    .single();

  if (userError || !user) {
    console.error('User not found:', userError?.message || targetUserId);
    console.log('\nAvailable users:');
    const { data: allUsers } = await supabase.from('profiles').select('id');
    allUsers?.forEach(u => console.log(`  - ${u.id}`));
    process.exit(1);
  }

  const userId = user.id;
  console.log(`\nSeeding birthday envelope for user: ${userId}`);
  console.log(`Reminder weeks setting: ${user.celebration_reminder_weeks ?? 3}`);

  // Step 1: Find or create Celebrations category
  console.log('\n1. Finding/creating Celebrations category...');
  let { data: category, error: catError } = await supabase
    .from('envelope_categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', 'Celebrations')
    .single();

  if (catError || !category) {
    console.log('   Creating Celebrations category...');
    const { data: newCategory, error: createCatError } = await supabase
      .from('envelope_categories')
      .insert({
        user_id: userId,
        name: 'Celebrations',
        icon: '🎉',
        is_system: true,
        display_order: 8
      })
      .select()
      .single();

    if (createCatError) {
      console.error('   Failed to create category:', createCatError.message);
      process.exit(1);
    }
    category = newCategory;
    console.log(`   Created category: ${category.id}`);
  } else {
    console.log(`   Found existing category: ${category.id}`);
  }

  // Step 2: Check if birthday envelope already exists
  console.log('\n2. Creating Birthdays envelope...');
  const { data: existingEnvelope } = await supabase
    .from('envelopes')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', 'Birthdays')
    .single();

  let birthdayEnvelopeId;

  if (existingEnvelope) {
    console.log(`   Birthday envelope already exists: ${existingEnvelope.id}`);
    birthdayEnvelopeId = existingEnvelope.id;

    // Update it to be a celebration envelope
    await supabase
      .from('envelopes')
      .update({ is_celebration: true, category_id: category.id })
      .eq('id', existingEnvelope.id);
  } else {
    // Calculate total budget from recipients
    const totalBudget = 50 + 75 + 100 + 40 + 60; // = $325

    const { data: newEnvelope, error: envError } = await supabase
      .from('envelopes')
      .insert({
        user_id: userId,
        category_id: category.id,
        name: 'Birthdays',
        icon: '🎂',
        target_amount: totalBudget,
        current_amount: Math.round(totalBudget * 0.6), // 60% funded
        frequency: 'MONTHLY',
        subtype: 'savings',
        is_celebration: true,
        is_tracking_only: false,
        priority: 'important',
        pay_cycle_amount: Math.round(totalBudget / 12 * 100) / 100, // Monthly allocation
        sort_order: 100
      })
      .select()
      .single();

    if (envError) {
      console.error('   Failed to create envelope:', envError.message);
      process.exit(1);
    }

    birthdayEnvelopeId = newEnvelope.id;
    console.log(`   Created Birthdays envelope: ${birthdayEnvelopeId}`);
    console.log(`   Budget: $${totalBudget}, Currently funded: $${Math.round(totalBudget * 0.6)}`);
  }

  // Step 3: Create gift recipients with fake dates spread throughout the year
  console.log('\n3. Creating gift recipients...');

  const now = new Date();
  const currentYear = now.getFullYear();

  // Calculate dates relative to today for testing reminders
  const recipients = [
    {
      recipient_name: 'Mum',
      gift_amount: 50,
      celebration_date: new Date(currentYear, now.getMonth(), now.getDate() + 14), // 2 weeks from now
      notes: 'She likes gardening books and nice tea'
    },
    {
      recipient_name: 'Dad',
      gift_amount: 75,
      celebration_date: new Date(currentYear, now.getMonth() + 1, 15), // Next month
      notes: 'Golf accessories or whisky'
    },
    {
      recipient_name: 'Sarah (Sister)',
      gift_amount: 100,
      celebration_date: new Date(currentYear, now.getMonth(), now.getDate() + 7), // 1 week from now
      notes: 'Spa vouchers or jewellery'
    },
    {
      recipient_name: 'Tom (Nephew)',
      gift_amount: 40,
      celebration_date: new Date(currentYear, now.getMonth() + 2, 8), // 2 months from now
      notes: 'Lego or video games'
    },
    {
      recipient_name: 'Best Friend Jamie',
      gift_amount: 60,
      celebration_date: new Date(currentYear, now.getMonth(), now.getDate() + 21), // 3 weeks from now
      notes: 'Concert tickets or vinyl records'
    }
  ];

  // Delete existing recipients for this envelope (to allow re-running)
  await supabase
    .from('gift_recipients')
    .delete()
    .eq('envelope_id', birthdayEnvelopeId);

  // Delete existing reminders for this user's gift recipients
  await supabase
    .from('celebration_reminders')
    .delete()
    .eq('user_id', userId)
    .eq('envelope_id', birthdayEnvelopeId);

  for (const recipient of recipients) {
    const { data: newRecipient, error: recipientError } = await supabase
      .from('gift_recipients')
      .insert({
        user_id: userId,
        envelope_id: birthdayEnvelopeId,
        recipient_name: recipient.recipient_name,
        gift_amount: recipient.gift_amount,
        celebration_date: recipient.celebration_date.toISOString().split('T')[0],
        notes: recipient.notes
      })
      .select()
      .single();

    if (recipientError) {
      console.error(`   Failed to create recipient ${recipient.recipient_name}:`, recipientError.message);
    } else {
      const daysUntil = Math.ceil((recipient.celebration_date - now) / (1000 * 60 * 60 * 24));
      console.log(`   🎁 ${recipient.recipient_name}: $${recipient.gift_amount} (${daysUntil} days away)`);
    }
  }

  // Step 4: Generate celebration reminders
  console.log('\n4. Generating celebration reminders...');

  const reminderWeeks = user.celebration_reminder_weeks ?? 3;

  if (reminderWeeks === 0) {
    console.log('   Reminders are disabled for this user (celebration_reminder_weeks = 0)');
  } else {
    // Get all gift recipients with dates
    const { data: allRecipients } = await supabase
      .from('gift_recipients')
      .select('*')
      .eq('user_id', userId)
      .not('celebration_date', 'is', null);

    let remindersCreated = 0;

    for (const recipient of (allRecipients || [])) {
      const celebrationDate = new Date(recipient.celebration_date);
      const reminderDate = new Date(celebrationDate);
      reminderDate.setDate(reminderDate.getDate() - (reminderWeeks * 7));

      // Only create reminder if it's in the future
      if (reminderDate >= now || celebrationDate >= now) {
        const { error: reminderError } = await supabase
          .from('celebration_reminders')
          .insert({
            user_id: userId,
            gift_recipient_id: recipient.id,
            reminder_date: reminderDate.toISOString().split('T')[0],
            celebration_date: celebrationDate.toISOString().split('T')[0],
            recipient_name: recipient.recipient_name,
            gift_amount: recipient.gift_amount,
            envelope_id: birthdayEnvelopeId,
            is_dismissed: false
          })
          .single();

        if (!reminderError) {
          remindersCreated++;
          const daysUntilReminder = Math.ceil((reminderDate - now) / (1000 * 60 * 60 * 24));
          const daysUntilCelebration = Math.ceil((celebrationDate - now) / (1000 * 60 * 60 * 24));
          console.log(`   🔔 ${recipient.recipient_name}: reminder in ${daysUntilReminder} days (celebration in ${daysUntilCelebration} days)`);
        }
      }
    }

    console.log(`   Created ${remindersCreated} reminders`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Seeding complete!');
  console.log('='.repeat(60));

  // Get counts
  const { count: recipientCount } = await supabase
    .from('gift_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('envelope_id', birthdayEnvelopeId);

  const { count: reminderCount } = await supabase
    .from('celebration_reminders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_dismissed', false);

  console.log(`\n📊 Summary:`);
  console.log(`   🎂 Birthday envelope: ${birthdayEnvelopeId}`);
  console.log(`   🎁 Gift recipients: ${recipientCount}`);
  console.log(`   🔔 Active reminders: ${reminderCount}`);
  console.log(`\nView your dashboard to see the celebration reminders widget!`);
}

seedBirthdayEnvelope().catch(console.error);
