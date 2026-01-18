-- STEP 1: Add missing columns to shopping_lists and todo_lists
-- Run this first

ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🛒';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📝';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'sage';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS shared_with_children UUID[] DEFAULT '{}';

SELECT 'Step 1 complete - list columns added!' as status;
