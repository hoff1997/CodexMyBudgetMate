-- ============================================================================
-- CHORE TEMPLATE RULES & AUTO-APPROVE
-- Migration: 0065_chore_template_rules.sql
-- ============================================================================
-- Adds fields for controlling:
-- 1. How often a chore can be done per week (max_per_week)
-- 2. Which days the chore is available (allowed_days)
-- 3. Whether the chore auto-approves (auto_approve)
-- 4. Additional age recommendations (estimated_minutes, recommended_age)
-- ============================================================================

-- Add max_per_week - limits how often a chore can be claimed per week
-- e.g., "vacuum room" can only be done once/week even if marked as Extra
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS max_per_week INTEGER DEFAULT NULL;

COMMENT ON COLUMN chore_templates.max_per_week IS 'Maximum times this chore can be assigned/completed per week. NULL means unlimited.';

-- Add allowed_days - array of days when chore is available (0=Mon, 6=Sun)
-- e.g., [5, 6] means chore only available on Sat/Sun
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS allowed_days INTEGER[];

COMMENT ON COLUMN chore_templates.allowed_days IS 'Array of day indices (0=Mon, 6=Sun) when this chore is available. NULL means every day.';

-- Add auto_approve - chores like "make bed" don't need parent approval
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;

COMMENT ON COLUMN chore_templates.auto_approve IS 'If true, chore is automatically approved when marked done (no parent review needed).';

-- Add estimated_minutes if not exists (for time tracking)
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

COMMENT ON COLUMN chore_templates.estimated_minutes IS 'Estimated time in minutes to complete this chore.';

-- Add recommended_age_min and recommended_age_max if not exists
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS recommended_age_min INTEGER;

ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS recommended_age_max INTEGER;

COMMENT ON COLUMN chore_templates.recommended_age_min IS 'Minimum recommended age for this chore.';
COMMENT ON COLUMN chore_templates.recommended_age_max IS 'Maximum recommended age for this chore.';

-- Update preset chores with sensible defaults for the new fields
-- Expected daily chores should auto-approve
UPDATE chore_templates
SET auto_approve = true
WHERE is_expected = true
  AND name IN ('Make bed', 'Get dressed', 'Brush teeth', 'Pack school bag', 'Put dirty clothes in hamper');

-- Weekly chores should have max_per_week = 1
UPDATE chore_templates
SET max_per_week = 1
WHERE name IN ('Vacuum room', 'Clean bedroom', 'Mow lawn', 'Wash car', 'Deep clean bathroom');

-- Weekend-only chores
UPDATE chore_templates
SET allowed_days = ARRAY[5, 6]
WHERE name IN ('Wash car', 'Mow lawn', 'Yard work');
