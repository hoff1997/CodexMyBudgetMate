/**
 * Script to fix the show_onboarding_menu flag for a user
 * Run with: node scripts/fix-onboarding-menu.mjs
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOnboardingMenu() {
  // User ID from profiles table
  const userId = "5d029227-09d6-4eab-b899-fbf346dd9e2d";

  console.log(`Checking profile for user: ${userId}`);

  // Get current profile state
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching profile:", fetchError);
    process.exit(1);
  }

  console.log("Current profile state:");
  console.log("  - onboarding_completed:", profile.onboarding_completed);
  console.log("  - show_onboarding_menu:", profile.show_onboarding_menu);

  // Update to hide onboarding menu
  const { data, error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      show_onboarding_menu: false,
    })
    .eq("id", userId)
    .select();

  if (error) {
    console.error("Error updating profile:", error);
    process.exit(1);
  }

  console.log("\nProfile updated successfully!");
  console.log("  - onboarding_completed: true");
  console.log("  - show_onboarding_menu: false");
  console.log("\nRefresh your browser to see the change.");
}

fixOnboardingMenu();
