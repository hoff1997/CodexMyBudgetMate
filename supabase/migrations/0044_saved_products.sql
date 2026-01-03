-- Shopping Categories: User-defined categories (aisles) for organizing items
-- The supermarket just determines the ORDER of these categories
CREATE TABLE shopping_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT, -- Optional emoji icon
  default_sort_order INTEGER DEFAULT 0, -- Default order when no supermarket selected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name)
);

CREATE INDEX idx_shopping_categories_parent ON shopping_categories(parent_user_id);

-- Enable RLS
ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
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

-- Supermarket category ordering: defines the order of categories for each supermarket
-- This replaces the JSONB aisle_structure in supermarkets table
CREATE TABLE supermarket_category_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supermarket_id UUID NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES shopping_categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(supermarket_id, category_id)
);

CREATE INDEX idx_supermarket_category_orders ON supermarket_category_orders(supermarket_id);

-- Enable RLS (via supermarket ownership)
ALTER TABLE supermarket_category_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage supermarket category orders"
  ON supermarket_category_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM supermarkets s
      WHERE s.id = supermarket_category_orders.supermarket_id
      AND s.parent_user_id = auth.uid()
    )
  );

-- Saved Products: User's catalog of products they regularly buy
-- Includes optional pricing and photo support
CREATE TABLE saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL, -- Category this product belongs to
  default_quantity TEXT, -- e.g., "1kg", "2", "500g"
  typical_price DECIMAL(10, 2), -- Optional: typical price point
  price_unit TEXT, -- e.g., "kg", "each", "pack"
  photo_url TEXT, -- Optional: URL to product photo
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name) -- Each user has unique product names
);

CREATE INDEX idx_saved_products_parent ON saved_products(parent_user_id);
CREATE INDEX idx_saved_products_name ON saved_products(parent_user_id, name);
CREATE INDEX idx_saved_products_category ON saved_products(category_id);

-- Enable RLS
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Update shopping_items to use category_id instead of aisle_name
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS saved_product_id UUID REFERENCES saved_products(id) ON DELETE SET NULL;

-- Seed default categories for new users (trigger would be better but this works for existing)
-- These are common grocery store sections
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

-- Create trigger to auto-create categories for new users
DROP TRIGGER IF EXISTS on_auth_user_created_shopping_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_shopping_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shopping_categories();
