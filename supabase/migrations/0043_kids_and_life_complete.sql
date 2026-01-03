-- ============================================================================
-- My Budget Mate Kids + Life - Complete Schema
-- Migration: 0043_kids_and_life_complete.sql
-- ============================================================================

-- ============================================================================
-- KIDS SYSTEM
-- ============================================================================

-- Child profiles under parent accounts
CREATE TABLE child_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  avatar_url TEXT,
  family_access_code TEXT NOT NULL, -- e.g., "HOFF-2025"
  pin_hash TEXT NOT NULL, -- Bcrypt hashed 4-digit PIN
  money_mode TEXT CHECK (money_mode IN ('virtual', 'real_accounts')) DEFAULT 'virtual',
  distribution_spend_pct INTEGER DEFAULT 50,
  distribution_save_pct INTEGER DEFAULT 20,
  distribution_invest_pct INTEGER DEFAULT 20,
  distribution_give_pct INTEGER DEFAULT 10,
  star_balance INTEGER DEFAULT 0,
  screen_time_balance INTEGER DEFAULT 0, -- Minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_profiles_parent ON child_profiles(parent_user_id);
CREATE INDEX idx_child_profiles_access_code ON child_profiles(family_access_code);

-- Feature access control per child
CREATE TABLE child_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL, -- 'recipes', 'shopping_list', 'create_todos'
  has_access BOOLEAN DEFAULT false,
  UNIQUE(child_profile_id, feature_name)
);

-- Kids' bank accounts (Akahu integration or virtual)
CREATE TABLE child_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  envelope_type TEXT CHECK (envelope_type IN ('spend', 'save', 'invest', 'give')) NOT NULL,
  akahu_account_id TEXT, -- NULL if virtual
  account_name TEXT,
  current_balance NUMERIC(10,2) DEFAULT 0,
  is_virtual BOOLEAN DEFAULT true,
  opening_balance NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_child_bank_accounts_child ON child_bank_accounts(child_profile_id);

-- Chore templates (presets + custom)
CREATE TABLE chore_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'fortnightly', 'monthly', 'one_off')) DEFAULT 'weekly',
  currency_type TEXT CHECK (currency_type IN ('money', 'screen_time', 'stars')) DEFAULT 'stars',
  currency_amount NUMERIC(10,2) DEFAULT 0,
  category TEXT, -- 'kitchen', 'bedroom', 'bathroom', 'pets', 'outdoors', etc.
  icon TEXT, -- Emoji
  is_preset BOOLEAN DEFAULT false, -- System preset vs user custom
  rotation_eligible BOOLEAN DEFAULT false, -- Can be auto-rotated among kids
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chore_templates_parent ON chore_templates(parent_user_id);
CREATE INDEX idx_chore_templates_preset ON chore_templates(is_preset);

