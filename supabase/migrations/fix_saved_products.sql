-- Fix saved_products table - add missing category_id column

ALTER TABLE saved_products ADD COLUMN IF NOT EXISTS category_id UUID;

SELECT 'category_id column added to saved_products' as status;
