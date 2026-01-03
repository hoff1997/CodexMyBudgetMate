-- STEP 3B POLICIES: Add indexes and policies to saved_products

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

SELECT 'Policies added to saved_products' as status;
