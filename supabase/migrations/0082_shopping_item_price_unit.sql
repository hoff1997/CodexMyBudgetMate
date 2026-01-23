-- Add price_unit column to shopping_items table
-- Allows users to specify whether price is per item, per kg, or per 100g

ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'each';

-- Add comment explaining the column
COMMENT ON COLUMN shopping_items.price_unit IS 'Unit for price: each (default), per_kg, per_100g';
