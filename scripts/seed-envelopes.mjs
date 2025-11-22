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

async function seedEnvelopes() {
  // Get the first user
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (usersError || !users || users.length === 0) {
    console.error('No users found:', usersError);
    process.exit(1);
  }

  const userId = users[0].id;
  console.log('Seeding envelopes for user:', userId);

  // Define categories with envelopes
  const categoriesWithEnvelopes = [
    {
      name: 'Housing',
      icon: '🏠',
      envelopes: [
        { name: 'Rent/Mortgage', icon: '🏡', target: 1500, current: 1500, frequency: 'MONTHLY', dueDate: 1, perPay: 750 },
        { name: 'Home Insurance', icon: '🛡️', target: 120, current: 60, frequency: 'MONTHLY', dueDate: 15, perPay: 60 },
        { name: 'Rates', icon: '📋', target: 200, current: 150, frequency: 'MONTHLY', dueDate: 20, perPay: 100 },
      ]
    },
    {
      name: 'Utilities',
      icon: '⚡',
      envelopes: [
        { name: 'Electricity', icon: '💡', target: 150, current: 120, frequency: 'MONTHLY', dueDate: 10, perPay: 75 },
        { name: 'Water', icon: '💧', target: 50, current: 50, frequency: 'MONTHLY', dueDate: 12, perPay: 25 },
        { name: 'Internet', icon: '🌐', target: 85, current: 85, frequency: 'MONTHLY', dueDate: 5, perPay: 42.50 },
        { name: 'Mobile Phone', icon: '📱', target: 65, current: 65, frequency: 'MONTHLY', dueDate: 8, perPay: 32.50 },
      ]
    },
    {
      name: 'Food & Groceries',
      icon: '🛒',
      envelopes: [
        { name: 'Groceries', icon: '🥬', target: 400, current: 250, frequency: 'WEEKLY', dueDate: null, perPay: 200 },
        { name: 'Dining Out', icon: '🍽️', target: 150, current: 80, frequency: 'MONTHLY', dueDate: null, perPay: 75 },
      ]
    },
    {
      name: 'Transportation',
      icon: '🚗',
      envelopes: [
        { name: 'Fuel', icon: '⛽', target: 200, current: 150, frequency: 'MONTHLY', dueDate: null, perPay: 100 },
        { name: 'Car Insurance', icon: '🚙', target: 120, current: 120, frequency: 'MONTHLY', dueDate: 18, perPay: 60 },
        { name: 'Car Maintenance', icon: '🔧', target: 100, current: 45, frequency: 'MONTHLY', dueDate: null, perPay: 50 },
      ]
    },
    {
      name: 'Personal Care',
      icon: '💆',
      envelopes: [
        { name: 'Health & Medical', icon: '🏥', target: 80, current: 40, frequency: 'MONTHLY', dueDate: null, perPay: 40 },
        { name: 'Haircuts', icon: '💇', target: 50, current: 50, frequency: 'MONTHLY', dueDate: null, perPay: 25 },
        { name: 'Gym Membership', icon: '🏋️', target: 60, current: 60, frequency: 'MONTHLY', dueDate: 1, perPay: 30 },
      ]
    },
    {
      name: 'Entertainment',
      icon: '🎮',
      envelopes: [
        { name: 'Streaming Services', icon: '📺', target: 45, current: 45, frequency: 'MONTHLY', dueDate: 1, perPay: 22.50 },
        { name: 'Hobbies', icon: '🎨', target: 100, current: 30, frequency: 'MONTHLY', dueDate: null, perPay: 50 },
        { name: 'Fun Money', icon: '🎉', target: 150, current: 90, frequency: 'MONTHLY', dueDate: null, perPay: 75 },
      ]
    },
    {
      name: 'Savings',
      icon: '💰',
      envelopes: [
        { name: 'Emergency Fund', icon: '🆘', target: 500, current: 300, frequency: 'MONTHLY', dueDate: null, perPay: 250 },
        { name: 'Holiday Fund', icon: '✈️', target: 200, current: 150, frequency: 'MONTHLY', dueDate: null, perPay: 100 },
        { name: 'New Car', icon: '🚘', target: 300, current: 0, frequency: 'MONTHLY', dueDate: null, perPay: 150 },
      ]
    },
    {
      name: 'Debt',
      icon: '💳',
      envelopes: [
        { name: 'Credit Card', icon: '💳', target: 250, current: 250, frequency: 'MONTHLY', dueDate: 25, perPay: 125 },
        { name: 'Personal Loan', icon: '🏦', target: 180, current: 180, frequency: 'MONTHLY', dueDate: 15, perPay: 90 },
      ]
    },
    {
      name: 'Miscellaneous',
      icon: '📦',
      envelopes: [
        { name: 'Gifts', icon: '🎁', target: 80, current: 30, frequency: 'MONTHLY', dueDate: null, perPay: 40 },
        { name: 'Pet Care', icon: '🐕', target: 70, current: 50, frequency: 'MONTHLY', dueDate: null, perPay: 35 },
        { name: 'Spending Account', icon: '💵', target: 0, current: 500, frequency: null, dueDate: null, perPay: 0, isSpending: true },
      ]
    }
  ];

  let sortOrder = 0;

  for (const category of categoriesWithEnvelopes) {
    console.log(`\n📁 Creating category: ${category.name}`);

    // Create category
    const { data: newCategory, error: categoryError } = await supabase
      .from('envelope_categories')
      .insert({
        user_id: userId,
        name: category.name,
      })
      .select()
      .single();

    if (categoryError) {
      console.error(`  ❌ Failed to create category ${category.name}:`, categoryError.message);
      continue;
    }

    console.log(`  ✅ Category created: ${newCategory.id}`);

    // Create envelopes for this category
    for (const envelope of category.envelopes) {
      const now = new Date();
      const nextDueDate = envelope.dueDate
        ? new Date(now.getFullYear(), now.getMonth(), envelope.dueDate)
        : null;

      const { data: newEnvelope, error: envelopeError } = await supabase
        .from('envelopes')
        .insert({
          user_id: userId,
          category_id: newCategory.id,
          name: envelope.name,
          icon: envelope.icon,
          target_amount: envelope.target,
          current_amount: envelope.current,
          frequency: envelope.frequency,
          due_date: nextDueDate?.toISOString(),
          next_payment_due: nextDueDate?.toISOString(),
          pay_cycle_amount: envelope.perPay,
          sort_order: sortOrder++,
          is_spending: envelope.isSpending || false,
        })
        .select()
        .single();

      if (envelopeError) {
        console.error(`    ❌ Failed to create envelope ${envelope.name}:`, envelopeError.message);
      } else {
        const status = envelope.current >= envelope.target ? '✅' :
                      envelope.current === 0 ? '❌' : '⚠️';
        console.log(`    ${status} ${envelope.name}: $${envelope.current}/$${envelope.target}`);
      }
    }
  }

  // Count results
  const { count: categoryCount } = await supabase
    .from('envelope_categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: envelopeCount } = await supabase
    .from('envelopes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Seeding complete!`);
  console.log(`📁 Total categories: ${categoryCount}`);
  console.log(`📊 Total envelopes: ${envelopeCount}`);
  console.log('='.repeat(60));
}

seedEnvelopes();
