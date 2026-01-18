-- STEP 3B: Create saved_products table
-- Run after step3_fixed.sql

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
  ON saved_products FOR SELECT USING (parent_user_id = auth.uid());

CREATE POLICY "Users can insert their own saved products"
  ON saved_products FOR INSERT WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Users can update their own saved products"
  ON saved_products FOR UPDATE USING (parent_user_id = auth.uid());

CREATE POLICY "Users can delete their own saved products"
  ON saved_products FOR DELETE USING (parent_user_id = auth.uid());

SELECT 'Step 3B done - saved_products created' as status;
