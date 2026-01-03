-- Migration: Update envelope templates for beta testing
-- Date: January 2026
-- Description: Updates envelope templates with new categories and envelopes from CSV

-- Clear existing envelope templates
DELETE FROM envelope_templates WHERE TRUE;

-- Insert updated templates from CSV (80 envelopes across 14 categories)
INSERT INTO envelope_templates (category, name, type, priority, is_default, icon, notes, sort_order)
VALUES
-- ========== BANK CATEGORY ==========
('Bank', 'Credit Card Holding', 'tracking', NULL, true, '💳', 'Tracks money set aside for credit card payments. Auto-created when credit cards enabled. Affects reconciliation: Available Cash = Bank Balance - CC Holding. Do not manually top up - system manages this automatically.', 1),
('Bank', 'Credit Card Historic Debt', 'goal', 'essential', false, '📊', 'Legacy credit card debt from before budgeting started. Part of debt payoff journey (separate from current CC spending). Pay down to zero as part of My Budget Way Step 2.', 2),
('Bank', 'Surplus', 'tracking', NULL, true, '💰', 'Special envelope for unallocated funds - auto-created by system', 3),
('Bank', 'Starter Stash', 'goal', 'essential', true, '🛡️', 'First $1000 emergency fund (My Budget Way Step 1)', 4),
('Bank', 'Safety Net', 'goal', 'essential', true, '🏦', '3 months essential expenses (My Budget Way Step 3)', 5),
('Bank', 'Kids Pocket Money', 'spending', 'important', false, '👧', NULL, 6),
('Bank', 'Work Bonus', 'tracking', NULL, false, '🎁', NULL, 7),
('Bank', 'Investing', 'savings', 'important', false, '📈', NULL, 8),
('Bank', 'IRD Refunds', 'tracking', NULL, false, '💵', NULL, 9),
('Bank', 'Reimbursements', 'tracking', NULL, false, '🔄', NULL, 10),
('Bank', 'Credit Card Fees', 'bill', 'essential', false, '💳', NULL, 11),
('Bank', 'Mortgage 1', 'bill', 'essential', false, '🏡', NULL, 12),
('Bank', 'Mortgage 2', 'bill', 'essential', false, '🏡', NULL, 13),

-- ========== CELEBRATIONS CATEGORY ==========
('Celebrations', 'Christmas', 'savings', 'flexible', false, '🎄', NULL, 14),
('Celebrations', 'Birthdays', 'savings', 'flexible', true, '🎂', NULL, 15),
('Celebrations', 'Easter', 'savings', 'flexible', false, '🐰', NULL, 16),
('Celebrations', 'Mother & Father''s Days', 'savings', 'flexible', false, '🌸', NULL, 17),
('Celebrations', 'Religious Festivals', 'savings', 'flexible', false, '🕯️', NULL, 18),

-- ========== CLOTHING CATEGORY ==========
('Clothing', 'Name 1 Clothing', 'spending', 'important', false, '👔', NULL, 19),
('Clothing', 'Name 2 Clothing', 'spending', 'important', false, '👗', NULL, 20),
('Clothing', 'Kid''s Clothing', 'spending', 'important', false, '👕', NULL, 21),

-- ========== EXTRAS CATEGORY ==========
('Extras', 'Fun Money', 'spending', 'flexible', true, '🎉', NULL, 22),
('Extras', 'Name 1 Personal', 'spending', 'flexible', false, '🛍️', NULL, 23),
('Extras', 'Name 2 Personal', 'spending', 'flexible', false, '🛍️', NULL, 24),
('Extras', 'Eyebrows', 'spending', 'flexible', false, '✨', NULL, 25),
('Extras', 'Takeaways/Restaurants', 'spending', 'flexible', true, '🍽️', NULL, 26),
('Extras', 'Holidays', 'goal', 'important', false, '✈️', NULL, 27),
('Extras', 'Books/Learning', 'spending', 'flexible', false, '📚', NULL, 28),

-- ========== GIVING CATEGORY ==========
('Giving', 'Donations', 'spending', 'flexible', false, '❤️', NULL, 29),
('Giving', 'Gifts (General/Not Birthdays)', 'savings', 'important', false, '🎁', NULL, 30),

-- ========== HAIR CATEGORY ==========
('Hair', 'Name 1 Hair', 'spending', 'important', false, '💇', NULL, 31),
('Hair', 'Name 2 Hair', 'spending', 'important', false, '💇‍♀️', NULL, 32),
('Hair', 'Kid''s Hair', 'spending', 'important', false, '💇‍♀️', NULL, 33),

