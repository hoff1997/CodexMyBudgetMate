-- STEP 3C: Add columns to shopping_items
-- Run after step3b

-- Add columns one at a time without foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_items' AND column_name = 'category_id') THEN
    ALTER TABLE shopping_items ADD COLUMN category_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_items' AND column_name = 'photo_url') THEN
    ALTER TABLE shopping_items ADD COLUMN photo_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_items' AND column_name = 'saved_product_id') THEN
    ALTER TABLE shopping_items ADD COLUMN saved_product_id UUID;
  END IF;
END $$;

SELECT 'Step 3C done - shopping_items columns added' as status;