-- Weekly chore assignments
CREATE TABLE chore_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chore_template_id UUID NOT NULL REFERENCES chore_templates(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL, -- Monday of the week
  status TEXT CHECK (status IN ('pending', 'done', 'approved', 'rejected')) DEFAULT 'pending',
  marked_done_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chore_assignments_child ON chore_assignments(child_profile_id);
CREATE INDEX idx_chore_assignments_week ON chore_assignments(week_starting);
CREATE INDEX idx_chore_assignments_status ON chore_assignments(status);

-- Chore rotation schedules
CREATE TABLE chore_rotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chore_template_id UUID NOT NULL REFERENCES chore_templates(id) ON DELETE CASCADE,
  child_profile_ids UUID[] NOT NULL, -- Ordered array of kids in rotation
  current_index INTEGER DEFAULT 0, -- Which kid's turn (index in array)
  rotation_frequency TEXT CHECK (rotation_frequency IN ('weekly', 'fortnightly', 'monthly')) DEFAULT 'weekly',
  next_assignment_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chore_rotations_parent ON chore_rotations(parent_user_id);
CREATE INDEX idx_chore_rotations_active ON chore_rotations(is_active);

-- Parent invoice (owed to kids)
CREATE TABLE parent_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  chore_assignment_id UUID REFERENCES chore_assignments(id),
  amount NUMERIC(10,2) NOT NULL,
  currency_type TEXT CHECK (currency_type IN ('money', 'screen_time', 'stars')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_invoices_child ON parent_invoices(child_profile_id);
CREATE INDEX idx_parent_invoices_status ON parent_invoices(status);

-- Star transactions log
CREATE TABLE star_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Can be negative (spent)
  source TEXT NOT NULL, -- 'chore_completion', 'achievement', 'shop_purchase', 'parent_bonus'
  reference_id UUID, -- ID of chore/item/achievement
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_star_transactions_child ON star_transactions(child_profile_id);

-- Screen time transactions
CREATE TABLE screen_time_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL, -- Can be negative (spent)
  source TEXT NOT NULL, -- 'chore_completion', 'parent_request', 'parent_approval'
  chore_assignment_id UUID REFERENCES chore_assignments(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screen_time_transactions_child ON screen_time_transactions(child_profile_id);

-- Screen time requests (kid requests, parent approves)
CREATE TABLE screen_time_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  minutes_requested INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  approved_minutes INTEGER, -- Parent can approve less
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screen_time_requests_child ON screen_time_requests(child_profile_id);
CREATE INDEX idx_screen_time_requests_status ON screen_time_requests(status);

-- Avatar shop items
CREATE TABLE avatar_shop_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT CHECK (category IN ('avatar', 'clothing', 'room', 'pet', 'accessory', 'theme')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  star_cost INTEGER NOT NULL,
  tier INTEGER DEFAULT 1, -- 1-4 for progression
  unlock_requirement TEXT, -- e.g., "Complete 20 chores"
  is_preset BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id), -- NULL if preset
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_avatar_shop_items_category ON avatar_shop_items(category);
CREATE INDEX idx_avatar_shop_items_tier ON avatar_shop_items(tier);

-- Child's purchased items
CREATE TABLE child_avatar_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES avatar_shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_profile_id, shop_item_id)
);

CREATE INDEX idx_child_avatar_inventory_child ON child_avatar_inventory(child_profile_id);

-- Child's room customization
CREATE TABLE child_room_layout (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  equipped_avatar_id UUID REFERENCES avatar_shop_items(id),
  equipped_clothing_ids UUID[], -- Array of clothing item IDs
  room_item_placements JSONB, -- {item_id: {x, y, rotation}}
  equipped_pet_id UUID REFERENCES avatar_shop_items(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_profile_id)
);

-- Achievement definitions (for bonus stars)
CREATE TABLE kid_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL, -- 'perfect_week', 'early_bird', etc.
  name TEXT NOT NULL,
  description TEXT,
  bonus_stars INTEGER NOT NULL,
  icon TEXT,
  unlock_requirement TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Achievement unlocks per child
CREATE TABLE child_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL REFERENCES kid_achievements(key),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_profile_id, achievement_key)
);

-- ============================================================================
-- LIFE SYSTEM - TO-DO LISTS
-- ============================================================================

CREATE TABLE todo_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todo_lists_parent ON todo_lists(parent_user_id);

CREATE TABLE todo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_list_id UUID NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  assigned_to_id UUID, -- NULL = family-wide, else child_profile_id or user_id
  assigned_to_type TEXT CHECK (assigned_to_type IN ('parent', 'child', 'family')),
  completed_by_id UUID,
  completed_by_type TEXT CHECK (completed_by_type IN ('parent', 'child')),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todo_items_list ON todo_items(todo_list_id);
CREATE INDEX idx_todo_items_assigned ON todo_items(assigned_to_id);

-- ============================================================================
-- LIFE SYSTEM - SHOPPING LISTS
-- ============================================================================

CREATE TABLE supermarkets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aisle_structure JSONB NOT NULL, -- [{name: "Produce", sort: 1}, {name: "Aisle 1", sort: 2}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supermarkets_parent ON supermarkets(parent_user_id);

CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supermarket_id UUID REFERENCES supermarkets(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_lists_parent ON shopping_lists(parent_user_id);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  aisle_name TEXT, -- Auto-remembered
  quantity TEXT,
  is_checked BOOLEAN DEFAULT false,
  added_by_id UUID,
  added_by_type TEXT CHECK (added_by_type IN ('parent', 'child')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_items_list ON shopping_items(shopping_list_id);

-- Item aisle memory (learns where items go)
CREATE TABLE item_aisle_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supermarket_id UUID NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  aisle_name TEXT NOT NULL,
  use_count INTEGER DEFAULT 1, -- Increment each time item added
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, supermarket_id, item_text)
);

CREATE INDEX idx_item_aisle_mappings_supermarket ON item_aisle_mappings(supermarket_id);

-- ============================================================================
-- LIFE SYSTEM - RECIPES
-- ============================================================================

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('typed', 'link')) NOT NULL,

  -- For typed recipes
  ingredients JSONB, -- [{item: "flour", amount: "2 cups"}]
  instructions TEXT,
  servings INTEGER,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,

  -- For link recipes
  source_url TEXT,
  scraped_data JSONB, -- Stored scraped content

  -- Common fields
  image_url TEXT,
  tags TEXT[], -- ['quick', 'vegetarian', 'kid-friendly']
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_parent ON recipes(parent_user_id);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite);

