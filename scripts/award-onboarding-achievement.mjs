/**
 * Script to manually award the onboarding_complete achievement
 * Run with: node scripts/award-onboarding-achievement.mjs
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

async function awardAchievement() {
  // User ID from profiles table
  const userId = "5d029227-09d6-4eab-b899-fbf346dd9e2d";

  console.log(`Awarding achievement to user: ${userId}`);

  // Award the achievement
  const { data, error } = await supabase
    .from("achievements")
    .upsert(
      {
        user_id: userId,
        achievement_type: "onboarding_complete",
        metadata: { source: "manual_award" },
        unlocked_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,achievement_type",
      }
    )
    .select();

  if (error) {
    console.error("Error awarding achievement:", error);
    process.exit(1);
  }

  console.log("Achievement awarded successfully!");
  console.log("Data:", data);
}

awardAchievement();
