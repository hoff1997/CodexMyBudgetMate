#!/usr/bin/env node

/**
 * Direct SQL migration runner using Supabase Management API
 */

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

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
console.log(`Project ref: ${projectRef}`);

const sql = `
-- Create onboarding_drafts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  current_step int NOT NULL DEFAULT 1,
  full_name text,
  persona text CHECK (persona IN ('beginner', 'optimiser', 'wealth_builder')),
  bank_accounts jsonb DEFAULT '[]',
  income_sources jsonb DEFAULT '[]',
  use_template boolean DEFAULT true,
  envelopes jsonb DEFAULT '[]',
  envelope_allocations jsonb DEFAULT '{}',
  opening_balances jsonb DEFAULT '{}',
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist (using DO block to check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_drafts' AND policyname = 'Onboarding drafts accessible by owner'
  ) THEN
    CREATE POLICY "Onboarding drafts accessible by owner"
      ON public.onboarding_drafts
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user
  ON public.onboarding_drafts(user_id);

-- Add column to profiles if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_onboarding_draft boolean DEFAULT false;

SELECT 'Migration completed successfully' as result;
`;

async function runMigration() {
  console.log("Running SQL migration via PostgREST...\n");

  // Use the database REST endpoint with service key
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
  });

  // PostgREST doesn't support raw SQL, so let's just try to create/insert into the table
  // to see if it exists

  console.log("Checking if table exists by attempting to query it...");

  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/onboarding_drafts?select=id&limit=1`, {
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
  });

  if (checkResponse.ok) {
    console.log("✅ Table 'onboarding_drafts' already exists!");
    return;
  }

  const errorData = await checkResponse.json();
  console.log("Table check response:", errorData);

  console.log("\n❌ Table does not exist.");
  console.log("\n📋 Please run this SQL in Supabase Dashboard (SQL Editor):\n");
  console.log("=".repeat(60));
  console.log(sql);
  console.log("=".repeat(60));
  console.log("\n🔗 Go to: https://supabase.com/dashboard/project/" + projectRef + "/sql/new");
}

runMigration().catch(console.error);