-- ========== HEALTH CATEGORY ==========
('Health', 'Medication', 'spending', 'essential', false, '💊', NULL, 34),
('Health', 'GP/Medical', 'spending', 'essential', false, '🏥', NULL, 35),
('Health', 'Dentist', 'spending', 'essential', false, '🦷', NULL, 36),
('Health', 'Glasses/Optometrist', 'savings', 'important', false, '👓', NULL, 37),
('Health', 'Physio/Massage', 'spending', 'important', false, '💆', NULL, 38),
('Health', 'Gym Membership', 'bill', 'important', false, '💪', NULL, 39),

-- ========== HOBBIES CATEGORY ==========
('Hobbies', 'Sport/Dance', 'spending', 'important', false, '🏉', NULL, 40),

-- ========== HOUSEHOLD CATEGORY ==========
('Household', 'Rent/Board', 'bill', 'essential', false, '🏠', NULL, 41),
('Household', 'Rates', 'bill', 'essential', false, '🏡', NULL, 42),
('Household', 'Groceries', 'spending', 'essential', true, '🛒', NULL, 43),
('Household', 'Electricity', 'bill', 'essential', false, '⚡', NULL, 44),
('Household', 'Firewood', 'spending', 'essential', false, '🔥', NULL, 45),
('Household', 'Water', 'bill', 'essential', false, '💧', NULL, 46),
('Household', 'Pet Care', 'spending', 'important', false, '🐾', NULL, 47),
('Household', 'Drycleaning', 'spending', 'flexible', false, '👔', NULL, 48),
('Household', 'Parking', 'spending', 'important', false, '🅿️', NULL, 49),
('Household', 'Household Supplies', 'spending', 'important', false, '🧹', NULL, 50),
('Household', 'Home Maintenance', 'savings', 'essential', false, '🔧', NULL, 51),
('Household', 'Garden/Lawn', 'savings', 'important', false, '🌱', NULL, 52),
('Household', 'Technology/Electronics', 'savings', 'important', false, '💻', NULL, 53),

-- ========== INSURANCE CATEGORY ==========
('Insurance', 'Car Insurance', 'bill', 'essential', false, '🚗', NULL, 54),
('Insurance', 'Contents Insurance', 'bill', 'essential', false, '🏠', NULL, 55),
('Insurance', 'Health Insurance', 'bill', 'essential', false, '🏥', NULL, 56),
('Insurance', 'House Insurance', 'bill', 'essential', false, '🏡', NULL, 57),
('Insurance', 'Life & Mortgage Protection', 'bill', 'essential', false, '👨‍👩‍👧', NULL, 58),
('Insurance', 'Pet Insurance', 'bill', 'important', false, '🐕', NULL, 59),

-- ========== PHONE/INTERNET CATEGORY ==========
('Phone/Internet', 'Cellphone', 'bill', 'essential', false, '📱', NULL, 60),
('Phone/Internet', 'Internet', 'bill', 'essential', false, '🌐', NULL, 61),

-- ========== SCHOOL CATEGORY ==========
('School', 'School Fees', 'bill', 'essential', false, '🏫', NULL, 62),
('School', 'School Uniform', 'bill', 'important', false, '👕', NULL, 63),
('School', 'School Stationery', 'bill', 'important', false, '📝', NULL, 64),
('School', 'School Activities', 'bill', 'important', false, '⚽', NULL, 65),
('School', 'School Photos', 'bill', 'flexible', false, '📸', NULL, 66),
('School', 'School Donations', 'bill', 'flexible', false, '💝', NULL, 67),

-- ========== SUBSCRIPTIONS CATEGORY ==========
('Subscriptions', 'Apple Storage', 'bill', 'flexible', false, '☁️', NULL, 68),
('Subscriptions', 'Netflix', 'bill', 'flexible', false, '📺', NULL, 69),
('Subscriptions', 'Sky TV', 'bill', 'flexible', false, '📺', NULL, 70),
('Subscriptions', 'Spotify', 'bill', 'flexible', false, '🎵', NULL, 71),
('Subscriptions', 'Disney', 'bill', 'flexible', false, '🎬', NULL, 72),
('Subscriptions', 'Neon', 'bill', 'flexible', false, '📺', NULL, 73),
('Subscriptions', 'Gaming', 'bill', 'flexible', false, '🎮', NULL, 74),
('Subscriptions', 'My Budget Mate', 'bill', 'important', true, '✨', NULL, 75),

-- ========== VEHICLES CATEGORY ==========
('Vehicles', 'Petrol', 'bill', 'essential', false, '⛽', NULL, 76),
('Vehicles', 'Maintenance', 'savings', 'essential', false, '🔧', NULL, 77),
('Vehicles', 'Registration', 'bill', 'essential', false, '📋', NULL, 78),
('Vehicles', 'WOF', 'bill', 'essential', false, '✅', NULL, 79),
('Vehicles', 'Car Replacement Fund', 'goal', 'important', false, '🚙', NULL, 80);

-- Verify templates loaded correctly
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
