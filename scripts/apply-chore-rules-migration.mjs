#!/usr/bin/env node

/**
 * Apply chore template rules migration (0065)
 * Adds: max_per_week, allowed_days, auto_approve columns
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log("Applying chore template rules migration...\n");

  // Check if columns exist by trying to select them
  const { data: testData, error: testError } = await supabase
    .from("chore_templates")
    .select("id, max_per_week, allowed_days, auto_approve")
    .limit(1);

  if (testError) {
    if (testError.message.includes("does not exist")) {
      console.log("Columns don't exist yet. Please run the migration via SQL:");
      console.log("\nALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS max_per_week INTEGER;");
      console.log("ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS allowed_days INTEGER[];");
      console.log("ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;");
      console.log("ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;");
      console.log("ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS recommended_age_min INTEGER;");
      console.log("ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS recommended_age_max INTEGER;");
      return;
    }
    console.error("Error checking schema:", testError);
    return;
  }

  console.log("Columns already exist! Updating preset chores with sensible defaults...\n");

  // Update expected daily chores to auto-approve
  const autoApproveChores = ["Make bed", "Get dressed", "Brush teeth", "Pack school bag", "Put dirty clothes in hamper"];

  for (const choreName of autoApproveChores) {
    const { error } = await supabase
      .from("chore_templates")
      .update({ auto_approve: true })
      .eq("name", choreName)
      .eq("is_expected", true);

    if (!error) {
      console.log(`  Set auto_approve=true for "${choreName}"`);
    }
  }

  // Set weekly limit for certain chores
  const weeklyChores = ["Vacuum room", "Clean bedroom", "Mow lawn", "Wash car", "Deep clean bathroom"];

  for (const choreName of weeklyChores) {
    const { error } = await supabase
      .from("chore_templates")
      .update({ max_per_week: 1 })
      .eq("name", choreName);

    if (!error) {
      console.log(`  Set max_per_week=1 for "${choreName}"`);
    }
  }

  // Set weekend-only chores
  const weekendChores = ["Wash car", "Mow lawn", "Yard work"];

  for (const choreName of weekendChores) {
    const { error } = await supabase
      .from("chore_templates")
      .update({ allowed_days: [5, 6] })  // Sat, Sun
      .eq("name", choreName);

    if (!error) {
      console.log(`  Set allowed_days=[5,6] (Sat/Sun) for "${choreName}"`);
    }
  }

  console.log("\nMigration complete!");
}

applyMigration().catch(console.error);
