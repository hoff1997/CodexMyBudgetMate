-- ============================================================================
-- Update Kid Achievements to focus on real money management
-- Migration: 0050_update_kid_achievements.sql
-- ============================================================================

-- Add category column to kid_achievements for better organization
ALTER TABLE kid_achievements ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Deactivate avatar shop related achievements (keeping data, just hiding them)
UPDATE kid_achievements
SET is_active = false
WHERE key IN ('first_purchase', 'room_decorator', 'superstar');

-- Update descriptions to remove star references
UPDATE kid_achievements
SET description = 'Complete all assigned chores for an entire week'
WHERE key = 'perfect_week';

UPDATE kid_achievements
SET description = 'Complete a chore before 9am'
WHERE key = 'early_bird';

UPDATE kid_achievements
SET description = 'Complete at least one chore every day for 7 days'
WHERE key = 'streak_7';

UPDATE kid_achievements
SET description = 'Complete at least one chore every day for 30 days'
WHERE key = 'streak_30';

UPDATE kid_achievements
SET description = 'Complete your first chore'
WHERE key = 'first_chore';

UPDATE kid_achievements
SET description = 'Complete 50 chores total'
WHERE key = 'helping_hand';

UPDATE kid_achievements
SET description = 'Save $50 in your Save account'
WHERE key = 'money_manager';

-- Set bonus_stars to 0 for all achievements (no more virtual stars)
UPDATE kid_achievements SET bonus_stars = 0;

-- Add new real money focused achievements
INSERT INTO kid_achievements (key, name, description, bonus_stars, icon, unlock_requirement, category, is_active) VALUES
('first_save', 'First Saver', 'Make your first deposit to your Save account', 0, '🐷', 'first_save_deposit', 'savings', true),
('saver_10', 'Ten Dollar Saver', 'Save $10 in your Save account', 0, '💰', 'save_envelope_10', 'savings', true),
('saver_100', 'Hundred Club', 'Save $100 in your Save account', 0, '💎', 'save_envelope_100', 'savings', true),
('first_invest', 'Future Investor', 'Make your first deposit to your Invest account', 0, '📈', 'first_invest_deposit', 'investing', true),
('first_give', 'Generous Heart', 'Make your first donation from your Give account', 0, '💝', 'first_give_donation', 'giving', true),
('first_invoice', 'Invoice Pro', 'Submit your first invoice', 0, '📋', 'first_invoice_submitted', 'earning', true),
('invoice_paid', 'Payday!', 'Get your first invoice paid', 0, '🎉', 'first_invoice_paid', 'earning', true),
('invoice_100', 'Earned $100', 'Earn $100 total from paid invoices', 0, '💵', 'invoices_total_100', 'earning', true),
('goal_achieved', 'Goal Getter', 'Achieve your first savings goal', 0, '🎯', 'first_goal_achieved', 'savings', true),
('budget_balanced', 'Budget Boss', 'Allocate 100% of your income across your envelopes', 0, '⚖️', 'budget_fully_allocated', 'budgeting', true),
('streak_14', 'Two Week Streak', 'Complete at least one chore every day for 14 days', 0, '🔥', 'chores_14_day_streak', 'chores', true),
('streak_60', 'Sixty Day Champion', 'Complete at least one chore every day for 60 days', 0, '🏅', 'chores_60_day_streak', 'chores', true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bonus_stars = EXCLUDED.bonus_stars,
  icon = EXCLUDED.icon,
  unlock_requirement = EXCLUDED.unlock_requirement,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- Update existing achievements with categories
UPDATE kid_achievements SET category = 'chores' WHERE key IN ('perfect_week', 'early_bird', 'streak_7', 'streak_30', 'first_chore', 'helping_hand');
UPDATE kid_achievements SET category = 'savings' WHERE key = 'money_manager';
