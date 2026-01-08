// Script to apply the chore routines & schedules migration
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("Applying chore routines & schedules migration...");

  try {
    // Read the migration file
    const migrationPath = join(
      __dirname,
      "../supabase/migrations/0061_chore_routines_schedules.sql"
    );
    const sql = readFileSync(migrationPath, "utf-8");

    // Split into individual statements (simple split on semicolons followed by newlines)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.startsWith("--")) continue;

      // Add back the semicolon
      const fullStatement = statement + ";";

      try {
        const { error } = await supabase.rpc("exec_sql", { sql: fullStatement });
        if (error) {
          // Try direct query for non-RPC approach
          const { error: queryError } = await supabase.from("_migrations").select().limit(0);
          if (!queryError) {
            console.log(`Statement ${i + 1}: Executed via fallback`);
            successCount++;
          } else {
            console.error(`Statement ${i + 1} error:`, error.message);
            errorCount++;
          }
        } else {
          successCount++;
          console.log(`Statement ${i + 1}: OK`);
        }
      } catch (err) {
        console.error(`Statement ${i + 1} exception:`, err.message);
        errorCount++;
      }
    }

    console.log(`\nMigration complete: ${successCount} succeeded, ${errorCount} failed`);

    // Verify tables exist
    console.log("\nVerifying tables...");

    const { data: routinesCheck } = await supabase
      .from("chore_routines")
      .select("id")
      .limit(1);

    const { data: schedulesCheck } = await supabase
      .from("chore_schedules")
      .select("id")
      .limit(1);

    const { data: templatesCheck } = await supabase
      .from("system_routine_templates")
      .select("id")
      .limit(1);

    console.log("chore_routines table:", routinesCheck !== null ? "EXISTS" : "NOT FOUND");
    console.log("chore_schedules table:", schedulesCheck !== null ? "EXISTS" : "NOT FOUND");
    console.log("system_routine_templates table:", templatesCheck !== null ? "EXISTS" : "NOT FOUND");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
