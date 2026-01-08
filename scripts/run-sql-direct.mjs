#!/usr/bin/env node
/**
 * Run SQL directly via Supabase
 *
 * Uses the Management API to execute raw SQL
 *
 * Run with: node scripts/run-sql-direct.mjs
 */

import https from 'https';
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

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

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

async function runSQL() {
  console.log('🔧 Running SQL fix for shopping items trigger...\n');
  console.log('Project ref:', projectRef);

  // Make request to Supabase REST API using PostgREST's function execution
  const url = new URL(`${supabaseUrl}/rest/v1/rpc/exec_sql`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: fixSQL }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`REST API failed (expected): ${response.status}`);
    console.log('\n⚠️  Direct SQL execution not available via REST API.');
    console.log('\nPlease run this SQL in Supabase Dashboard → SQL Editor:');
    console.log('─'.repeat(70));
    console.log(fixSQL);
    console.log('─'.repeat(70));
    return false;
  }

  console.log('✅ SQL executed successfully!');
  return true;
}

runSQL();
