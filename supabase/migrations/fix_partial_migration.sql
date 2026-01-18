-- Fix partial migration - only adds what's missing
-- Run this if you get "already exists" errors

-- ============================================================================
-- STEP 1: Add missing columns to existing tables
-- ============================================================================

-- Shopping lists icon
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🛒';

-- Todo lists columns
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📝';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'sage';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS shared_with_children UUID[] DEFAULT '{}';

-- Shopping items columns (for category system)
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS saved_product_id UUID;

-- ============================================================================
-- STEP 2: Enable RLS on tables that exist (safe to run multiple times)
-- ============================================================================

ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supermarket_category_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create trigger function and trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_shopping_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shopping_categories (parent_user_id, name, icon, default_sort_order) VALUES
    (NEW.id, 'Produce', '🥬', 1),
    (NEW.id, 'Bakery', '🍞', 2),
    (NEW.id, 'Deli', '🥓', 3),
    (NEW.id, 'Meat', '🥩', 4),
    (NEW.id, 'Seafood', '🐟', 5),
    (NEW.id, 'Dairy', '🧀', 6),
    (NEW.id, 'Frozen', '🧊', 7),
    (NEW.id, 'Pantry', '🥫', 8),
    (NEW.id, 'Snacks', '🍿', 9),
    (NEW.id, 'Beverages', '🥤', 10),
    (NEW.id, 'Health & Beauty', '💊', 11),
    (NEW.id, 'Cleaning', '🧹', 12),
    (NEW.id, 'Baby', '👶', 13),
    (NEW.id, 'Pet', '🐕', 14),
    (NEW.id, 'Other', '📦', 99);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_shopping_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_shopping_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shopping_categories();

-- ============================================================================
-- STEP 4: Seed categories for existing users
-- ============================================================================

INSERT INTO shopping_categories (parent_user_id, name, icon, default_sort_order)
SELECT u.id, cat.name, cat.icon, cat.sort_order
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Produce', '🥬', 1),
    ('Bakery', '🍞', 2),
    ('Deli', '🥓', 3),
    ('Meat', '🥩', 4),
    ('Seafood', '🐟', 5),
    ('Dairy', '🧀', 6),
    ('Frozen', '🧊', 7),
    ('Pantry', '🥫', 8),
    ('Snacks', '🍿', 9),
    ('Beverages', '🥤', 10),
    ('Health & Beauty', '💊', 11),
    ('Cleaning', '🧹', 12),
    ('Baby', '👶', 13),
    ('Pet', '🐕', 14),
    ('Other', '📦', 99)
) AS cat(name, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM shopping_categories sc WHERE sc.parent_user_id = u.id
)
ON CONFLICT (parent_user_id, name) DO NOTHING;

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'Migration complete!' as status;
