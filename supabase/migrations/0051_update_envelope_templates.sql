-- Migration: Update envelope templates for beta testing
-- Date: January 2026
-- Description: Updates envelope templates with new categories and envelopes from CSV
-- Note: This migration modifies the envelope_templates table structure and data

-- =============================================================================
-- STEP 1: Add missing columns to envelope_templates table
-- =============================================================================

ALTER TABLE public.envelope_templates
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.envelope_templates
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE public.envelope_templates
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('essential', 'important', 'flexible') OR priority IS NULL);

ALTER TABLE public.envelope_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

ALTER TABLE public.envelope_templates
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.envelope_templates
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Migrate existing data: copy category_name to category, subtype to type
UPDATE public.envelope_templates
SET category = category_name,
    type = subtype
WHERE category IS NULL;

-- =============================================================================
-- STEP 2: Clear existing templates and insert new ones
-- =============================================================================

DELETE FROM public.envelope_templates WHERE TRUE;

-- Insert updated templates from CSV (80 envelopes across 14 categories)
INSERT INTO public.envelope_templates (name, category, type, priority, is_default, icon, notes, is_celebration, requires_date, sort_order)
VALUES
-- ========== BANK CATEGORY ==========
('Credit Card Holding', 'Bank', 'tracking', NULL, true, '💳', 'Tracks money set aside for credit card payments. Auto-created when credit cards enabled. Affects reconciliation: Available Cash = Bank Balance - CC Holding. Do not manually top up - system manages this automatically.', false, false, 1),
('Credit Card Historic Debt', 'Bank', 'goal', 'essential', false, '📊', 'Legacy credit card debt from before budgeting started. Part of debt payoff journey (separate from current CC spending). Pay down to zero as part of My Budget Way Step 2.', false, false, 2),
('Surplus', 'Bank', 'tracking', NULL, true, '💰', 'Special envelope for unallocated funds - auto-created by system', false, false, 3),
('Starter Stash', 'Bank', 'goal', 'essential', true, '🛡️', 'First $1000 emergency fund (My Budget Way Step 1)', false, false, 4),
('Safety Net', 'Bank', 'goal', 'essential', true, '🏦', '3 months essential expenses (My Budget Way Step 3)', false, false, 5),
('Kids Pocket Money', 'Bank', 'spending', 'important', false, '👧', NULL, false, false, 6),
('Work Bonus', 'Bank', 'tracking', NULL, false, '🎁', NULL, false, false, 7),
('Investing', 'Bank', 'savings', 'important', false, '📈', NULL, false, false, 8),
('IRD Refunds', 'Bank', 'tracking', NULL, false, '💵', NULL, false, false, 9),
('Reimbursements', 'Bank', 'tracking', NULL, false, '🔄', NULL, false, false, 10),
('Credit Card Fees', 'Bank', 'bill', 'essential', false, '💳', NULL, false, false, 11),
('Mortgage 1', 'Bank', 'bill', 'essential', false, '🏡', NULL, false, false, 12),
('Mortgage 2', 'Bank', 'bill', 'essential', false, '🏡', NULL, false, false, 13),

-- ========== CELEBRATIONS CATEGORY ==========
('Christmas', 'Celebrations', 'savings', 'flexible', false, '🎄', 'Budget for Christmas gifts and celebrations', true, false, 14),
('Birthdays', 'Celebrations', 'savings', 'flexible', true, '🎂', 'Budget for birthday gifts throughout the year', true, true, 15),
('Easter', 'Celebrations', 'savings', 'flexible', false, '🐰', 'Budget for Easter celebrations and gifts', true, false, 16),
('Mother & Father''s Days', 'Celebrations', 'savings', 'flexible', false, '🌸', NULL, true, false, 17),
('Religious Festivals', 'Celebrations', 'savings', 'flexible', false, '🕯️', 'Budget for religious celebrations (customise name later)', true, false, 18),

