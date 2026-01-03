import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Adding color column to envelope_categories table...");

  // Add color column
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'envelope_categories'
          AND column_name = 'color'
        ) THEN
          ALTER TABLE envelope_categories ADD COLUMN color VARCHAR(20);
        END IF;
      END $$;
    `,
  });

  if (error) {
    // Try alternative method - direct query
    console.log("Trying alternative method...");
    const { error: error2 } = await supabase
      .from("envelope_categories")
      .select("color")
      .limit(1);

    if (error2 && error2.message.includes("column")) {
      console.error("Column doesn't exist and couldn't be added automatically.");
      console.log("Please run this SQL manually in Supabase dashboard:");
      console.log("ALTER TABLE envelope_categories ADD COLUMN color VARCHAR(20);");
    } else if (error2) {
      console.error("Error:", error2.message);
    } else {
      console.log("✅ Color column already exists!");
    }
  } else {
    console.log("✅ Migration applied successfully!");
  }
}

run().catch(console.error);