-- ============================================================================
-- LIFE SYSTEM - MEAL PLANNING
-- ============================================================================

CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT DEFAULT 'dinner', -- Future: 'breakfast', 'lunch', 'dinner'
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  meal_name TEXT, -- If no recipe linked
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, date, meal_type)
);

CREATE INDEX idx_meal_plans_parent ON meal_plans(parent_user_id);
CREATE INDEX idx_meal_plans_date ON meal_plans(date);

-- Meal plan templates (repeating cycles)
CREATE TABLE meal_plan_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_type TEXT CHECK (cycle_type IN ('weekly', 'fortnightly', 'monthly')) DEFAULT 'weekly',
  template_data JSONB NOT NULL, -- [{day_offset: 0, meal_type: 'dinner', recipe_id: 'xxx', meal_name: 'Tacos'}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_plan_templates_parent ON meal_plan_templates(parent_user_id);

-- ============================================================================
-- LIFE SYSTEM - HOUSEHOLD HUB / CALENDAR
-- ============================================================================

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_calendar_id TEXT NOT NULL, -- e.g., "emma.hoff@gmail.com"
  calendar_name TEXT NOT NULL,
  owner_name TEXT NOT NULL, -- "Emma", "Sarah", etc.
  color_hex TEXT DEFAULT '#6B9ECE',
  is_visible BOOLEAN DEFAULT true,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, google_calendar_id)
);

CREATE INDEX idx_calendar_connections_parent ON calendar_connections(parent_user_id);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  attendees JSONB,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(google_event_id)
);

CREATE INDEX idx_calendar_events_connection ON calendar_events(calendar_connection_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);

-- ============================================================================
-- ACCESS CONTROL
-- ============================================================================

CREATE TABLE feature_beta_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT UNIQUE NOT NULL,
  invite_code TEXT UNIQUE,
  user_type TEXT CHECK (user_type IN ('adult', 'child')) DEFAULT 'adult',
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_beta_access_email ON feature_beta_access(user_email);

-- Seed initial beta user
INSERT INTO feature_beta_access (user_email, user_type) VALUES ('hoff1997@gmail.com', 'adult');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_avatar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_room_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE kid_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_aisle_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_beta_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Child Profiles: Parent owns data
CREATE POLICY "Parents can manage their children"
  ON child_profiles FOR ALL
  USING (parent_user_id = auth.uid());

-- Child Feature Access: Parent owns data
CREATE POLICY "Parents can manage child feature access"
  ON child_feature_access FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Child Bank Accounts: Parent owns data
CREATE POLICY "Parents can manage child bank accounts"
  ON child_bank_accounts FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Chore Templates: Parent owns custom, everyone can read presets
CREATE POLICY "Parents can manage chore templates"
  ON chore_templates FOR ALL
  USING (parent_user_id = auth.uid() OR is_preset = true);

CREATE POLICY "Anyone can read preset chore templates"
  ON chore_templates FOR SELECT
  USING (is_preset = true);

-- Chore Assignments: Parent owns data
CREATE POLICY "Parents can manage chore assignments"
  ON chore_assignments FOR ALL
  USING (parent_user_id = auth.uid());

-- Chore Rotations: Parent owns data
CREATE POLICY "Parents can manage chore rotations"
  ON chore_rotations FOR ALL
  USING (parent_user_id = auth.uid());

-- Parent Invoices: Parent owns data
CREATE POLICY "Parents can manage invoices"
  ON parent_invoices FOR ALL
  USING (parent_user_id = auth.uid());

-- Star Transactions: Parent owns via child
CREATE POLICY "Parents can view star transactions"
  ON star_transactions FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Screen Time Transactions: Parent owns via child
CREATE POLICY "Parents can manage screen time transactions"
  ON screen_time_transactions FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Screen Time Requests: Parent owns via child
