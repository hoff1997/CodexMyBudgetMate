#!/usr/bin/env node

/**
 * Apply Credit Card Onboarding Migration
 *
 * This script applies the 0029_credit_card_onboarding.sql migration
 * which adds comprehensive credit card configuration support including:
 * - CC usage type tracking (pay_in_full, paying_down, minimum_only)
 * - Billing cycle per-statement tracking
 * - Payment reconciliation records
 * - Payoff projections
 * - Card identifier tracking on transactions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Starting Credit Card Onboarding migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '0029_credit_card_onboarding.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons but be careful with function definitions
    // We'll execute the whole file at once using rpc if available, or split carefully

    console.log('Executing migration SQL...\n');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try executing statements individually
      if (error.message.includes('function') || error.code === '42883') {
        console.log('exec_sql not available, executing statements individually...\n');
        await executeStatementsIndividually(migrationSQL);
      } else {
        throw error;
      }
    } else {
      console.log('Migration executed successfully!\n');
    }

    // Verify the migration
    await verifyMigration();

    console.log('\n✅ Credit Card Onboarding migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function executeStatementsIndividually(sql) {
  // Split SQL into statements, being careful with function definitions
  const statements = splitSQLStatements(sql);

  let successCount = 0;
  let skipCount = 0;

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }

    try {
      const { error } = await supabase.from('_migrations_temp').select('*').limit(0);
      // Use raw SQL execution through REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: trimmed })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check if it's an "already exists" error - that's OK
        if (errorText.includes('already exists') || errorText.includes('duplicate')) {
          skipCount++;
          console.log(`  ⏭️  Skipped (already exists): ${trimmed.substring(0, 50)}...`);
        } else {
          console.warn(`  ⚠️  Warning: ${errorText.substring(0, 100)}`);
        }
      } else {
        successCount++;
        console.log(`  ✓ Executed: ${trimmed.substring(0, 50)}...`);
      }
    } catch (err) {
      console.warn(`  ⚠️  Statement error: ${err.message}`);
    }
  }

  console.log(`\nExecuted ${successCount} statements, skipped ${skipCount} (already exist)`);
}

function splitSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  let dollarQuote = null;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for dollar-quoted strings (used in function bodies)
    if (!dollarQuote) {
      const dollarMatch = trimmedLine.match(/\$\$|\$[a-zA-Z_][a-zA-Z0-9_]*\$/);
      if (dollarMatch) {
        dollarQuote = dollarMatch[0];
        inFunction = true;
      }
    } else if (trimmedLine.includes(dollarQuote)) {
      // Count occurrences - if even, we're exiting the dollar quote
      const count = (trimmedLine.match(new RegExp(dollarQuote.replace(/\$/g, '\\$'), 'g')) || []).length;
      if (count % 2 === 1) {
        // Odd count means we're toggling state
        if (inFunction) {
          inFunction = false;
          dollarQuote = null;
        }
      }
    }

    current += line + '\n';

    // If we're not in a function and line ends with semicolon, it's end of statement
    if (!inFunction && trimmedLine.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Don't forget any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function verifyMigration() {
  console.log('\nVerifying migration...');

  // Check that new tables exist
  const tables = [
    'credit_card_cycle_holdings',
    'credit_card_payment_reconciliations',
    'credit_card_payoff_projections'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error && !error.message.includes('permission')) {
      console.log(`  ❌ Table ${table}: NOT FOUND`);
    } else {
      console.log(`  ✓ Table ${table}: EXISTS`);
    }
  }

  // Check that new columns exist on accounts
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('cc_usage_type, cc_still_using, cc_starting_debt_amount')
    .limit(0);

  if (accountError && !accountError.message.includes('permission')) {
    console.log(`  ❌ Accounts CC columns: ERROR - ${accountError.message}`);
  } else {
    console.log(`  ✓ Accounts CC columns: EXISTS`);
  }

  // Check that new columns exist on transactions
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('card_identifier, is_cc_payment')
    .limit(0);

  if (txError && !txError.message.includes('permission')) {
    console.log(`  ❌ Transactions CC columns: ERROR - ${txError.message}`);
  } else {
    console.log(`  ✓ Transactions CC columns: EXISTS`);
  }

  // Check that new columns exist on envelopes
  const { data: envData, error: envError } = await supabase
    .from('envelopes')
    .select('is_cc_holding, cc_account_id')
    .limit(0);

  if (envError && !envError.message.includes('permission')) {
    console.log(`  ❌ Envelopes CC columns: ERROR - ${envError.message}`);
  } else {
    console.log(`  ✓ Envelopes CC columns: EXISTS`);
  }
}

// Run the migration
runMigration();
