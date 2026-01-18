-- STEP 3 FIXED: Create tables one at a time
-- Run this after step 2

-- ============================================
-- PART A: Supermarket category orders table
-- ============================================
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

SELECT 'Part A done - supermarket_category_orders created' as status;