CREATE POLICY "Parents can manage screen time requests"
  ON screen_time_requests FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Avatar Shop Items: Everyone can read, only admins can create presets
CREATE POLICY "Anyone can read avatar shop items"
  ON avatar_shop_items FOR SELECT
  USING (true);

CREATE POLICY "Parents can create custom items"
  ON avatar_shop_items FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_preset = false);

-- Child Avatar Inventory: Parent owns via child
CREATE POLICY "Parents can manage child inventory"
  ON child_avatar_inventory FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Child Room Layout: Parent owns via child
CREATE POLICY "Parents can manage child room layout"
  ON child_room_layout FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Kid Achievements: Anyone can read
CREATE POLICY "Anyone can read kid achievements"
  ON kid_achievements FOR SELECT
  USING (true);

-- Child Achievements: Parent owns via child
CREATE POLICY "Parents can manage child achievements"
  ON child_achievements FOR ALL
  USING (
    child_profile_id IN (
      SELECT id FROM child_profiles WHERE parent_user_id = auth.uid()
    )
  );

-- Todo Lists: Parent owns data
CREATE POLICY "Parents can manage todo lists"
  ON todo_lists FOR ALL
  USING (parent_user_id = auth.uid());

-- Todo Items: Parent owns via list
CREATE POLICY "Parents can manage todo items"
  ON todo_items FOR ALL
  USING (
    todo_list_id IN (
      SELECT id FROM todo_lists WHERE parent_user_id = auth.uid()
    )
  );

-- Supermarkets: Parent owns data
CREATE POLICY "Parents can manage supermarkets"
  ON supermarkets FOR ALL
  USING (parent_user_id = auth.uid());

-- Shopping Lists: Parent owns data
CREATE POLICY "Parents can manage shopping lists"
  ON shopping_lists FOR ALL
  USING (parent_user_id = auth.uid());

-- Shopping Items: Parent owns via list
CREATE POLICY "Parents can manage shopping items"
  ON shopping_items FOR ALL
  USING (
    shopping_list_id IN (
      SELECT id FROM shopping_lists WHERE parent_user_id = auth.uid()
    )
  );

-- Item Aisle Mappings: Parent owns data
CREATE POLICY "Parents can manage item aisle mappings"
  ON item_aisle_mappings FOR ALL
  USING (parent_user_id = auth.uid());

-- Recipes: Parent owns data
CREATE POLICY "Parents can manage recipes"
  ON recipes FOR ALL
  USING (parent_user_id = auth.uid());

-- Meal Plans: Parent owns data
CREATE POLICY "Parents can manage meal plans"
  ON meal_plans FOR ALL
  USING (parent_user_id = auth.uid());

-- Meal Plan Templates: Parent owns data
CREATE POLICY "Parents can manage meal plan templates"
  ON meal_plan_templates FOR ALL
  USING (parent_user_id = auth.uid());

-- Calendar Connections: Parent owns data
CREATE POLICY "Parents can manage calendar connections"
  ON calendar_connections FOR ALL
  USING (parent_user_id = auth.uid());

-- Calendar Events: Parent owns via connection
CREATE POLICY "Parents can manage calendar events"
  ON calendar_events FOR ALL
  USING (
    calendar_connection_id IN (
      SELECT id FROM calendar_connections WHERE parent_user_id = auth.uid()
    )
  );

-- Feature Beta Access: Users can check their own access
CREATE POLICY "Users can check their beta access"
  ON feature_beta_access FOR SELECT
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================================================
-- SEED DEFAULT CHORE TEMPLATES (Presets)
-- ============================================================================

INSERT INTO chore_templates (name, description, frequency, currency_type, currency_amount, category, icon, is_preset, rotation_eligible) VALUES
-- Kitchen Chores
('Empty Dishwasher', 'Unload clean dishes and put them away properly', 'daily', 'stars', 10, 'kitchen', '🍽️', true, true),
('Load Dishwasher', 'Rinse and load dirty dishes into dishwasher', 'daily', 'stars', 10, 'kitchen', '🫧', true, true),
('Wipe Kitchen Benches', 'Clean and sanitize all kitchen countertops', 'daily', 'stars', 5, 'kitchen', '✨', true, true),
('Set the Table', 'Place plates, cutlery, and glasses for meal', 'daily', 'stars', 5, 'kitchen', '🍴', true, true),
('Clear the Table', 'Remove dishes and wipe down after meal', 'daily', 'stars', 5, 'kitchen', '🧹', true, true),
('Take Out Rubbish', 'Empty rubbish bins and replace bags', 'weekly', 'stars', 15, 'kitchen', '🗑️', true, true),
('Take Out Recycling', 'Sort and take out recycling bins', 'weekly', 'stars', 15, 'kitchen', '♻️', true, true),

