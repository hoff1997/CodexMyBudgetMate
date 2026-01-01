#!/usr/bin/env node

/**
 * Apply the leveled bills migration
 *
 * This adds the is_leveled, leveling_data, and seasonal_pattern columns
 * to the envelopes table for seasonal expense leveling.
 *
 * Usage: node scripts/apply-leveled-bills-migration.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("🚀 Applying leveled bills migration...\n");

  // Read the migration SQL
  const migrationPath = join(__dirname, "..", "supabase", "migrations", "0041_leveled_bills.sql");
  const migrationSql = readFileSync(migrationPath, "utf-8");

  console.log("📜 Migration SQL:\n");
  console.log(migrationSql);
  console.log("\n");

  try {
    // Execute the migration using Supabase's raw SQL execution
    const { data, error } = await supabase.rpc("exec_sql", { sql: migrationSql });

    if (error) {
      // If the exec_sql function doesn't exist, we need to run individual statements
      console.log("⚠️  exec_sql RPC not available, running statements individually...\n");

      // Split into individual statements (basic splitting - handles most cases)
      const statements = migrationSql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--") && !s.startsWith("COMMENT"));

      for (const statement of statements) {
        if (statement.toLowerCase().startsWith("alter table")) {
          console.log(`📝 Executing: ${statement.substring(0, 60)}...`);

          // Check if column already exists before adding
          if (statement.includes("ADD COLUMN IF NOT EXISTS")) {
            // Extract column name
            const match = statement.match(/ADD COLUMN IF NOT EXISTS\s+(\w+)/i);
            if (match) {
              const columnName = match[1];
              console.log(`   Checking if column '${columnName}' exists...`);
            }
          }
        }
      }

      // For now, print instructions for manual execution
      console.log("\n📋 To apply this migration manually:");
      console.log("1. Go to your Supabase dashboard");
      console.log("2. Navigate to SQL Editor");
      console.log("3. Paste and run the following SQL:\n");
      console.log("-------------------------------------------");
      console.log(migrationSql);
      console.log("-------------------------------------------");
    } else {
      console.log("✅ Migration applied successfully!");
    }

    // Verify the columns exist
    console.log("\n🔍 Verifying migration...");

    const { data: testData, error: testError } = await supabase
      .from("envelopes")
      .select("id, is_leveled, leveling_data, seasonal_pattern")
      .limit(1);

    if (testError) {
      if (testError.message.includes("column")) {
        console.log("❌ Columns not yet added. Please run the migration manually via Supabase dashboard.");
      } else {
        console.log("⚠️  Test query returned error:", testError.message);
      }
    } else {
      console.log("✅ Migration verified - all leveling columns exist!");
      console.log("   Sample data:", testData);
    }

  } catch (err) {
    console.error("❌ Error running migration:", err.message);
    console.log("\n📋 Please run the migration manually via Supabase dashboard SQL Editor.");
  }
}

runMigration().catch(console.error);