-- ========== CLOTHING CATEGORY ==========
('Name 1 Clothing', 'Clothing', 'spending', 'important', false, '👔', NULL, false, false, 19),
('Name 2 Clothing', 'Clothing', 'spending', 'important', false, '👗', NULL, false, false, 20),
('Kid''s Clothing', 'Clothing', 'spending', 'important', false, '👕', NULL, false, false, 21),

-- ========== EXTRAS CATEGORY ==========
('Fun Money', 'Extras', 'spending', 'flexible', true, '🎉', NULL, false, false, 22),
('Name 1 Personal', 'Extras', 'spending', 'flexible', false, '🛍️', NULL, false, false, 23),
('Name 2 Personal', 'Extras', 'spending', 'flexible', false, '🛍️', NULL, false, false, 24),
('Eyebrows', 'Extras', 'spending', 'flexible', false, '✨', NULL, false, false, 25),
('Takeaways/Restaurants', 'Extras', 'spending', 'flexible', true, '🍽️', NULL, false, false, 26),
('Holidays', 'Extras', 'goal', 'important', false, '✈️', NULL, false, false, 27),
('Books/Learning', 'Extras', 'spending', 'flexible', false, '📚', NULL, false, false, 28),

-- ========== GIVING CATEGORY ==========
('Donations', 'Giving', 'spending', 'flexible', false, '❤️', NULL, false, false, 29),
('Gifts (General/Not Birthdays)', 'Giving', 'savings', 'important', false, '🎁', NULL, false, false, 30),

-- ========== HAIR CATEGORY ==========
('Name 1 Hair', 'Hair', 'spending', 'important', false, '💇', NULL, false, false, 31),
('Name 2 Hair', 'Hair', 'spending', 'important', false, '💇‍♀️', NULL, false, false, 32),
('Kid''s Hair', 'Hair', 'spending', 'important', false, '💇‍♀️', NULL, false, false, 33),

-- ========== HEALTH CATEGORY ==========
('Medication', 'Health', 'spending', 'essential', false, '💊', NULL, false, false, 34),
('GP/Medical', 'Health', 'spending', 'essential', false, '🏥', NULL, false, false, 35),
('Dentist', 'Health', 'spending', 'essential', false, '🦷', NULL, false, false, 36),
('Glasses/Optometrist', 'Health', 'savings', 'important', false, '👓', NULL, false, false, 37),
('Physio/Massage', 'Health', 'spending', 'important', false, '💆', NULL, false, false, 38),
('Gym Membership', 'Health', 'bill', 'important', false, '💪', NULL, false, false, 39),

-- ========== HOBBIES CATEGORY ==========
('Sport/Dance', 'Hobbies', 'spending', 'important', false, '🏉', NULL, false, false, 40),

-- ========== HOUSEHOLD CATEGORY ==========
('Rent/Board', 'Household', 'bill', 'essential', false, '🏠', NULL, false, false, 41),
('Rates', 'Household', 'bill', 'essential', false, '🏡', NULL, false, false, 42),
('Groceries', 'Household', 'spending', 'essential', true, '🛒', NULL, false, false, 43),
('Electricity', 'Household', 'bill', 'essential', false, '⚡', NULL, false, false, 44),
('Firewood', 'Household', 'spending', 'essential', false, '🔥', NULL, false, false, 45),
('Water', 'Household', 'bill', 'essential', false, '💧', NULL, false, false, 46),
('Pet Care', 'Household', 'spending', 'important', false, '🐾', NULL, false, false, 47),
('Drycleaning', 'Household', 'spending', 'flexible', false, '👔', NULL, false, false, 48),
('Parking', 'Household', 'spending', 'important', false, '🅿️', NULL, false, false, 49),
('Household Supplies', 'Household', 'spending', 'important', false, '🧹', NULL, false, false, 50),
('Home Maintenance', 'Household', 'savings', 'essential', false, '🔧', NULL, false, false, 51),
('Garden/Lawn', 'Household', 'savings', 'important', false, '🌱', NULL, false, false, 52),
('Technology/Electronics', 'Household', 'savings', 'important', false, '💻', NULL, false, false, 53),

