-- STEP 3: Create other tables and add columns
-- Run this third (after step 2)

-- Supermarket category orders
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

-- Saved products
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

-- Add columns to shopping_items (without FK for now to avoid issues)
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS saved_product_id UUID;

SELECT 'Step 3 complete - all tables created!' as status;
