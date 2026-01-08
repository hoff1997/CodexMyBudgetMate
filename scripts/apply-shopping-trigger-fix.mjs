#!/usr/bin/env node
/**
 * Apply Shopping Items Trigger Fix
 *
 * This script fixes the update_shopping_list_totals() trigger function
 * which incorrectly references 'list_id' instead of 'shopping_list_id'
 *
 * Run with: node scripts/apply-shopping-trigger-fix.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runFix() {
  console.log('🔧 Fixing shopping items trigger...\n');

  try {
    // The SQL to fix the trigger
    const fixSQL = `
      -- Drop the existing trigger first
      DROP TRIGGER IF EXISTS shopping_items_totals_trigger ON shopping_items;

      -- Recreate the function with correct column name (shopping_list_id instead of list_id)
      CREATE OR REPLACE FUNCTION update_shopping_list_totals()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Recalculate totals for the affected list
        UPDATE shopping_lists
        SET
          total_estimated = COALESCE((
            SELECT SUM(COALESCE(estimated_price, 0))
            FROM shopping_items
            WHERE shopping_list_id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id)
          ), 0),
          total_actual = COALESCE((
            SELECT SUM(COALESCE(actual_price, 0))
            FROM shopping_items
            WHERE shopping_list_id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id)
          ), 0)
        WHERE id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id);

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;

      -- Recreate the trigger
      CREATE TRIGGER shopping_items_totals_trigger
      AFTER INSERT OR UPDATE OR DELETE ON shopping_items
      FOR EACH ROW
      EXECUTE FUNCTION update_shopping_list_totals();
    `;

    // Try using run_sql RPC if available
    const { error: rpcError } = await supabase.rpc('run_sql', { sql: fixSQL });

    if (rpcError) {
      console.log('RPC not available, trying alternative approach...');

      // Alternative: Execute each statement separately
      const statements = [
        'DROP TRIGGER IF EXISTS shopping_items_totals_trigger ON shopping_items',
      ];

      // Try a simple test query to verify connection
      const { data, error: testError } = await supabase
        .from('shopping_lists')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Database connection error:', testError);
        process.exit(1);
      }

      console.log('✅ Database connection verified');
      console.log('\n⚠️  The trigger fix requires direct SQL execution.');
      console.log('Please run the following SQL in Supabase Dashboard (SQL Editor):');
      console.log('─'.repeat(70));
      console.log(fixSQL);
      console.log('─'.repeat(70));
      console.log('\nOr run: npx supabase db push --include-all');
      return;
    }

    console.log('✅ Trigger fix applied successfully!');

    // Verify the fix worked by testing an insert
    console.log('\n🧪 Testing the trigger with a sample insert...');

    // Get a shopping list to test with
    const { data: lists, error: listError } = await supabase
      .from('shopping_lists')
      .select('id')
      .limit(1);

    if (lists && lists.length > 0) {
      // Insert a test item
      const { data: testItem, error: insertError } = await supabase
        .from('shopping_items')
        .insert({
          shopping_list_id: lists[0].id,
          name: '__trigger_test__',
          quantity: 1,
          estimated_price: 1.00,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Test insert failed:', insertError.message);
      } else {
        console.log('✅ Test insert succeeded - trigger is working!');

        // Clean up test item
        await supabase
          .from('shopping_items')
          .delete()
          .eq('id', testItem.id);
        console.log('🧹 Cleaned up test item');
      }
    } else {
      console.log('ℹ️  No shopping lists found to test with');
    }

    console.log('\n🎉 Migration fix complete!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

runFix();