-- Bedroom Chores
('Make Your Bed', 'Make bed neatly with pillows arranged', 'daily', 'stars', 5, 'bedroom', '🛏️', true, false),
('Tidy Your Room', 'Put away clothes, toys, and belongings', 'daily', 'stars', 10, 'bedroom', '🧸', true, false),
('Vacuum Your Room', 'Vacuum floor and under furniture', 'weekly', 'stars', 20, 'bedroom', '🧹', true, false),
('Change Bed Sheets', 'Strip bed and put on fresh sheets', 'fortnightly', 'stars', 25, 'bedroom', '🛌', true, false),

-- Bathroom Chores
('Clean Bathroom Sink', 'Wipe and sanitize bathroom sink', 'weekly', 'stars', 15, 'bathroom', '🚿', true, true),
('Clean Toilet', 'Clean and sanitize toilet inside and out', 'weekly', 'stars', 20, 'bathroom', '🚽', true, true),
('Hang Up Towels', 'Hang towels properly on rack', 'daily', 'stars', 5, 'bathroom', '🧺', true, false),

-- Pet Chores
('Feed Pets', 'Give pets their food and fresh water', 'daily', 'stars', 10, 'pets', '🐕', true, true),
('Walk the Dog', 'Take dog for a walk around the block', 'daily', 'stars', 20, 'pets', '🦮', true, true),
('Clean Pet Area', 'Clean pet bed, litter box, or cage', 'weekly', 'stars', 25, 'pets', '🐱', true, true),

-- Outdoor Chores
('Water Plants', 'Water indoor and outdoor plants', 'weekly', 'stars', 15, 'outdoors', '🌱', true, true),
('Bring in Washing', 'Collect dry laundry from clothesline', 'daily', 'stars', 10, 'outdoors', '👕', true, true),
('Sweep Porch/Deck', 'Sweep outdoor porch or deck area', 'weekly', 'stars', 15, 'outdoors', '🍂', true, true),

-- General Chores
('Fold Laundry', 'Fold clean clothes neatly', 'weekly', 'stars', 15, 'general', '👔', true, true),
('Put Away Groceries', 'Unpack and organize groceries', 'weekly', 'stars', 15, 'general', '🛒', true, true),
('Dust Surfaces', 'Dust furniture and shelves', 'weekly', 'stars', 15, 'general', '🪶', true, true);

-- ============================================================================
-- SEED KID ACHIEVEMENTS
-- ============================================================================

INSERT INTO kid_achievements (key, name, description, bonus_stars, icon, unlock_requirement) VALUES
('perfect_week', 'Perfect Week', 'Complete all assigned chores for an entire week', 50, '🏆', 'all_chores_completed_7_days'),
('early_bird', 'Early Bird', 'Complete a chore before 9am', 10, '🌅', 'chore_before_9am'),
('streak_7', 'Week Warrior', 'Complete at least one chore every day for 7 days', 30, '🔥', 'chores_7_day_streak'),
('streak_30', 'Monthly Master', 'Complete at least one chore every day for 30 days', 100, '⭐', 'chores_30_day_streak'),
('first_chore', 'Getting Started', 'Complete your first chore', 5, '🎉', 'first_chore_completed'),
('first_purchase', 'Savvy Shopper', 'Buy your first item from the avatar shop', 10, '🛍️', 'first_shop_purchase'),
('room_decorator', 'Room Decorator', 'Place 5 items in your room', 20, '🏠', 'room_items_5'),
('helping_hand', 'Helping Hand', 'Complete 50 chores total', 50, '🤝', 'chores_completed_50'),
('superstar', 'Superstar', 'Earn 500 stars total', 100, '💫', 'stars_earned_500'),
('money_manager', 'Money Manager', 'Save $50 in your Save envelope', 25, '💰', 'save_envelope_50');

-- ============================================================================
-- SEED AVATAR SHOP ITEMS
-- ============================================================================

