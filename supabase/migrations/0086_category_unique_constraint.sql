-- Migration: Add unique constraint on envelope_categories to prevent duplicates
-- Description: Prevents duplicate category names per user

-- ============================================
-- 1. First, clean up any existing duplicates
-- Keep the oldest category (by id) for each name per user
-- ============================================
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, LOWER(name)
    ORDER BY created_at ASC, id ASC
  ) as row_num
  FROM envelope_categories
)
DELETE FROM envelope_categories
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- ============================================
-- 2. Add unique constraint (case-insensitive)
-- Using a functional unique index for case-insensitive matching
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_envelope_categories_user_name_unique
  ON envelope_categories(user_id, LOWER(name));

-- Add comment
COMMENT ON INDEX idx_envelope_categories_user_name_unique IS 'Prevents duplicate category names per user (case-insensitive)';
