-- ============================================================================
-- COMPLETE SHOPPING & LIST MIGRATION
-- Creates all tables and adds all missing columns
-- Safe to run multiple times (uses IF NOT EXISTS everywhere)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to existing tables (these always work)
-- ============================================================================

-- Shopping lists icon
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🛒';

-- Todo lists columns
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📝';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'sage';
ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS shared_with_children UUID[] DEFAULT '{}';

-- ============================================================================
-- STEP 2: Create shopping_categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopping_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  default_sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_shopping_categories_parent ON shopping_categories(parent_user_id);

ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own shopping categories" ON shopping_categories;
DROP POLICY IF EXISTS "Users can insert their own shopping categories" ON shopping_categories;
DROP POLICY IF EXISTS "Users can update their own shopping categories" ON shopping_categories;
DROP POLICY IF EXISTS "Users can delete their own shopping categories" ON shopping_categories;

CREATE POLICY "Users can view their own shopping categories"
  ON shopping_categories FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE POLICY "Users can insert their own shopping categories"
  ON shopping_categories FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Users can update their own shopping categories"
  ON shopping_categories FOR UPDATE
  USING (parent_user_id = auth.uid());

CREATE POLICY "Users can delete their own shopping categories"
  ON shopping_categories FOR DELETE
  USING (parent_user_id = auth.uid());

-- ============================================================================
-- STEP 3: Create supermarket_category_orders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS supermarket_category_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supermarket_id UUID NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES shopping_categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(supermarket_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_category_orders ON supermarket_category_orders(supermarket_id);

ALTER TABLE supermarket_category_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage supermarket category orders" ON supermarket_category_orders;

CREATE POLICY "Users can manage supermarket category orders"
  ON supermarket_category_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM supermarkets s
      WHERE s.id = supermarket_category_orders.supermarket_id
      AND s.parent_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Create saved_products table
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
  default_quantity TEXT,
  typical_price DECIMAL(10, 2),
  price_unit TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_products_parent ON saved_products(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_products_name ON saved_products(parent_user_id, name);
CREATE INDEX IF NOT EXISTS idx_saved_products_category ON saved_products(category_id);

ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved products" ON saved_products;
DROP POLICY IF EXISTS "Users can insert their own saved products" ON saved_products;
DROP POLICY IF EXISTS "Users can update their own saved products" ON saved_products;
DROP POLICY IF EXISTS "Users can delete their own saved products" ON saved_products;

CREATE POLICY "Users can view their own saved products"
  ON saved_products FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE POLICY "Users can insert their own saved products"
  ON saved_products FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Users can update their own saved products"
  ON saved_products FOR UPDATE
  USING (parent_user_id = auth.uid());

CREATE POLICY "Users can delete their own saved products"
  ON saved_products FOR DELETE
  USING (parent_user_id = auth.uid());

-- ============================================================================
-- STEP 5: Add columns to shopping_items (after tables exist for FK refs)
-- ============================================================================

ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS saved_product_id UUID REFERENCES saved_products(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 6: Create trigger for new users
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
-- STEP 7: Seed categories for existing users
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
ON CONFLICT (parent_user_id, name) DO NOTHING;

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'Migration complete!' as status;
