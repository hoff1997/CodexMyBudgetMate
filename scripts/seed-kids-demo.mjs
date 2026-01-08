#!/usr/bin/env node

/**
 * Seed Demo Kids Data
 *
 * Creates two children with:
 * - Child profiles
 * - Bank accounts (virtual)
 * - Custom chore templates (expected + extra)
 * - Chore assignments for current week
 * - Chore streaks for expected chores
 * - Hub permissions for Life module features
 * - Some star transactions
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Demo user ID (same as in setup-beta-testing.mjs)
const DEMO_USER_ID = '5d029227-09d6-4eab-b899-fbf346dd9e2d';
const FAMILY_ACCESS_CODE = 'DEMO-2026';

// Get Monday of current week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

async function seedKidsDemo() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   SEED DEMO KIDS DATA                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // ========================================================================
    // STEP 1: Clean up existing demo kids data
    // ========================================================================
    console.log('🧹 Step 1: Cleaning up existing kids data...\n');

    // Get existing child profiles for demo user
    const { data: existingKids } = await supabase
      .from('child_profiles')
      .select('id')
      .eq('parent_user_id', DEMO_USER_ID);

    if (existingKids && existingKids.length > 0) {
      const kidIds = existingKids.map(k => k.id);

      // Delete in order due to foreign keys
      await supabase.from('star_transactions').delete().in('child_profile_id', kidIds);
      await supabase.from('screen_time_transactions').delete().in('child_profile_id', kidIds);
      await supabase.from('screen_time_requests').delete().in('child_profile_id', kidIds);
      await supabase.from('child_achievements').delete().in('child_profile_id', kidIds);
      await supabase.from('child_avatar_inventory').delete().in('child_profile_id', kidIds);
      await supabase.from('child_room_layout').delete().in('child_profile_id', kidIds);
      await supabase.from('chore_assignments').delete().eq('parent_user_id', DEMO_USER_ID);
      await supabase.from('parent_invoices').delete().eq('parent_user_id', DEMO_USER_ID);
      await supabase.from('child_bank_accounts').delete().in('child_profile_id', kidIds);
      await supabase.from('child_feature_access').delete().in('child_profile_id', kidIds);
      // Delete new tables from 0063 migration
      await supabase.from('kid_hub_permissions').delete().in('child_profile_id', kidIds);
      await supabase.from('expected_chore_streaks').delete().in('child_profile_id', kidIds);
      await supabase.from('kid_invoice_items').delete().in('invoice_id',
        (await supabase.from('kid_invoices').select('id').in('child_profile_id', kidIds)).data?.map(i => i.id) || []
      );
      await supabase.from('kid_invoices').delete().in('child_profile_id', kidIds);
      await supabase.from('kid_payment_settings').delete().in('child_profile_id', kidIds);
      await supabase.from('kid_income_sources').delete().in('child_profile_id', kidIds);
      await supabase.from('kid_transfer_requests').delete().in('child_profile_id', kidIds);
      await supabase.from('child_profiles').delete().eq('parent_user_id', DEMO_USER_ID);

      console.log('   ✅ Cleared existing kids data');
    }

    // Delete custom chore templates (not presets)
    await supabase
      .from('chore_templates')
      .delete()
      .eq('parent_user_id', DEMO_USER_ID)
      .eq('is_preset', false);

    // Delete chore rotations
    await supabase.from('chore_rotations').delete().eq('parent_user_id', DEMO_USER_ID);

    console.log('   ✅ Cleared custom chore templates');

    // ========================================================================
    // STEP 2: Create child profiles
    // ========================================================================
    console.log('\n👧👦 Step 2: Creating child profiles...\n');

    // Hash PINs using simple SHA256 (demo only - use bcrypt in production)
    const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex');
    const emmaPin = hashPin('1234');
    const liamPin = hashPin('5678');

    const children = [
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Emma',
        date_of_birth: '2016-03-15', // 9 years old
        avatar_url: null,
        family_access_code: FAMILY_ACCESS_CODE,
        pin_hash: emmaPin,
        money_mode: 'virtual',
        distribution_spend_pct: 50,
        distribution_save_pct: 30,
        distribution_invest_pct: 10,
        distribution_give_pct: 10,
        star_balance: 145,
        screen_time_balance: 60,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Liam',
        date_of_birth: '2018-08-22', // 7 years old
        avatar_url: null,
        family_access_code: FAMILY_ACCESS_CODE,
        pin_hash: liamPin,
        money_mode: 'virtual',
        distribution_spend_pct: 60,
        distribution_save_pct: 20,
        distribution_invest_pct: 10,
        distribution_give_pct: 10,
        star_balance: 85,
        screen_time_balance: 30,
      },
    ];

    const { data: createdKids, error: kidsError } = await supabase
      .from('child_profiles')
      .insert(children)
      .select();

    if (kidsError) {
      console.error('   ❌ Error creating children:', kidsError.message);
      throw kidsError;
    }

    const emma = createdKids.find(k => k.name === 'Emma');
    const liam = createdKids.find(k => k.name === 'Liam');

    console.log(`   ✅ Created Emma (ID: ${emma.id})`);
    console.log(`   ✅ Created Liam (ID: ${liam.id})`);

    // ========================================================================
    // STEP 3: Create virtual bank accounts for each child
    // ========================================================================
    console.log('\n💰 Step 3: Creating virtual bank accounts...\n');

    const bankAccounts = [];
    for (const kid of createdKids) {
      const envelopeTypes = ['spend', 'save', 'invest', 'give'];
      const balances = kid.name === 'Emma'
        ? { spend: 25.50, save: 85.00, invest: 15.00, give: 10.00 }
        : { spend: 18.00, save: 42.50, invest: 8.00, give: 5.00 };

      for (const type of envelopeTypes) {
        bankAccounts.push({
          child_profile_id: kid.id,
          envelope_type: type,
          account_name: `${kid.name}'s ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          current_balance: balances[type],
          is_virtual: true,
          opening_balance: 0,
        });
      }
    }

    const { error: accountsError } = await supabase
      .from('child_bank_accounts')
      .insert(bankAccounts);

    if (accountsError) {
      console.error('   ❌ Error creating bank accounts:', accountsError.message);
    } else {
      console.log(`   ✅ Created ${bankAccounts.length} virtual bank accounts`);
    }

    // ========================================================================
    // STEP 4: Create custom chore templates (Expected + Extra)
    // ========================================================================
    console.log('\n📋 Step 4: Creating custom chore templates...\n');

    // Check if is_expected column exists
    const { error: colCheckError } = await supabase
      .from('chore_templates')
      .select('is_expected')
      .limit(1);
    const hasIsExpectedColumn = !colCheckError;

    if (hasIsExpectedColumn) {
      console.log('   ✅ is_expected column exists - using full schema');
    } else {
      console.log('   ⚠️ is_expected column not found - using basic schema');
    }

    // Expected chores (part of pocket money)
    // Note: is_expected field only included if column exists
    const expectedChoresBase = [
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Make Your Bed',
        description: 'Make your bed neatly every morning',
        frequency: 'daily',
        currency_type: 'stars',
        currency_amount: 0, // Expected = no extra pay
        category: 'bedroom',
        icon: '🛏️',
        is_preset: false,
        rotation_eligible: false,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Pack School Bag',
        description: 'Pack everything needed for tomorrow',
        frequency: 'daily',
        currency_type: 'stars',
        currency_amount: 0,
        category: 'learning',
        icon: '🎒',
        is_preset: false,
        rotation_eligible: false,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Set the Table',
        description: 'Set the table before dinner',
        frequency: 'daily',
        currency_type: 'stars',
        currency_amount: 0,
        category: 'kitchen',
        icon: '🍽️',
        is_preset: false,
        rotation_eligible: true,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Empty Dishwasher',
        description: 'Put all clean dishes away',
        frequency: 'daily',
        currency_type: 'stars',
        currency_amount: 0,
        category: 'kitchen',
        icon: '🫧',
        is_preset: false,
        rotation_eligible: true,
      },
    ];

    // Extra chores (can earn money)
    const extraChoresBase = [
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Wash the Car',
        description: 'Wash and dry the car inside and out',
        frequency: 'one_off',
        currency_type: 'money',
        currency_amount: 10.00,
        category: 'outdoors',
        icon: '🚗',
        is_preset: false,
        rotation_eligible: false,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Mow the Lawn',
        description: 'Mow the front and back lawn',
        frequency: 'one_off',
        currency_type: 'money',
        currency_amount: 15.00,
        category: 'outdoors',
        icon: '🌿',
        is_preset: false,
        rotation_eligible: false,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Vacuum the House',
        description: 'Vacuum all rooms in the house',
        frequency: 'one_off',
        currency_type: 'money',
        currency_amount: 8.00,
        category: 'general',
        icon: '🧹',
        is_preset: false,
        rotation_eligible: false,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Clean Windows',
        description: 'Wash all the windows inside',
        frequency: 'one_off',
        currency_type: 'money',
        currency_amount: 5.00,
        category: 'general',
        icon: '🪟',
        is_preset: false,
        rotation_eligible: false,
      },
      {
        parent_user_id: DEMO_USER_ID,
        name: 'Walk the Dog',
        description: 'Take the dog for a 30 minute walk',
        frequency: 'one_off',
        currency_type: 'money',
        currency_amount: 3.00,
        category: 'pets',
        icon: '🦮',
        is_preset: false,
        rotation_eligible: false,
      },
    ];

    // Add is_expected if column exists
    const expectedChores = hasIsExpectedColumn
      ? expectedChoresBase.map(c => ({ ...c, is_expected: true }))
      : expectedChoresBase;
    const extraChores = hasIsExpectedColumn
      ? extraChoresBase.map(c => ({ ...c, is_expected: false }))
      : extraChoresBase;

    const { data: createdExpected, error: expectedError } = await supabase
      .from('chore_templates')
      .insert(expectedChores)
      .select();

    if (expectedError) {
      console.error('   ❌ Error creating expected chores:', expectedError.message);
    } else {
      console.log(`   ✅ Created ${createdExpected.length} EXPECTED chore templates`);
    }

    const { data: createdExtra, error: extraError } = await supabase
      .from('chore_templates')
      .insert(extraChores)
      .select();

    if (extraError) {
      console.error('   ❌ Error creating extra chores:', extraError.message);
    } else {
      console.log(`   ✅ Created ${createdExtra.length} EXTRA chore templates`);
    }

    const createdChores = [...(createdExpected || []), ...(createdExtra || [])];

    // ========================================================================
    // STEP 5: Assign Expected & Extra chores for current week
    // ========================================================================
    console.log('\n✅ Step 5: Assigning chores for current week...\n');

    const monday = getMonday(new Date());
    const mondayStr = monday.toISOString().split('T')[0];

    const choreAssignments = [];

    // Get our custom chore templates by name
    const makeBed = createdChores.find(c => c.name === 'Make Your Bed');
    const packBag = createdChores.find(c => c.name === 'Pack School Bag');
    const setTable = createdChores.find(c => c.name === 'Set the Table');
    const dishwasher = createdChores.find(c => c.name === 'Empty Dishwasher');
    const washCar = createdChores.find(c => c.name === 'Wash the Car');
    const mowLawn = createdChores.find(c => c.name === 'Mow the Lawn');
    const vacuum = createdChores.find(c => c.name === 'Vacuum the House');
    const windows = createdChores.find(c => c.name === 'Clean Windows');
    const walkDog = createdChores.find(c => c.name === 'Walk the Dog');

    // ===== EMMA's CHORES =====
    // Expected chores (with various completion states)
    if (makeBed) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: makeBed.id,
        child_profile_id: emma.id,
        week_starting: mondayStr,
        status: 'approved', // Completed and approved
        marked_done_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: DEMO_USER_ID,
      });
    }
    if (packBag) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: packBag.id,
        child_profile_id: emma.id,
        week_starting: mondayStr,
        status: 'done', // Done, waiting for approval
        marked_done_at: new Date().toISOString(),
      });
    }
    if (setTable) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: setTable.id,
        child_profile_id: emma.id,
        week_starting: mondayStr,
        status: 'pending', // Not done yet
      });
    }
    if (dishwasher) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: dishwasher.id,
        child_profile_id: emma.id,
        week_starting: mondayStr,
        status: 'pending',
      });
    }

    // Extra chores for Emma
    if (washCar) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: washCar.id,
        child_profile_id: emma.id,
        week_starting: mondayStr,
        status: 'approved', // Completed and approved - ready for invoice
        marked_done_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        approved_at: new Date().toISOString(),
        approved_by: DEMO_USER_ID,
      });
    }
    if (vacuum) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: vacuum.id,
        child_profile_id: emma.id,
        week_starting: mondayStr,
        status: 'done', // Done, waiting for approval
        marked_done_at: new Date().toISOString(),
      });
    }

    // ===== LIAM's CHORES =====
    // Expected chores
    if (makeBed) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: makeBed.id,
        child_profile_id: liam.id,
        week_starting: mondayStr,
        status: 'done',
        marked_done_at: new Date().toISOString(),
      });
    }
    if (setTable) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: setTable.id,
        child_profile_id: liam.id,
        week_starting: mondayStr,
        status: 'pending',
      });
    }
    if (dishwasher) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: dishwasher.id,
        child_profile_id: liam.id,
        week_starting: mondayStr,
        status: 'approved',
        marked_done_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: DEMO_USER_ID,
      });
    }

    // Extra chores for Liam
    if (walkDog) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: walkDog.id,
        child_profile_id: liam.id,
        week_starting: mondayStr,
        status: 'pending',
      });
    }
    if (windows) {
      choreAssignments.push({
        parent_user_id: DEMO_USER_ID,
        chore_template_id: windows.id,
        child_profile_id: liam.id,
        week_starting: mondayStr,
        status: 'pending',
      });
    }

    const { error: assignError } = await supabase
      .from('chore_assignments')
      .insert(choreAssignments);

    if (assignError) {
      console.error('   ❌ Error creating chore assignments:', assignError.message);
    } else {
      console.log(`   ✅ Created ${choreAssignments.length} chore assignments`);
    }

    // ========================================================================
    // STEP 5b: Create draft invoices for approved extra chores
    // ========================================================================
    console.log('\n💵 Step 5b: Creating invoices for approved extra chores...\n');

    // Check if kid_invoices table exists
    const { error: invoiceTableError } = await supabase
      .from('kid_invoices')
      .select('id')
      .limit(1);

    if (invoiceTableError && (invoiceTableError.message.includes('does not exist') || invoiceTableError.message.includes('schema cache'))) {
      console.log('   ⚠️ kid_invoices table not found - skipping (run migration 0063 first)');
    } else {
      // Fetch the chore assignments we just created to get their IDs
      const { data: createdAssignments } = await supabase
        .from('chore_assignments')
        .select('id, child_profile_id, chore_template_id, status, approved_at')
        .eq('week_starting', mondayStr)
        .in('child_profile_id', [emma.id, liam.id]);

      // Create draft invoices for Emma and Liam
      const invoices = [
        {
          child_profile_id: emma.id,
          invoice_number: `INV-${new Date().getFullYear()}-001`,
          status: 'draft',
          total_amount: 0, // Will be updated by trigger
        },
        {
          child_profile_id: liam.id,
          invoice_number: `INV-${new Date().getFullYear()}-001`,
          status: 'draft',
          total_amount: 0,
        },
      ];

      const { data: createdInvoices, error: invoiceCreateError } = await supabase
        .from('kid_invoices')
        .insert(invoices)
        .select();

      if (invoiceCreateError) {
        console.error('   ❌ Error creating invoices:', invoiceCreateError.message);
      } else if (createdInvoices) {
        console.log(`   ✅ Created ${createdInvoices.length} draft invoices`);

        // Get invoice IDs mapped by child
        const emmaInvoice = createdInvoices.find(inv => inv.child_profile_id === emma.id);
        const liamInvoice = createdInvoices.find(inv => inv.child_profile_id === liam.id);

        // Create invoice items for approved extra chores
        const invoiceItems = [];

        // Emma's approved "Wash the Car" chore ($10)
        if (washCar && emmaInvoice) {
          const assignment = createdAssignments?.find(
            a => a.child_profile_id === emma.id &&
                 a.chore_template_id === washCar.id &&
                 a.status === 'approved'
          );
          if (assignment) {
            invoiceItems.push({
              invoice_id: emmaInvoice.id,
              chore_assignment_id: assignment.id,
              chore_name: 'Wash the Car',
              amount: 10.00,
              completed_at: new Date(Date.now() - 86400000).toISOString(),
              approved_at: new Date().toISOString(),
              approved_by: DEMO_USER_ID,
            });
          }
        }

        // Note: Emma's "Vacuum" is status 'done' (waiting approval), not on invoice yet
        // Note: Liam's extra chores are 'pending', not on invoice yet

        if (invoiceItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('kid_invoice_items')
            .insert(invoiceItems);

          if (itemsError) {
            console.error('   ❌ Error creating invoice items:', itemsError.message);
          } else {
            console.log(`   ✅ Added ${invoiceItems.length} items to invoices`);
            console.log('      📝 Emma: Wash the Car ($10.00) - approved, on draft invoice');
            console.log('      📝 Emma: Vacuum House ($8.00) - done, waiting approval');
            console.log('      📝 Liam: Extra chores pending assignment');
          }
        }
      }
    }

    // ========================================================================
    // STEP 6: Add some star transactions history
    // ========================================================================
    console.log('\n⭐ Step 6: Adding star transaction history...\n');

    const starTransactions = [
      // Emma's history
      { child_profile_id: emma.id, amount: 5, source: 'achievement', description: 'First chore completed!' },
      { child_profile_id: emma.id, amount: 10, source: 'chore_completion', description: 'Made bed' },
      { child_profile_id: emma.id, amount: 10, source: 'chore_completion', description: 'Tidied room' },
      { child_profile_id: emma.id, amount: 50, source: 'achievement', description: 'Perfect week!' },
      { child_profile_id: emma.id, amount: 15, source: 'chore_completion', description: 'Fed pets' },
      { child_profile_id: emma.id, amount: 20, source: 'parent_bonus', description: 'Extra help with groceries' },
      { child_profile_id: emma.id, amount: -30, source: 'shop_purchase', description: 'Bought Cool Cat Avatar' },
      { child_profile_id: emma.id, amount: 15, source: 'chore_completion', description: 'Practice piano' },
      { child_profile_id: emma.id, amount: 50, source: 'achievement', description: 'Week Warrior streak!' },

      // Liam's history
      { child_profile_id: liam.id, amount: 5, source: 'achievement', description: 'First chore completed!' },
      { child_profile_id: liam.id, amount: 5, source: 'chore_completion', description: 'Made bed' },
      { child_profile_id: liam.id, amount: 5, source: 'chore_completion', description: 'Hung up towels' },
      { child_profile_id: liam.id, amount: 15, source: 'chore_completion', description: 'Watered plants' },
      { child_profile_id: liam.id, amount: 10, source: 'parent_bonus', description: 'Good helper!' },
      { child_profile_id: liam.id, amount: -15, source: 'shop_purchase', description: 'Bought Baseball Cap' },
      { child_profile_id: liam.id, amount: 5, source: 'chore_completion', description: 'Cleared table' },
      { child_profile_id: liam.id, amount: 55, source: 'chore_completion', description: 'Weekly chores' },
    ];

    const { error: starError } = await supabase
      .from('star_transactions')
      .insert(starTransactions);

    if (starError) {
      console.error('   ❌ Error creating star transactions:', starError.message);
    } else {
      console.log(`   ✅ Created ${starTransactions.length} star transactions`);
    }

    // ========================================================================
    // STEP 7: Add some child achievements
    // ========================================================================
    console.log('\n🏆 Step 7: Unlocking achievements...\n');

    const childAchievements = [
      { child_profile_id: emma.id, achievement_key: 'first_chore' },
      { child_profile_id: emma.id, achievement_key: 'perfect_week' },
      { child_profile_id: emma.id, achievement_key: 'streak_7' },
      { child_profile_id: emma.id, achievement_key: 'first_purchase' },
      { child_profile_id: liam.id, achievement_key: 'first_chore' },
      { child_profile_id: liam.id, achievement_key: 'first_purchase' },
    ];

    const { error: achError } = await supabase
      .from('child_achievements')
      .insert(childAchievements);

    if (achError) {
      console.error('   ❌ Error creating achievements:', achError.message);
    } else {
      console.log(`   ✅ Unlocked ${childAchievements.length} achievements`);
    }

    // ========================================================================
    // STEP 8: Add feature access
    // ========================================================================
    console.log('\n🔓 Step 8: Setting feature access...\n');

    const featureAccess = [
      // Emma has more features unlocked (older)
      { child_profile_id: emma.id, feature_name: 'recipes', has_access: true },
      { child_profile_id: emma.id, feature_name: 'shopping_list', has_access: true },
      { child_profile_id: emma.id, feature_name: 'create_todos', has_access: true },
      // Liam has limited features
      { child_profile_id: liam.id, feature_name: 'recipes', has_access: false },
      { child_profile_id: liam.id, feature_name: 'shopping_list', has_access: true },
      { child_profile_id: liam.id, feature_name: 'create_todos', has_access: false },
    ];

    const { error: accessError } = await supabase
      .from('child_feature_access')
      .insert(featureAccess);

    if (accessError) {
      console.error('   ❌ Error setting feature access:', accessError.message);
    } else {
      console.log(`   ✅ Set feature access for both children`);
    }

    // ========================================================================
    // STEP 9: Create chore streaks for expected chores (if table exists)
    // ========================================================================
    console.log('\n🔥 Step 9: Creating chore streaks...\n');

    // Check if expected_chore_streaks table exists
    const { error: streakTableError } = await supabase
      .from('expected_chore_streaks')
      .select('id')
      .limit(1);

    if (streakTableError && (streakTableError.message.includes('does not exist') || streakTableError.message.includes('schema cache'))) {
      console.log('   ⚠️ expected_chore_streaks table not found - skipping (run migration 0063 first)');
    } else {
      const streaks = [];

      // Emma has good streaks
      if (makeBed) {
        streaks.push({
          child_profile_id: emma.id,
          chore_template_id: makeBed.id,
          current_streak: 12,
          longest_streak: 15,
          last_completed_date: new Date().toISOString().split('T')[0],
          week_starting: mondayStr,
          completed_days: [true, true, true, false, false, false, false], // Mon-Wed done
        });
      }
      if (packBag) {
        streaks.push({
          child_profile_id: emma.id,
          chore_template_id: packBag.id,
          current_streak: 8,
          longest_streak: 10,
          last_completed_date: new Date().toISOString().split('T')[0],
          week_starting: mondayStr,
          completed_days: [true, true, false, false, false, false, false],
        });
      }
      if (setTable) {
        streaks.push({
          child_profile_id: emma.id,
          chore_template_id: setTable.id,
          current_streak: 5,
          longest_streak: 7,
          last_completed_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          week_starting: mondayStr,
          completed_days: [true, true, false, false, false, false, false],
        });
      }

      // Liam has shorter streaks
      if (makeBed) {
        streaks.push({
          child_profile_id: liam.id,
          chore_template_id: makeBed.id,
          current_streak: 3,
          longest_streak: 5,
          last_completed_date: new Date().toISOString().split('T')[0],
          week_starting: mondayStr,
          completed_days: [true, true, true, false, false, false, false],
        });
      }
      if (dishwasher) {
        streaks.push({
          child_profile_id: liam.id,
          chore_template_id: dishwasher.id,
          current_streak: 2,
          longest_streak: 4,
          last_completed_date: new Date().toISOString().split('T')[0],
          week_starting: mondayStr,
          completed_days: [false, true, true, false, false, false, false],
        });
      }

      if (streaks.length > 0) {
        const { error: streakError } = await supabase
          .from('expected_chore_streaks')
          .insert(streaks);

        if (streakError) {
          console.error('   ❌ Error creating chore streaks:', streakError.message);
        } else {
          console.log(`   ✅ Created ${streaks.length} chore streaks`);
        }
      }
    }

    // ========================================================================
    // STEP 10: Set Hub Permissions (Life module access - if table exists)
    // ========================================================================
    console.log('\n🏠 Step 10: Setting Hub permissions...\n');

    // Check if kid_hub_permissions table exists
    const { error: hubTableError } = await supabase
      .from('kid_hub_permissions')
      .select('id')
      .limit(1);

    if (hubTableError && (hubTableError.message.includes('does not exist') || hubTableError.message.includes('schema cache'))) {
      console.log('   ⚠️ kid_hub_permissions table not found - skipping (run migration 0063 first)');
    } else {
      const hubPermissions = [
        // Emma has more access (older)
        { child_profile_id: emma.id, feature_name: 'household_hub', permission_level: 'view' },
        { child_profile_id: emma.id, feature_name: 'birthdays', permission_level: 'view' },
        { child_profile_id: emma.id, feature_name: 'todos', permission_level: 'edit' },
        { child_profile_id: emma.id, feature_name: 'shopping', permission_level: 'edit' },
        { child_profile_id: emma.id, feature_name: 'recipes', permission_level: 'view' },
        { child_profile_id: emma.id, feature_name: 'meal_planner', permission_level: 'view' },
        // Liam has limited access
        { child_profile_id: liam.id, feature_name: 'household_hub', permission_level: 'view' },
        { child_profile_id: liam.id, feature_name: 'birthdays', permission_level: 'none' },
        { child_profile_id: liam.id, feature_name: 'todos', permission_level: 'view' },
        { child_profile_id: liam.id, feature_name: 'shopping', permission_level: 'view' },
        { child_profile_id: liam.id, feature_name: 'recipes', permission_level: 'none' },
        { child_profile_id: liam.id, feature_name: 'meal_planner', permission_level: 'none' },
      ];

      const { error: hubError } = await supabase
        .from('kid_hub_permissions')
        .insert(hubPermissions);

      if (hubError) {
        console.error('   ❌ Error setting hub permissions:', hubError.message);
      } else {
        console.log(`   ✅ Set ${hubPermissions.length} hub permissions`);
      }
    }

    // ========================================================================
    // SUCCESS SUMMARY
    // ========================================================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ DEMO KIDS SEEDED SUCCESSFULLY                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 SUMMARY:\n');
    console.log('👧 Emma (age 9):');
    console.log(`   🆔 ID: ${emma.id}`);
    console.log('   🔢 PIN: 1234');
    console.log('   💰 Total Savings: $135.50');
    console.log('   📋 EXPECTED Chores: Make Bed, Pack Bag, Set Table, Empty Dishwasher');
    console.log('   💵 EXTRA Chores: Wash Car ($10), Vacuum ($8)');
    console.log('   🔥 Best Streak: 12 days (Make Bed)');
    console.log('   🏠 Hub Access: Todos (edit), Shopping (edit), others (view)');

    console.log('\n👦 Liam (age 7):');
    console.log(`   🆔 ID: ${liam.id}`);
    console.log('   🔢 PIN: 5678');
    console.log('   💰 Total Savings: $73.50');
    console.log('   📋 EXPECTED Chores: Make Bed, Set Table, Empty Dishwasher');
    console.log('   💵 EXTRA Chores: Walk Dog ($3), Clean Windows ($5)');
    console.log('   🔥 Best Streak: 3 days (Make Bed)');
    console.log('   🏠 Hub Access: Todos (view), Shopping (view), others (none)');

    console.log('\n📊 CHORE TYPES:');
    console.log('   📋 EXPECTED = Part of pocket money (streaks tracked, no extra pay)');
    console.log('   💵 EXTRA = Invoiceable (earn money, can submit invoices)');

    console.log('\n🏠 Family Access Code:', FAMILY_ACCESS_CODE);
    console.log('\n📱 Kids can log in at: /kids with the family code and their PIN');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    process.exit(1);
  }
}

// Run the seed
seedKidsDemo();
