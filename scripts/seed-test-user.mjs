#!/usr/bin/env node

/**
 * Seed Complete Test User
 *
 * Creates a fully-featured test user with:
 * - User account in Supabase Auth
 * - Envelope categories with icons
 * - Envelopes across all subtypes (bill, spending, savings, goal, tracking)
 * - Income sources with pay cycles
 * - Bank accounts
 * - Sample transactions
 * - Birthdays with celebration envelope
 * - Kids module data (children, chores, invoices)
 * - Meal plans and recipes
 * - Shopping lists and todos
 *
 * Run with: node scripts/seed-test-user.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Admin client for service role operations
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Anon client for sign up (when admin API fails)
const anonClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY, {
  auth: { persistSession: false }
});

// Test user configuration
const TEST_USER_EMAIL = 'test@mybudgetmate.co.nz';
const TEST_USER_PASSWORD = 'Test1234!';

// Allow passing user ID as argument (required - Supabase auth API has issues)
const USER_ID_ARG = process.argv[2];

// Check if user ID was provided
if (!USER_ID_ARG) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   SEED TEST USER - SETUP REQUIRED                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('This script requires a Supabase user ID to seed data.\n');
  console.log('STEPS TO CREATE A TEST USER:\n');
  console.log('  1. Go to Supabase Dashboard → Authentication → Users');
  console.log('  2. Click "Add user" → "Create new user"');
  console.log(`  3. Email: ${TEST_USER_EMAIL}`);
  console.log(`  4. Password: ${TEST_USER_PASSWORD}`);
  console.log('  5. Check "Auto Confirm User" (important!)');
  console.log('  6. Click "Create user"');
  console.log('  7. Copy the User UID (UUID) from the table\n');
  console.log('Then run this script with the user ID:\n');
  console.log('  node scripts/seed-test-user.mjs <USER_ID>\n');
  console.log('Example:');
  console.log('  node scripts/seed-test-user.mjs 12345678-abcd-1234-abcd-123456789012\n');
  process.exit(0);
}

// Helper functions
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function seedTestUser() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   SEED COMPLETE TEST USER                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // User ID is required (checked at script start)
  const userId = USER_ID_ARG;

  try {
    // ========================================================================
    // STEP 1: Verify user ID and grant beta access
    // ========================================================================
    console.log('👤 Step 1: Verifying user account & granting beta access...\n');
    console.log(`   ✅ Using user ID: ${userId}`);

    // Grant beta access to Kids + Life features
    // First, try to get user email from profiles or auth
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profile) {
      // Create minimal profile if it doesn't exist
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: 'Test User',
        preferred_name: 'Tester',
        onboarding_completed: true,
        onboarding_step: 11,
      });
      console.log('   ✅ Created user profile');
    }

    // Grant beta access via feature_beta_access table
    const { error: betaError } = await supabase
      .from('feature_beta_access')
      .upsert({
        user_email: TEST_USER_EMAIL,
        user_type: 'adult',
        invite_code: 'TEST-2026',
      }, { onConflict: 'user_email' });

    if (betaError) {
      console.log('   ⚠️ Beta access table may not exist:', betaError.message);
      console.log('   ℹ️ Kids + Life features may require manual beta access');
    } else {
      console.log('   ✅ Granted beta access for Kids + Life features');
    }

    // ========================================================================
    // STEP 2: Clean up existing data for this user
    // ========================================================================
    console.log('\n🧹 Step 2: Cleaning up existing data...\n');

    // Delete in order due to foreign keys
    await supabase.from('gift_recipients').delete().eq('user_id', userId);
    await supabase.from('celebration_reminders').delete().eq('user_id', userId);
    await supabase.from('envelope_allocations').delete().eq('user_id', userId);
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('envelopes').delete().eq('user_id', userId);
    await supabase.from('envelope_categories').delete().eq('user_id', userId);
    await supabase.from('income_sources').delete().eq('user_id', userId);
    await supabase.from('bank_accounts').delete().eq('user_id', userId);
    await supabase.from('meal_plan_entries').delete().eq('user_id', userId);
    await supabase.from('recipes').delete().eq('user_id', userId);
    await supabase.from('shopping_list_items').delete().eq('user_id', userId);
    await supabase.from('shopping_lists').delete().eq('user_id', userId);
    await supabase.from('todo_items').delete().eq('user_id', userId);
    await supabase.from('todo_lists').delete().eq('user_id', userId);

    // Kids data cleanup
    const { data: existingKids } = await supabase
      .from('child_profiles')
      .select('id')
      .eq('parent_user_id', userId);

    if (existingKids && existingKids.length > 0) {
      const kidIds = existingKids.map(k => k.id);
      await supabase.from('star_transactions').delete().in('child_profile_id', kidIds);
      await supabase.from('child_achievements').delete().in('child_profile_id', kidIds);
      await supabase.from('chore_assignments').delete().eq('parent_user_id', userId);
      await supabase.from('child_bank_accounts').delete().in('child_profile_id', kidIds);
      await supabase.from('child_profiles').delete().eq('parent_user_id', userId);
    }
    await supabase.from('chore_templates').delete().eq('parent_user_id', userId);

    console.log('   ✅ Cleaned up existing data');

    // ========================================================================
    // STEP 3: Create envelope categories
    // ========================================================================
    console.log('\n📁 Step 3: Creating envelope categories...\n');

    const categories = [
      { user_id: userId, name: 'Housing', icon: '🏠', is_system: true, display_order: 1 },
      { user_id: userId, name: 'Transportation', icon: '🚗', is_system: true, display_order: 2 },
      { user_id: userId, name: 'Food & Dining', icon: '🍔', is_system: true, display_order: 3 },
      { user_id: userId, name: 'Utilities', icon: '⚡', is_system: true, display_order: 4 },
      { user_id: userId, name: 'Subscriptions', icon: '📺', is_system: true, display_order: 5 },
      { user_id: userId, name: 'Healthcare', icon: '🏥', is_system: true, display_order: 6 },
      { user_id: userId, name: 'Insurance', icon: '🛡️', is_system: true, display_order: 7 },
      { user_id: userId, name: 'Savings', icon: '💰', is_system: true, display_order: 8 },
      { user_id: userId, name: 'Celebrations', icon: '🎉', is_system: true, display_order: 9 },
      { user_id: userId, name: 'Personal Care', icon: '✨', is_system: true, display_order: 10 },
      { user_id: userId, name: 'Education', icon: '📚', is_system: true, display_order: 11 },
      { user_id: userId, name: 'Other', icon: '📦', is_system: true, display_order: 12 },
    ];

    const { data: createdCategories, error: catError } = await supabase
      .from('envelope_categories')
      .insert(categories)
      .select();

    if (catError) throw catError;
    console.log(`   ✅ Created ${createdCategories.length} envelope categories`);

    // Create lookup map
    const catMap = {};
    createdCategories.forEach(c => { catMap[c.name] = c.id; });

    // ========================================================================
    // STEP 4: Create bank accounts
    // ========================================================================
    console.log('\n🏦 Step 4: Creating bank accounts...\n');

    const bankAccounts = [
      { user_id: userId, name: 'Everyday Account', institution: 'ANZ', account_type: 'checking', current_balance: 2450.75, is_primary: true },
      { user_id: userId, name: 'Savings Account', institution: 'ANZ', account_type: 'savings', current_balance: 8500.00, is_primary: false },
      { user_id: userId, name: 'Credit Card', institution: 'Westpac', account_type: 'credit', current_balance: -1250.00, credit_limit: 5000, is_primary: false },
    ];

    const { data: createdAccounts, error: accError } = await supabase
      .from('bank_accounts')
      .insert(bankAccounts)
      .select();

    if (accError) {
      console.log('   ⚠️ Bank accounts table might not exist:', accError.message);
    } else {
      console.log(`   ✅ Created ${createdAccounts.length} bank accounts`);
    }

    // ========================================================================
    // STEP 5: Create income sources
    // ========================================================================
    console.log('\n💵 Step 5: Creating income sources...\n');

    const today = new Date();
    const nextPayDate = addDays(today, 7); // Next Friday-ish

    const incomeSources = [
      {
        user_id: userId,
        name: 'Salary',
        typical_amount: 3200.00,
        pay_cycle: 'fortnightly',
        next_pay_date: formatDate(nextPayDate),
        is_active: true,
        auto_allocate: true,
      },
      {
        user_id: userId,
        name: 'Side Hustle',
        typical_amount: 400.00,
        pay_cycle: 'monthly',
        next_pay_date: formatDate(addDays(today, 14)),
        is_active: true,
        auto_allocate: false,
      },
    ];

    const { data: createdIncome, error: incomeError } = await supabase
      .from('income_sources')
      .insert(incomeSources)
      .select();

    if (incomeError) throw incomeError;
    console.log(`   ✅ Created ${createdIncome.length} income sources`);

    // ========================================================================
    // STEP 6: Create envelopes across all subtypes
    // ========================================================================
    console.log('\n💼 Step 6: Creating envelopes...\n');

    const primaryIncomeId = createdIncome.find(i => i.name === 'Salary')?.id;

    // Valid priorities: essential, important, discretionary
    const envelopes = [
      // BILLS (subtype: bill)
      { user_id: userId, name: 'Rent', icon: '🏠', subtype: 'bill', category_id: catMap['Housing'], target_amount: 2000, current_amount: 1850, due_date: formatDate(addDays(today, 5)), frequency: 'fortnightly', priority: 'essential' },
      { user_id: userId, name: 'Power', icon: '⚡', subtype: 'bill', category_id: catMap['Utilities'], target_amount: 180, current_amount: 120, due_date: formatDate(addDays(today, 12)), frequency: 'monthly', priority: 'essential' },
      { user_id: userId, name: 'Internet', icon: '📡', subtype: 'bill', category_id: catMap['Utilities'], target_amount: 89, current_amount: 89, due_date: formatDate(addDays(today, 20)), frequency: 'monthly', priority: 'essential' },
      { user_id: userId, name: 'Car Insurance', icon: '🚗', subtype: 'bill', category_id: catMap['Insurance'], target_amount: 65, current_amount: 45, due_date: formatDate(addDays(today, 25)), frequency: 'monthly', priority: 'essential' },
      { user_id: userId, name: 'Health Insurance', icon: '🏥', subtype: 'bill', category_id: catMap['Insurance'], target_amount: 120, current_amount: 80, due_date: formatDate(addDays(today, 15)), frequency: 'monthly', priority: 'important' },
      { user_id: userId, name: 'Netflix', icon: '📺', subtype: 'bill', category_id: catMap['Subscriptions'], target_amount: 24.99, current_amount: 24.99, due_date: formatDate(addDays(today, 8)), frequency: 'monthly', priority: 'discretionary' },
      { user_id: userId, name: 'Spotify', icon: '🎵', subtype: 'bill', category_id: catMap['Subscriptions'], target_amount: 16.99, current_amount: 16.99, due_date: formatDate(addDays(today, 18)), frequency: 'monthly', priority: 'discretionary' },

      // SPENDING (subtype: spending)
      { user_id: userId, name: 'Groceries', icon: '🛒', subtype: 'spending', category_id: catMap['Food & Dining'], target_amount: 400, current_amount: 285, priority: 'essential', is_spending: true },
      { user_id: userId, name: 'Fuel', icon: '⛽', subtype: 'spending', category_id: catMap['Transportation'], target_amount: 150, current_amount: 95, priority: 'essential', is_spending: true },
      { user_id: userId, name: 'Dining Out', icon: '🍽️', subtype: 'spending', category_id: catMap['Food & Dining'], target_amount: 150, current_amount: 75, priority: 'discretionary', is_spending: true },
      { user_id: userId, name: 'Personal Care', icon: '💅', subtype: 'spending', category_id: catMap['Personal Care'], target_amount: 50, current_amount: 35, priority: 'important', is_spending: true },

      // SAVINGS (subtype: savings)
      { user_id: userId, name: 'Emergency Fund', icon: '🚨', subtype: 'savings', category_id: catMap['Savings'], target_amount: 10000, current_amount: 3500, priority: 'essential' },
      { user_id: userId, name: 'Holiday Fund', icon: '✈️', subtype: 'savings', category_id: catMap['Savings'], target_amount: 3000, current_amount: 850, priority: 'discretionary' },

      // GOALS (subtype: goal)
      { user_id: userId, name: 'New Laptop', icon: '💻', subtype: 'goal', category_id: catMap['Other'], target_amount: 2000, current_amount: 450, priority: 'discretionary', is_goal: true },

      // TRACKING (use savings subtype with is_tracking_only flag since 'tracking' subtype not in DB constraint)
      { user_id: userId, name: 'Work Reimbursements', icon: '💼', subtype: 'savings', category_id: catMap['Other'], target_amount: 0, current_amount: 125, is_tracking_only: true },

      // CELEBRATIONS (subtype: savings, is_celebration: true)
      { user_id: userId, name: 'Birthdays', icon: '🎂', subtype: 'savings', category_id: catMap['Celebrations'], target_amount: 500, current_amount: 200, is_celebration: true, priority: 'important' },
      { user_id: userId, name: 'Christmas', icon: '🎄', subtype: 'savings', category_id: catMap['Celebrations'], target_amount: 800, current_amount: 350, is_celebration: true, priority: 'important' },
    ];

    const { data: createdEnvelopes, error: envError } = await supabase
      .from('envelopes')
      .insert(envelopes)
      .select();

    if (envError) throw envError;
    console.log(`   ✅ Created ${createdEnvelopes.length} envelopes`);

    // Create envelope lookup
    const envMap = {};
    createdEnvelopes.forEach(e => { envMap[e.name] = e; });

    // ========================================================================
    // STEP 7: Create envelope allocations (link envelopes to income)
    // ========================================================================
    console.log('\n📊 Step 7: Creating envelope allocations...\n');

    const allocations = createdEnvelopes
      .filter(e => e.subtype === 'bill' || e.subtype === 'spending' || e.subtype === 'savings')
      .map(e => ({
        user_id: userId,
        envelope_id: e.id,
        income_source_id: primaryIncomeId,
        amount_per_pay: Math.round((e.target_amount / 2) * 100) / 100, // Fortnightly allocation
      }));

    const { error: allocError } = await supabase
      .from('envelope_allocations')
      .insert(allocations);

    if (allocError) {
      console.log('   ⚠️ Allocations table might not exist:', allocError.message);
    } else {
      console.log(`   ✅ Created ${allocations.length} envelope allocations`);
    }

    // ========================================================================
    // STEP 8: Create birthdays (gift recipients)
    // ========================================================================
    console.log('\n🎂 Step 8: Creating birthdays...\n');

    const birthdaysEnvelope = envMap['Birthdays'];

    const birthdays = [
      { user_id: userId, envelope_id: birthdaysEnvelope.id, recipient_name: 'Mum', celebration_date: '2026-03-15', gift_amount: 100, party_amount: 50, needs_gift: true },
      { user_id: userId, envelope_id: birthdaysEnvelope.id, recipient_name: 'Dad', celebration_date: '2026-06-22', gift_amount: 100, party_amount: 0, needs_gift: true },
      { user_id: userId, envelope_id: birthdaysEnvelope.id, recipient_name: 'Sarah (Best Friend)', celebration_date: '2026-04-10', gift_amount: 50, party_amount: 30, needs_gift: true },
      { user_id: userId, envelope_id: birthdaysEnvelope.id, recipient_name: 'Grandma', celebration_date: '2026-02-14', gift_amount: 0, party_amount: 0, needs_gift: false, notes: 'Just remember to call' },
      { user_id: userId, envelope_id: birthdaysEnvelope.id, recipient_name: 'Work Colleague', celebration_date: '2026-05-05', gift_amount: 20, party_amount: 0, needs_gift: true, notes: 'Office collection' },
    ];

    const { error: bdayError } = await supabase
      .from('gift_recipients')
      .insert(birthdays);

    if (bdayError) {
      console.log('   ⚠️ Gift recipients error:', bdayError.message);
    } else {
      console.log(`   ✅ Created ${birthdays.length} birthdays`);
    }

    // ========================================================================
    // STEP 9: Create sample transactions
    // ========================================================================
    console.log('\n💳 Step 9: Creating sample transactions...\n');

    const transactions = [
      // Recent grocery transactions
      { user_id: userId, description: 'Countdown Weekly Shop', merchant_name: 'Countdown', amount: -125.50, occurred_at: formatDate(addDays(today, -2)), envelope_id: envMap['Groceries']?.id, status: 'approved' },
      { user_id: userId, description: 'New World - Top up', merchant_name: 'New World', amount: -45.80, occurred_at: formatDate(addDays(today, -5)), envelope_id: envMap['Groceries']?.id, status: 'approved' },

      // Fuel
      { user_id: userId, description: 'BP Fuel', merchant_name: 'BP', amount: -85.00, occurred_at: formatDate(addDays(today, -3)), envelope_id: envMap['Fuel']?.id, status: 'approved' },

      // Dining out
      { user_id: userId, description: 'Thai Restaurant', merchant_name: 'Thai Orchid', amount: -55.00, occurred_at: formatDate(addDays(today, -4)), envelope_id: envMap['Dining Out']?.id, status: 'approved' },
      { user_id: userId, description: 'Coffee - Mojo', merchant_name: 'Mojo Coffee', amount: -6.50, occurred_at: formatDate(addDays(today, -1)), envelope_id: envMap['Dining Out']?.id, status: 'approved' },

      // Bills paid
      { user_id: userId, description: 'Netflix Subscription', merchant_name: 'Netflix', amount: -24.99, occurred_at: formatDate(addDays(today, -10)), envelope_id: envMap['Netflix']?.id, status: 'approved' },

      // Income
      { user_id: userId, description: 'Salary Deposit', merchant_name: 'ACME Corp Payroll', amount: 3200.00, occurred_at: formatDate(addDays(today, -7)), status: 'approved', transaction_type: 'income' },

      // Pending transactions
      { user_id: userId, description: 'EFTPOS Purchase', merchant_name: 'Unknown Merchant', amount: -32.00, occurred_at: formatDate(today), status: 'pending' },
      { user_id: userId, description: 'Online Transfer', merchant_name: 'Transfer', amount: -150.00, occurred_at: formatDate(today), status: 'pending' },
    ];

    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactions);

    if (txError) {
      console.log('   ⚠️ Transactions error:', txError.message);
    } else {
      console.log(`   ✅ Created ${transactions.length} transactions`);
    }

    // ========================================================================
    // STEP 10: Create recipes and meal plan
    // ========================================================================
    console.log('\n🍳 Step 10: Creating recipes and meal plans...\n');

    const recipes = [
      {
        parent_user_id: userId,
        title: 'Spaghetti Bolognese',
        source_type: 'typed',
        prep_time_minutes: 15,
        cook_time_minutes: 45,
        servings: 4,
        ingredients: [
          { item: '500g beef mince', amount: '500g' },
          { item: 'Pasta', amount: '400g' },
          { item: 'Tomato passata', amount: '500ml' },
          { item: 'Onion', amount: '1 large' },
          { item: 'Garlic', amount: '3 cloves' },
        ],
        instructions: '1. Brown mince in pan.\n2. Sauté onion and garlic.\n3. Add passata and simmer 30 mins.\n4. Cook pasta and serve.',
      },
      {
        parent_user_id: userId,
        title: 'Chicken Stir Fry',
        source_type: 'typed',
        prep_time_minutes: 10,
        cook_time_minutes: 15,
        servings: 4,
        ingredients: [
          { item: 'Chicken breast', amount: '500g' },
          { item: 'Mixed vegetables', amount: '400g' },
          { item: 'Soy sauce', amount: '3 tbsp' },
          { item: 'Rice', amount: '2 cups' },
        ],
        instructions: '1. Slice chicken.\n2. Stir fry chicken until cooked.\n3. Add vegetables and soy sauce.\n4. Serve with rice.',
      },
      {
        parent_user_id: userId,
        title: 'Fish and Chips',
        source_type: 'typed',
        prep_time_minutes: 20,
        cook_time_minutes: 30,
        servings: 4,
        ingredients: [
          { item: 'Fish fillets', amount: '4' },
          { item: 'Potatoes', amount: '1kg' },
          { item: 'Flour', amount: '1 cup' },
          { item: 'Vegetable oil', amount: 'for frying' },
        ],
        instructions: '1. Cut potatoes into chips.\n2. Coat fish in batter.\n3. Deep fry chips until golden.\n4. Deep fry fish 5-7 mins.',
      },
    ];

    const { data: createdRecipes, error: recipeError } = await supabase
      .from('recipes')
      .insert(recipes)
      .select();

    if (recipeError) {
      console.log('   ⚠️ Recipes error:', recipeError.message);
    } else {
      console.log(`   ✅ Created ${createdRecipes.length} recipes`);

      // Create meal plan entries for this week
      const monday = getMonday(today);
      const mealPlan = [
        { parent_user_id: userId, date: formatDate(monday), meal_type: 'dinner', recipe_id: createdRecipes[0]?.id },
        { parent_user_id: userId, date: formatDate(addDays(monday, 1)), meal_type: 'dinner', recipe_id: createdRecipes[1]?.id },
        { parent_user_id: userId, date: formatDate(addDays(monday, 2)), meal_type: 'dinner', meal_name: 'Leftovers' },
        { parent_user_id: userId, date: formatDate(addDays(monday, 3)), meal_type: 'dinner', recipe_id: createdRecipes[2]?.id },
        { parent_user_id: userId, date: formatDate(addDays(monday, 4)), meal_type: 'dinner', meal_name: 'Takeaway Night' },
      ];

      const { error: mealError } = await supabase
        .from('meal_plans')
        .insert(mealPlan);

      if (mealError) {
        console.log('   ⚠️ Meal plan error:', mealError.message);
      } else {
        console.log(`   ✅ Created ${mealPlan.length} meal plan entries`);
      }
    }

    // ========================================================================
    // STEP 11: Create shopping lists
    // ========================================================================
    console.log('\n🛒 Step 11: Creating shopping lists...\n');

    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ parent_user_id: userId, name: 'Weekly Groceries', icon: '🛒', is_active: true })
      .select()
      .single();

    if (listError) {
      console.log('   ⚠️ Shopping list error:', listError.message);
    } else {
      console.log(`   ✅ Created shopping list: "${shoppingList.name}"`);

      // Add shopping items (trigger was fixed in migration 0067)
      const shoppingItems = [
        { shopping_list_id: shoppingList.id, name: 'Milk', quantity: 2, category: 'Dairy', estimated_price: 6.50 },
        { shopping_list_id: shoppingList.id, name: 'Bread', quantity: 1, category: 'Bakery', estimated_price: 4.50 },
        { shopping_list_id: shoppingList.id, name: 'Eggs', quantity: 1, category: 'Dairy', estimated_price: 8.00 },
        { shopping_list_id: shoppingList.id, name: 'Chicken breast', quantity: 1, category: 'Meat', estimated_price: 15.00 },
        { shopping_list_id: shoppingList.id, name: 'Bananas', quantity: 1, category: 'Produce', estimated_price: 4.00 },
        { shopping_list_id: shoppingList.id, name: 'Pasta', quantity: 2, category: 'Pantry', estimated_price: 3.50 },
        { shopping_list_id: shoppingList.id, name: 'Tomato sauce', quantity: 1, category: 'Pantry', estimated_price: 4.00 },
      ];

      const { error: itemsError } = await supabase
        .from('shopping_items')
        .insert(shoppingItems);

      if (itemsError) {
        console.log('   ⚠️ Shopping items error:', itemsError.message);
      } else {
        console.log(`   ✅ Created ${shoppingItems.length} shopping items`);
      }
    }

    // ========================================================================
    // STEP 12: Create todo lists
    // ========================================================================
    console.log('\n✅ Step 12: Creating todo lists...\n');

    const { data: todoList, error: todoListError } = await supabase
      .from('todo_lists')
      .insert({ parent_user_id: userId, name: 'House Tasks', icon: '🏠' })
      .select()
      .single();

    if (todoListError) {
      console.log('   ⚠️ Todo list error:', todoListError.message);
    } else {
      // todo_items schema: todo_list_id, text, is_completed, sort_order, assigned_to_id, assigned_to_type, completed_at, completed_by_id, completed_by_type
      const todos = [
        { todo_list_id: todoList.id, text: 'Mow the lawn', is_completed: false, sort_order: 1 },
        { todo_list_id: todoList.id, text: 'Clean gutters', is_completed: false, sort_order: 2 },
        { todo_list_id: todoList.id, text: 'Fix leaky tap', is_completed: true, sort_order: 3, completed_at: new Date().toISOString() },
        { todo_list_id: todoList.id, text: 'Organize garage', is_completed: false, sort_order: 4 },
        { todo_list_id: todoList.id, text: 'Vacuum house', is_completed: false, sort_order: 5 },
        { todo_list_id: todoList.id, text: 'Wash car', is_completed: true, sort_order: 6, completed_at: new Date().toISOString() },
      ];

      const { error: todosError } = await supabase
        .from('todo_items')
        .insert(todos);

      if (todosError) {
        console.log('   ⚠️ Todo items error:', todosError.message);
      } else {
        console.log(`   ✅ Created todo list with ${todos.length} items`);
      }
    }

    // ========================================================================
    // STEP 13: Create kids data
    // ========================================================================
    console.log('\n👶 Step 13: Creating kids module data...\n');

    const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex');
    const familyCode = 'TEST-2026';

    const children = [
      {
        parent_user_id: userId,
        name: 'Sophie',
        date_of_birth: '2015-05-20',
        family_access_code: familyCode,
        pin_hash: hashPin('1111'),
        money_mode: 'virtual',
        distribution_spend_pct: 50,
        distribution_save_pct: 30,
        distribution_invest_pct: 10,
        distribution_give_pct: 10,
        star_balance: 120,
      },
      {
        parent_user_id: userId,
        name: 'Jack',
        date_of_birth: '2017-09-10',
        family_access_code: familyCode,
        pin_hash: hashPin('2222'),
        money_mode: 'virtual',
        distribution_spend_pct: 60,
        distribution_save_pct: 25,
        distribution_invest_pct: 10,
        distribution_give_pct: 5,
        star_balance: 75,
      },
    ];

    const { data: createdKids, error: kidsError } = await supabase
      .from('child_profiles')
      .insert(children)
      .select();

    if (kidsError) {
      console.log('   ⚠️ Kids error:', kidsError.message);
    } else {
      console.log(`   ✅ Created ${createdKids.length} children`);

      // Create bank accounts for kids
      const kidAccounts = [];
      for (const kid of createdKids) {
        const balances = kid.name === 'Sophie'
          ? { spend: 32.50, save: 95.00, invest: 20.00, give: 12.00 }
          : { spend: 22.00, save: 55.00, invest: 12.00, give: 8.00 };

        for (const type of ['spend', 'save', 'invest', 'give']) {
          kidAccounts.push({
            child_profile_id: kid.id,
            envelope_type: type,
            account_name: `${kid.name}'s ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            current_balance: balances[type],
            is_virtual: true,
            opening_balance: 0,
          });
        }
      }

      const { error: kidAccError } = await supabase
        .from('child_bank_accounts')
        .insert(kidAccounts);

      if (kidAccError) {
        console.log('   ⚠️ Kid accounts error:', kidAccError.message);
      } else {
        console.log(`   ✅ Created ${kidAccounts.length} kid bank accounts`);
      }

      // Create chore templates
      const choreTemplates = [
        { parent_user_id: userId, name: 'Make Your Bed', icon: '🛏️', frequency: 'daily', currency_type: 'stars', currency_amount: 0, is_expected: true, is_preset: false },
        { parent_user_id: userId, name: 'Pack School Bag', icon: '🎒', frequency: 'daily', currency_type: 'stars', currency_amount: 0, is_expected: true, is_preset: false },
        { parent_user_id: userId, name: 'Set the Table', icon: '🍽️', frequency: 'daily', currency_type: 'stars', currency_amount: 0, is_expected: true, is_preset: false },
        { parent_user_id: userId, name: 'Wash the Car', icon: '🚗', frequency: 'one_off', currency_type: 'money', currency_amount: 10.00, is_expected: false, is_preset: false },
        { parent_user_id: userId, name: 'Vacuum House', icon: '🧹', frequency: 'one_off', currency_type: 'money', currency_amount: 8.00, is_expected: false, is_preset: false },
      ];

      const { data: createdChores, error: choreError } = await supabase
        .from('chore_templates')
        .insert(choreTemplates)
        .select();

      if (choreError) {
        console.log('   ⚠️ Chore templates error:', choreError.message);
      } else {
        console.log(`   ✅ Created ${createdChores.length} chore templates`);

        // Assign some chores
        const monday = getMonday(today);
        const mondayStr = formatDate(monday);

        const assignments = [];
        const sophie = createdKids.find(k => k.name === 'Sophie');
        const jack = createdKids.find(k => k.name === 'Jack');
        const makeBed = createdChores.find(c => c.name === 'Make Your Bed');
        const packBag = createdChores.find(c => c.name === 'Pack School Bag');

        if (sophie && makeBed) {
          assignments.push({
            parent_user_id: userId,
            chore_template_id: makeBed.id,
            child_profile_id: sophie.id,
            week_starting: mondayStr,
            status: 'approved',
            marked_done_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: userId,
          });
        }
        if (jack && makeBed) {
          assignments.push({
            parent_user_id: userId,
            chore_template_id: makeBed.id,
            child_profile_id: jack.id,
            week_starting: mondayStr,
            status: 'done',
            marked_done_at: new Date().toISOString(),
          });
        }

        if (assignments.length > 0) {
          const { error: assignError } = await supabase
            .from('chore_assignments')
            .insert(assignments);

          if (assignError) {
            console.log('   ⚠️ Chore assignments error:', assignError.message);
          } else {
            console.log(`   ✅ Created ${assignments.length} chore assignments`);
          }
        }
      }
    }

    // ========================================================================
    // SUCCESS SUMMARY
    // ========================================================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TEST USER SEEDED SUCCESSFULLY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 LOGIN CREDENTIALS:\n');
    console.log(`   📧 Email: ${TEST_USER_EMAIL}`);
    console.log(`   🔑 Password: ${TEST_USER_PASSWORD}`);
    console.log(`   🆔 User ID: ${userId}`);
    console.log('   🔓 Beta Access: GRANTED (Kids + Life features enabled)');

    console.log('\n👶 KIDS MODULE (Beta):\n');
    console.log(`   👧 Sophie (age 10) - PIN: 1111`);
    console.log(`   👦 Jack (age 8) - PIN: 2222`);
    console.log(`   🏠 Family Code: ${familyCode}`);

    console.log('\n💰 BUDGET OVERVIEW:\n');
    console.log('   📁 12 envelope categories');
    console.log('   💼 17 envelopes (bills, spending, savings, goals, tracking)');
    console.log('   💵 2 income sources (Salary + Side Hustle)');
    console.log('   🎂 5 birthdays tracked');
    console.log('   💳 9 sample transactions');

    console.log('\n🏠 LIFE MODULE (Beta):\n');
    console.log('   🍳 3 recipes');
    console.log('   📅 5 meal plan entries');
    console.log('   🛒 1 shopping list with 7 items');
    console.log('   ✅ 1 todo list with 6 items');

    console.log('\n🔗 Quick Links:\n');
    console.log('   • Dashboard: /dashboard');
    console.log('   • Budget: /budgetallocation');
    console.log('   • Transactions: /transactions');
    console.log('   • Kids: /kids/setup');
    console.log('   • Life Hub: /life/hub');
    console.log('   • Birthdays: /life/birthdays');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    process.exit(1);
  }
}

// Run the seed
seedTestUser();
