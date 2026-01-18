-- STEP 2: Create shopping_categories table
-- Run this second

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

SELECT 'Step 2 complete - shopping_categories table created!' as status;