-- ========== INSURANCE CATEGORY ==========
('Car Insurance', 'Insurance', 'bill', 'essential', false, '🚗', NULL, false, false, 54),
('Contents Insurance', 'Insurance', 'bill', 'essential', false, '🏠', NULL, false, false, 55),
('Health Insurance', 'Insurance', 'bill', 'essential', false, '🏥', NULL, false, false, 56),
('House Insurance', 'Insurance', 'bill', 'essential', false, '🏡', NULL, false, false, 57),
('Life & Mortgage Protection', 'Insurance', 'bill', 'essential', false, '👨‍👩‍👧', NULL, false, false, 58),
('Pet Insurance', 'Insurance', 'bill', 'important', false, '🐕', NULL, false, false, 59),

-- ========== PHONE/INTERNET CATEGORY ==========
('Cellphone', 'Phone/Internet', 'bill', 'essential', false, '📱', NULL, false, false, 60),
('Internet', 'Phone/Internet', 'bill', 'essential', false, '🌐', NULL, false, false, 61),

-- ========== SCHOOL CATEGORY ==========
('School Fees', 'School', 'bill', 'essential', false, '🏫', NULL, false, false, 62),
('School Uniform', 'School', 'bill', 'important', false, '👕', NULL, false, false, 63),
('School Stationery', 'School', 'bill', 'important', false, '📝', NULL, false, false, 64),
('School Activities', 'School', 'bill', 'important', false, '⚽', NULL, false, false, 65),
('School Photos', 'School', 'bill', 'flexible', false, '📸', NULL, false, false, 66),
('School Donations', 'School', 'bill', 'flexible', false, '💝', NULL, false, false, 67),

-- ========== SUBSCRIPTIONS CATEGORY ==========
('Apple Storage', 'Subscriptions', 'bill', 'flexible', false, '☁️', NULL, false, false, 68),
('Netflix', 'Subscriptions', 'bill', 'flexible', false, '📺', NULL, false, false, 69),
('Sky TV', 'Subscriptions', 'bill', 'flexible', false, '📺', NULL, false, false, 70),
('Spotify', 'Subscriptions', 'bill', 'flexible', false, '🎵', NULL, false, false, 71),
('Disney', 'Subscriptions', 'bill', 'flexible', false, '🎬', NULL, false, false, 72),
('Neon', 'Subscriptions', 'bill', 'flexible', false, '📺', NULL, false, false, 73),
('Gaming', 'Subscriptions', 'bill', 'flexible', false, '🎮', NULL, false, false, 74),
('My Budget Mate', 'Subscriptions', 'bill', 'important', true, '✨', NULL, false, false, 75),

-- ========== VEHICLES CATEGORY ==========
('Petrol', 'Vehicles', 'bill', 'essential', false, '⛽', NULL, false, false, 76),
('Maintenance', 'Vehicles', 'savings', 'essential', false, '🔧', NULL, false, false, 77),
('Registration', 'Vehicles', 'bill', 'essential', false, '📋', NULL, false, false, 78),
('WOF', 'Vehicles', 'bill', 'essential', false, '✅', NULL, false, false, 79),
('Car Replacement Fund', 'Vehicles', 'goal', 'important', false, '🚙', NULL, false, false, 80);

-- =============================================================================
-- STEP 3: Verify templates loaded correctly
-- =============================================================================

DO $$
DECLARE
  template_count INTEGER;
  default_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM envelope_templates;
  SELECT COUNT(*) INTO default_count FROM envelope_templates WHERE is_default = true;

  RAISE NOTICE 'Loaded % envelope templates (% defaults)', template_count, default_count;

  IF template_count != 80 THEN
    RAISE WARNING 'Expected 80 templates, got %', template_count;
  END IF;
END $$;

-- Show category breakdown
SELECT category, COUNT(*) as count
FROM envelope_templates
GROUP BY category
ORDER BY MIN(sort_order);
