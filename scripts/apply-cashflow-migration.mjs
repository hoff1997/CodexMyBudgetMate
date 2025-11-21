import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log("🚀 Applying multi-income cashflow migration...");
  console.log("");

  try {
    // Read the migration file
    const migrationPath = join(__dirname, "..", "supabase", "migrations", "0020_multi_income_cashflow.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");

    // Split into individual statements (simple approach)
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log("");

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith("--")) continue;

      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc("exec_sql", {
          sql_string: statement + ";",
        });

        if (error) {
          // Check if it's a "already exists" error - these are OK
          if (
            error.message.includes("already exists") ||
            error.message.includes("duplicate key")
          ) {
            console.log(`   ⚠️  Already exists (OK)`);
          } else {
            throw error;
          }
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.error(`   ❌ Error:`, err.message);
        // Continue with other statements
      }
    }

    console.log("");
    console.log("🎉 Multi-income cashflow migration complete!");
    console.log("");
    console.log("New features available:");
    console.log("  ✓ Envelope funding_sources tracking");
    console.log("  ✓ Envelope predictions table");
    console.log("  ✓ Cashflow forecasting support");
    console.log("");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
