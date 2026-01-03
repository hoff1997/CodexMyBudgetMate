-- STEP 3B SIMPLE: Create saved_products table without FK initially

CREATE TABLE IF NOT EXISTS saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID,
  default_quantity TEXT,
  typical_price DECIMAL(10, 2),
  price_unit TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_user_id, name)
);

SELECT 'Step 3B done - saved_products table created' as status;
