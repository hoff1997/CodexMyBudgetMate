#!/usr/bin/env node

/**
 * Script to apply the onboarding autosave migration
 * Run with: node scripts/apply-onboarding-autosave-migration.mjs
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("Applying onboarding autosave migration...");

  try {
    // Create the onboarding_drafts table
    const { error: tableError } = await supabase.rpc("exec_sql", {
      sql: `
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
      `,
    });

    if (tableError) {
      // If RPC doesn't exist, try direct SQL via REST
      console.log("RPC not available, trying alternative approach...");

      // Check if table exists
      const { data: existingTable } = await supabase
        .from("onboarding_drafts")
        .select("id")
        .limit(1);

      if (existingTable === null) {
        console.log("Table doesn't exist yet. Please run the migration SQL directly in Supabase dashboard.");
        console.log("\nSQL to run:");
        console.log(`
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

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Onboarding drafts accessible by owner"
  ON public.onboarding_drafts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user
  ON public.onboarding_drafts(user_id);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_onboarding_draft boolean DEFAULT false;
        `);
      } else {
        console.log("Table already exists!");
      }
    } else {
      console.log("Migration applied successfully!");
    }

    // Try to add the column to profiles
    const { error: columnError } = await supabase
      .from("profiles")
      .select("has_onboarding_draft")
      .limit(1);

    if (columnError && columnError.message.includes("does not exist")) {
      console.log("\nNote: The 'has_onboarding_draft' column needs to be added to profiles table.");
      console.log("Run this SQL in Supabase dashboard:");
      console.log("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_onboarding_draft boolean DEFAULT false;");
    }

  } catch (error) {
    console.error("Migration error:", error);
  }
}

applyMigration();