-- Tier 1: Starter items (5-20 stars)
INSERT INTO avatar_shop_items (category, name, description, star_cost, tier, is_preset) VALUES
('avatar', 'Basic Blue Avatar', 'A friendly blue character', 5, 1, true),
('avatar', 'Basic Green Avatar', 'A cheerful green character', 5, 1, true),
('avatar', 'Basic Pink Avatar', 'A happy pink character', 5, 1, true),
('clothing', 'Red T-Shirt', 'A simple red t-shirt', 10, 1, true),
('clothing', 'Blue T-Shirt', 'A simple blue t-shirt', 10, 1, true),
('clothing', 'Green T-Shirt', 'A simple green t-shirt', 10, 1, true),
('accessory', 'Baseball Cap', 'A cool baseball cap', 15, 1, true),
('accessory', 'Sunglasses', 'Stylish shades', 15, 1, true),
('room', 'Basic Rug', 'A simple floor rug', 20, 1, true),
('room', 'Small Lamp', 'A cute desk lamp', 20, 1, true);

-- Tier 2: Intermediate items (25-50 stars)
INSERT INTO avatar_shop_items (category, name, description, star_cost, tier, is_preset) VALUES
('avatar', 'Cool Cat Avatar', 'A funky cat character', 30, 2, true),
('avatar', 'Sporty Dog Avatar', 'An athletic dog character', 30, 2, true),
('clothing', 'Hoodie', 'A cozy hoodie', 35, 2, true),
('clothing', 'Jeans', 'Classic blue jeans', 35, 2, true),
('clothing', 'Sneakers', 'Comfy sneakers', 40, 2, true),
('accessory', 'Headphones', 'Cool headphones', 40, 2, true),
('accessory', 'Backpack', 'A useful backpack', 45, 2, true),
('pet', 'Goldfish', 'A tiny swimming friend', 50, 2, true),
('room', 'Poster', 'A cool wall poster', 25, 2, true),
('room', 'Bookshelf', 'A small bookshelf', 45, 2, true);

-- Tier 3: Advanced items (60-100 stars)
INSERT INTO avatar_shop_items (category, name, description, star_cost, tier, is_preset) VALUES
('avatar', 'Ninja Avatar', 'A stealthy ninja character', 60, 3, true),
('avatar', 'Princess Avatar', 'A royal princess character', 60, 3, true),
('avatar', 'Robot Avatar', 'A mechanical robot character', 70, 3, true),
('clothing', 'Superhero Cape', 'A flowing superhero cape', 65, 3, true),
('clothing', 'Party Dress', 'A sparkly party dress', 70, 3, true),
('clothing', 'Formal Suit', 'A dapper formal suit', 70, 3, true),
('pet', 'Puppy', 'An adorable puppy companion', 80, 3, true),
('pet', 'Kitten', 'A playful kitten friend', 80, 3, true),
('room', 'Gaming Chair', 'An epic gaming chair', 75, 3, true),
('room', 'Bean Bag', 'A comfy bean bag', 60, 3, true),
('theme', 'Space Theme', 'A cosmic room theme', 100, 3, true),
('theme', 'Ocean Theme', 'An underwater room theme', 100, 3, true);

-- Tier 4: Premium items (150-300 stars)
INSERT INTO avatar_shop_items (category, name, description, star_cost, tier, is_preset) VALUES
('avatar', 'Dragon Rider Avatar', 'A legendary dragon rider', 150, 4, true),
('avatar', 'Space Explorer Avatar', 'An intergalactic explorer', 150, 4, true),
('avatar', 'Wizard Avatar', 'A magical wizard character', 175, 4, true),
('pet', 'Baby Dragon', 'A mythical baby dragon', 200, 4, true),
('pet', 'Unicorn', 'A magical unicorn friend', 200, 4, true),
('room', 'Treehouse', 'An amazing treehouse room', 250, 4, true),
('room', 'Spaceship', 'Your own spaceship room', 250, 4, true),
('theme', 'Rainbow Theme', 'A colorful rainbow theme', 175, 4, true),
('theme', 'Jungle Theme', 'A wild jungle adventure theme', 175, 4, true),
('accessory', 'Crown', 'A royal golden crown', 200, 4, true),
('accessory', 'Magic Wand', 'A powerful magic wand', 175, 4, true),
('clothing', 'Royal Robe', 'A majestic royal robe', 225, 4, true);
