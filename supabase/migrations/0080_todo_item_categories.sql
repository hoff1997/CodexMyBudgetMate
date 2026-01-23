-- Add category support to todo items
-- Allows grouping items within a list (e.g., packing list: Bathroom, Clothing, Food)

-- Add category column to todo_items
ALTER TABLE todo_items
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

COMMENT ON COLUMN todo_items.category IS 'Optional category for grouping items within a list (e.g., Bathroom, Clothing for packing lists)';

-- Create index for efficient category grouping
CREATE INDEX IF NOT EXISTS idx_todo_items_category ON todo_items(todo_list_id, category);
