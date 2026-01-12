-- Migration: Add list_type to shopping_lists and notes to shopping_items
-- Purpose: Support different list types (basic, grocery, categorised) and item notes

-- Add list_type column to shopping_lists
-- Values: 'basic' (simple checklist), 'grocery' (auto-sort by aisle), 'categorised' (custom categories)
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS list_type TEXT DEFAULT 'grocery';

-- Add constraint to ensure valid list types
ALTER TABLE shopping_lists
ADD CONSTRAINT shopping_lists_list_type_check
CHECK (list_type IN ('basic', 'grocery', 'categorised'));

-- Add notes column to shopping_items for user notes like "get the blue one"
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add estimated_price column for grocery items
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN shopping_lists.list_type IS 'Type of list: basic (simple), grocery (auto-sort by aisle), categorised (custom categories)';
COMMENT ON COLUMN shopping_items.notes IS 'User notes for the item, e.g., "get the blue one"';
COMMENT ON COLUMN shopping_items.estimated_price IS 'Estimated price of the item in NZD';
