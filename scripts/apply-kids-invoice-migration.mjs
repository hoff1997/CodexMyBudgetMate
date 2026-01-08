// Script to apply the kids invoice system migration
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function runMigration() {
  console.log("Running kids invoice system migration...");

  // Read the migration file
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/0063_kids_invoice_system.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");

  // Split into individual statements (crude but works for most cases)
  // We'll execute the whole thing and handle errors
  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, we need to run statements manually
      console.log("exec_sql not available, running via direct connection...");
      console.log("Error:", error.message);

      // Try a simpler approach - just check if tables exist
      console.log("\nChecking if migration tables already exist...");

      const checks = [
        { table: "kid_income_sources", query: "select count(*) from kid_income_sources limit 1" },
        { table: "kid_invoices", query: "select count(*) from kid_invoices limit 1" },
        { table: "kid_invoice_items", query: "select count(*) from kid_invoice_items limit 1" },
        { table: "expected_chore_streaks", query: "select count(*) from expected_chore_streaks limit 1" },
        { table: "kid_hub_permissions", query: "select count(*) from kid_hub_permissions limit 1" },
        { table: "kid_payment_settings", query: "select count(*) from kid_payment_settings limit 1" },
        { table: "kid_transfer_requests", query: "select count(*) from kid_transfer_requests limit 1" },
      ];

      for (const check of checks) {
        const { error: checkError } = await supabase.from(check.table).select("id").limit(1);
        if (checkError) {
          console.log(`❌ Table '${check.table}' does NOT exist - migration needed`);
        } else {
          console.log(`✅ Table '${check.table}' exists`);
        }
      }

      // Check for new columns on chore_templates
      const { data: choreData, error: choreError } = await supabase
        .from("chore_templates")
        .select("is_expected")
        .limit(1);

      if (choreError && choreError.message.includes("is_expected")) {
        console.log(`❌ Column 'is_expected' on chore_templates does NOT exist - migration needed`);
      } else {
        console.log(`✅ Column 'is_expected' on chore_templates exists`);
      }

      console.log("\n⚠️  You may need to run the migration manually via Supabase Dashboard SQL Editor.");
      console.log("Migration file: supabase/migrations/0063_kids_invoice_system.sql");
      return;
    }

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("Error running migration:", err);
  }
}

runMigration();
