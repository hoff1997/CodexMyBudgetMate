-- Add missing columns to shopping_lists and todo_lists
-- These columns are expected by the UI but were missing from the original migration

-- Add icon column to shopping_lists
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🛒';

-- Add icon and color columns to todo_lists
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📝';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'sage';

-- Add shared_with_children for todo_lists (used by the client)
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS shared_with_children UUID[] DEFAULT '{}';
