#!/usr/bin/env node

/**
 * Apply achievements table migration
 */

import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runMigration() {
  console.log("Checking if achievements table already exists...\n");

  // Check if table exists
  const { data: checkData, error: checkError } = await supabase
    .from("achievements")
    .select("id")
    .limit(1);

  if (!checkError) {
    console.log("✅ Table 'achievements' already exists!");
    return;
  }

  // Table doesn't exist, output the SQL to run manually
  const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];

  console.log("❌ Table 'achievements' does not exist.");
  console.log("\n📋 Please run this SQL in Supabase Dashboard (SQL Editor):\n");
  console.log("=".repeat(60));
  console.log(`
-- Achievements table for tracking user milestones
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own achievements"
  ON achievements FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);
CREATE INDEX idx_achievements_unlocked_at ON achievements(unlocked_at);
`);
  console.log("=".repeat(60));
  console.log("\n🔗 Go to: https://supabase.com/dashboard/project/" + projectRef + "/sql/new");
}

runMigration().catch(console.error);
