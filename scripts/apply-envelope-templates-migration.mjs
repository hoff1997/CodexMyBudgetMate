#!/usr/bin/env node

/**
 * Apply envelope templates migration (0051)
 * Runs SQL directly against Supabase using the service role key
 */

import { createClient } from "@supabase/supabase-js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL ? "Found" : "Missing");
console.log("SERVICE_KEY:", SERVICE_KEY ? "Found" : "Missing");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log("Applying envelope templates migration...\n");

  // Step 1: Check existing columns
  console.log("Step 1: Checking existing table structure...");

  const { data: cols, error: colError } = await supabase
    .from("envelope_templates")
    .select("*")
    .limit(1);

  if (colError) {
    console.log("Table query error:", colError.message);
  } else {
    console.log("Existing columns:", cols.length > 0 ? Object.keys(cols[0]).join(", ") : "table is empty");
  }

  // Step 2: Delete existing templates
  console.log("\nStep 2: Clearing existing templates...");

  const { error: deleteError } = await supabase
    .from("envelope_templates")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.log("Delete error:", deleteError.message);
  } else {
    console.log("✅ Existing templates cleared");
  }

  // Step 3: Insert new templates using ONLY existing columns
  // Existing columns: name, category_name, subtype, icon, description, is_celebration, requires_date, display_order
  console.log("\nStep 3: Inserting 80 new envelope templates...");

  const templates = [
    // Bank category (13 envelopes)
    { name: "Credit Card Holding", category_name: "Bank", subtype: "tracking", icon: "💳", description: "Tracks money set aside for credit card payments. Auto-created when credit cards enabled.", is_celebration: false, requires_date: false, display_order: 1 },
    { name: "Credit Card Historic Debt", category_name: "Bank", subtype: "goal", icon: "📊", description: "Legacy credit card debt from before budgeting started.", is_celebration: false, requires_date: false, display_order: 2 },
    { name: "Surplus", category_name: "Bank", subtype: "tracking", icon: "💰", description: "Special envelope for unallocated funds", is_celebration: false, requires_date: false, display_order: 3 },
    { name: "Starter Stash", category_name: "Bank", subtype: "goal", icon: "🛡️", description: "First $1000 emergency fund (My Budget Way Step 1)", is_celebration: false, requires_date: false, display_order: 4 },
    { name: "Safety Net", category_name: "Bank", subtype: "goal", icon: "🏦", description: "3 months essential expenses (My Budget Way Step 3)", is_celebration: false, requires_date: false, display_order: 5 },
    { name: "Kids Pocket Money", category_name: "Bank", subtype: "spending", icon: "👧", description: null, is_celebration: false, requires_date: false, display_order: 6 },
    { name: "Work Bonus", category_name: "Bank", subtype: "tracking", icon: "🎁", description: null, is_celebration: false, requires_date: false, display_order: 7 },
    { name: "Investing", category_name: "Bank", subtype: "savings", icon: "📈", description: null, is_celebration: false, requires_date: false, display_order: 8 },
    { name: "IRD Refunds", category_name: "Bank", subtype: "tracking", icon: "💵", description: null, is_celebration: false, requires_date: false, display_order: 9 },
    { name: "Reimbursements", category_name: "Bank", subtype: "tracking", icon: "🔄", description: null, is_celebration: false, requires_date: false, display_order: 10 },
    { name: "Credit Card Fees", category_name: "Bank", subtype: "bill", icon: "💳", description: null, is_celebration: false, requires_date: false, display_order: 11 },
    { name: "Mortgage 1", category_name: "Bank", subtype: "bill", icon: "🏡", description: null, is_celebration: false, requires_date: false, display_order: 12 },
    { name: "Mortgage 2", category_name: "Bank", subtype: "bill", icon: "🏡", description: null, is_celebration: false, requires_date: false, display_order: 13 },

    // Celebrations category (5 envelopes)
    { name: "Christmas", category_name: "Celebrations", subtype: "savings", icon: "🎄", description: "Budget for Christmas gifts and celebrations", is_celebration: true, requires_date: false, display_order: 14 },
    { name: "Birthdays", category_name: "Celebrations", subtype: "savings", icon: "🎂", description: "Budget for birthday gifts throughout the year", is_celebration: true, requires_date: true, display_order: 15 },
    { name: "Easter", category_name: "Celebrations", subtype: "savings", icon: "🐰", description: "Budget for Easter celebrations and gifts", is_celebration: true, requires_date: false, display_order: 16 },
    { name: "Mother & Father's Days", category_name: "Celebrations", subtype: "savings", icon: "🌸", description: null, is_celebration: true, requires_date: false, display_order: 17 },
    { name: "Religious Festivals", category_name: "Celebrations", subtype: "savings", icon: "🕯️", description: "Budget for religious celebrations", is_celebration: true, requires_date: false, display_order: 18 },

    // Clothing category (3 envelopes)
    { name: "Name 1 Clothing", category_name: "Clothing", subtype: "spending", icon: "👔", description: null, is_celebration: false, requires_date: false, display_order: 19 },
    { name: "Name 2 Clothing", category_name: "Clothing", subtype: "spending", icon: "👗", description: null, is_celebration: false, requires_date: false, display_order: 20 },
    { name: "Kid's Clothing", category_name: "Clothing", subtype: "spending", icon: "👕", description: null, is_celebration: false, requires_date: false, display_order: 21 },

    // Extras category (7 envelopes)
    { name: "Fun Money", category_name: "Extras", subtype: "spending", icon: "🎉", description: null, is_celebration: false, requires_date: false, display_order: 22 },
    { name: "Name 1 Personal", category_name: "Extras", subtype: "spending", icon: "🛍️", description: null, is_celebration: false, requires_date: false, display_order: 23 },
    { name: "Name 2 Personal", category_name: "Extras", subtype: "spending", icon: "🛍️", description: null, is_celebration: false, requires_date: false, display_order: 24 },
    { name: "Eyebrows", category_name: "Extras", subtype: "spending", icon: "✨", description: null, is_celebration: false, requires_date: false, display_order: 25 },
    { name: "Takeaways/Restaurants", category_name: "Extras", subtype: "spending", icon: "🍽️", description: null, is_celebration: false, requires_date: false, display_order: 26 },
    { name: "Holidays", category_name: "Extras", subtype: "goal", icon: "✈️", description: null, is_celebration: false, requires_date: false, display_order: 27 },
    { name: "Books/Learning", category_name: "Extras", subtype: "spending", icon: "📚", description: null, is_celebration: false, requires_date: false, display_order: 28 },

    // Giving category (2 envelopes)
    { name: "Donations", category_name: "Giving", subtype: "spending", icon: "❤️", description: null, is_celebration: false, requires_date: false, display_order: 29 },
    { name: "Gifts (General/Not Birthdays)", category_name: "Giving", subtype: "savings", icon: "🎁", description: null, is_celebration: false, requires_date: false, display_order: 30 },

    // Hair category (3 envelopes)
    { name: "Name 1 Hair", category_name: "Hair", subtype: "spending", icon: "💇", description: null, is_celebration: false, requires_date: false, display_order: 31 },
    { name: "Name 2 Hair", category_name: "Hair", subtype: "spending", icon: "💇‍♀️", description: null, is_celebration: false, requires_date: false, display_order: 32 },
    { name: "Kid's Hair", category_name: "Hair", subtype: "spending", icon: "💇‍♀️", description: null, is_celebration: false, requires_date: false, display_order: 33 },

    // Health category (6 envelopes)
    { name: "Medication", category_name: "Health", subtype: "spending", icon: "💊", description: null, is_celebration: false, requires_date: false, display_order: 34 },
    { name: "GP/Medical", category_name: "Health", subtype: "spending", icon: "🏥", description: null, is_celebration: false, requires_date: false, display_order: 35 },
    { name: "Dentist", category_name: "Health", subtype: "spending", icon: "🦷", description: null, is_celebration: false, requires_date: false, display_order: 36 },
    { name: "Glasses/Optometrist", category_name: "Health", subtype: "savings", icon: "👓", description: null, is_celebration: false, requires_date: false, display_order: 37 },
    { name: "Physio/Massage", category_name: "Health", subtype: "spending", icon: "💆", description: null, is_celebration: false, requires_date: false, display_order: 38 },
    { name: "Gym Membership", category_name: "Health", subtype: "bill", icon: "💪", description: null, is_celebration: false, requires_date: false, display_order: 39 },

    // Hobbies category (1 envelope)
    { name: "Sport/Dance", category_name: "Hobbies", subtype: "spending", icon: "🏉", description: null, is_celebration: false, requires_date: false, display_order: 40 },

    // Household category (13 envelopes)
    { name: "Rent/Board", category_name: "Household", subtype: "bill", icon: "🏠", description: null, is_celebration: false, requires_date: false, display_order: 41 },
    { name: "Rates", category_name: "Household", subtype: "bill", icon: "🏡", description: null, is_celebration: false, requires_date: false, display_order: 42 },
    { name: "Groceries", category_name: "Household", subtype: "spending", icon: "🛒", description: null, is_celebration: false, requires_date: false, display_order: 43 },
    { name: "Electricity", category_name: "Household", subtype: "bill", icon: "⚡", description: null, is_celebration: false, requires_date: false, display_order: 44 },
    { name: "Firewood", category_name: "Household", subtype: "spending", icon: "🔥", description: null, is_celebration: false, requires_date: false, display_order: 45 },
    { name: "Water", category_name: "Household", subtype: "bill", icon: "💧", description: null, is_celebration: false, requires_date: false, display_order: 46 },
    { name: "Pet Care", category_name: "Household", subtype: "spending", icon: "🐾", description: null, is_celebration: false, requires_date: false, display_order: 47 },
    { name: "Drycleaning", category_name: "Household", subtype: "spending", icon: "👔", description: null, is_celebration: false, requires_date: false, display_order: 48 },
    { name: "Parking", category_name: "Household", subtype: "spending", icon: "🅿️", description: null, is_celebration: false, requires_date: false, display_order: 49 },
    { name: "Household Supplies", category_name: "Household", subtype: "spending", icon: "🧹", description: null, is_celebration: false, requires_date: false, display_order: 50 },
    { name: "Home Maintenance", category_name: "Household", subtype: "savings", icon: "🔧", description: null, is_celebration: false, requires_date: false, display_order: 51 },
    { name: "Garden/Lawn", category_name: "Household", subtype: "savings", icon: "🌱", description: null, is_celebration: false, requires_date: false, display_order: 52 },
    { name: "Technology/Electronics", category_name: "Household", subtype: "savings", icon: "💻", description: null, is_celebration: false, requires_date: false, display_order: 53 },

    // Insurance category (6 envelopes)
    { name: "Car Insurance", category_name: "Insurance", subtype: "bill", icon: "🚗", description: null, is_celebration: false, requires_date: false, display_order: 54 },
    { name: "Contents Insurance", category_name: "Insurance", subtype: "bill", icon: "🏠", description: null, is_celebration: false, requires_date: false, display_order: 55 },
    { name: "Health Insurance", category_name: "Insurance", subtype: "bill", icon: "🏥", description: null, is_celebration: false, requires_date: false, display_order: 56 },
    { name: "House Insurance", category_name: "Insurance", subtype: "bill", icon: "🏡", description: null, is_celebration: false, requires_date: false, display_order: 57 },
    { name: "Life & Mortgage Protection", category_name: "Insurance", subtype: "bill", icon: "👨‍👩‍👧", description: null, is_celebration: false, requires_date: false, display_order: 58 },
    { name: "Pet Insurance", category_name: "Insurance", subtype: "bill", icon: "🐕", description: null, is_celebration: false, requires_date: false, display_order: 59 },

    // Phone/Internet category (2 envelopes)
    { name: "Cellphone", category_name: "Phone/Internet", subtype: "bill", icon: "📱", description: null, is_celebration: false, requires_date: false, display_order: 60 },
    { name: "Internet", category_name: "Phone/Internet", subtype: "bill", icon: "🌐", description: null, is_celebration: false, requires_date: false, display_order: 61 },

    // School category (6 envelopes)
    { name: "School Fees", category_name: "School", subtype: "bill", icon: "🏫", description: null, is_celebration: false, requires_date: false, display_order: 62 },
    { name: "School Uniform", category_name: "School", subtype: "bill", icon: "👕", description: null, is_celebration: false, requires_date: false, display_order: 63 },
    { name: "School Stationery", category_name: "School", subtype: "bill", icon: "📝", description: null, is_celebration: false, requires_date: false, display_order: 64 },
    { name: "School Activities", category_name: "School", subtype: "bill", icon: "⚽", description: null, is_celebration: false, requires_date: false, display_order: 65 },
    { name: "School Photos", category_name: "School", subtype: "bill", icon: "📸", description: null, is_celebration: false, requires_date: false, display_order: 66 },
    { name: "School Donations", category_name: "School", subtype: "bill", icon: "💝", description: null, is_celebration: false, requires_date: false, display_order: 67 },

    // Subscriptions category (8 envelopes)
    { name: "Apple Storage", category_name: "Subscriptions", subtype: "bill", icon: "☁️", description: null, is_celebration: false, requires_date: false, display_order: 68 },
    { name: "Netflix", category_name: "Subscriptions", subtype: "bill", icon: "📺", description: null, is_celebration: false, requires_date: false, display_order: 69 },
    { name: "Sky TV", category_name: "Subscriptions", subtype: "bill", icon: "📺", description: null, is_celebration: false, requires_date: false, display_order: 70 },
    { name: "Spotify", category_name: "Subscriptions", subtype: "bill", icon: "🎵", description: null, is_celebration: false, requires_date: false, display_order: 71 },
    { name: "Disney", category_name: "Subscriptions", subtype: "bill", icon: "🎬", description: null, is_celebration: false, requires_date: false, display_order: 72 },
    { name: "Neon", category_name: "Subscriptions", subtype: "bill", icon: "📺", description: null, is_celebration: false, requires_date: false, display_order: 73 },
    { name: "Gaming", category_name: "Subscriptions", subtype: "bill", icon: "🎮", description: null, is_celebration: false, requires_date: false, display_order: 74 },
    { name: "My Budget Mate", category_name: "Subscriptions", subtype: "bill", icon: "✨", description: null, is_celebration: false, requires_date: false, display_order: 75 },

    // Vehicles category (5 envelopes)
    { name: "Petrol", category_name: "Vehicles", subtype: "bill", icon: "⛽", description: null, is_celebration: false, requires_date: false, display_order: 76 },
    { name: "Maintenance", category_name: "Vehicles", subtype: "savings", icon: "🔧", description: null, is_celebration: false, requires_date: false, display_order: 77 },
    { name: "Registration", category_name: "Vehicles", subtype: "bill", icon: "📋", description: null, is_celebration: false, requires_date: false, display_order: 78 },
    { name: "WOF", category_name: "Vehicles", subtype: "bill", icon: "✅", description: null, is_celebration: false, requires_date: false, display_order: 79 },
    { name: "Car Replacement Fund", category_name: "Vehicles", subtype: "goal", icon: "🚙", description: null, is_celebration: false, requires_date: false, display_order: 80 },
  ];

  // Insert in batches
  const batchSize = 20;
  let inserted = 0;

  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from("envelope_templates")
      .insert(batch);

    if (insertError) {
      console.error(`Insert error at batch ${i / batchSize + 1}:`, insertError.message);
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} templates`);
    }
  }

  // Verify
  const { data: count, error: countError } = await supabase
    .from("envelope_templates")
    .select("id", { count: "exact" });

  console.log(`\n✅ Migration complete! Total templates in database: ${count?.length || 0}`);

  // Show category breakdown
  const { data: categories } = await supabase
    .from("envelope_templates")
    .select("category_name");

  if (categories) {
    const breakdown = {};
    categories.forEach(c => {
      breakdown[c.category_name] = (breakdown[c.category_name] || 0) + 1;
    });
    console.log("\nCategory breakdown:");
    Object.entries(breakdown)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([cat, cnt]) => console.log(`  ${cat}: ${cnt}`));
  }
}

runMigration().catch(console.error);
