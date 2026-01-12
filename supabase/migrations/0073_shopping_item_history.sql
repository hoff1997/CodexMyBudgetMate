-- Shopping Item History Table
-- Tracks recently used items for autocomplete suggestions

CREATE TABLE shopping_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
  aisle_name TEXT,
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure unique item names per user
  UNIQUE(parent_user_id, item_name)
);

-- Enable RLS
ALTER TABLE shopping_item_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history
CREATE POLICY "Users can view own item history"
  ON shopping_item_history FOR SELECT
  USING (auth.uid() = parent_user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert own item history"
  ON shopping_item_history FOR INSERT
  WITH CHECK (auth.uid() = parent_user_id);

-- Users can update their own history
CREATE POLICY "Users can update own item history"
  ON shopping_item_history FOR UPDATE
  USING (auth.uid() = parent_user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own item history"
  ON shopping_item_history FOR DELETE
  USING (auth.uid() = parent_user_id);

-- Index for faster lookups
CREATE INDEX idx_shopping_item_history_user_id ON shopping_item_history(parent_user_id);
CREATE INDEX idx_shopping_item_history_name ON shopping_item_history(parent_user_id, item_name);
CREATE INDEX idx_shopping_item_history_use_count ON shopping_item_history(parent_user_id, use_count DESC);

-- Function to update item history when an item is added
CREATE OR REPLACE FUNCTION update_shopping_item_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id from the parent shopping list
  SELECT parent_user_id INTO v_user_id
  FROM shopping_lists
  WHERE id = NEW.shopping_list_id;

  IF v_user_id IS NOT NULL THEN
    -- Upsert into history: increment use_count if exists, otherwise insert
    INSERT INTO shopping_item_history (parent_user_id, item_name, category_id, aisle_name, use_count, last_used_at)
    VALUES (v_user_id, NEW.text, NEW.category_id, NEW.aisle_name, 1, NOW())
    ON CONFLICT (parent_user_id, item_name)
    DO UPDATE SET
      use_count = shopping_item_history.use_count + 1,
      last_used_at = NOW(),
      category_id = COALESCE(EXCLUDED.category_id, shopping_item_history.category_id),
      aisle_name = COALESCE(EXCLUDED.aisle_name, shopping_item_history.aisle_name);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to update history when items are added
CREATE TRIGGER shopping_item_history_trigger
  AFTER INSERT ON shopping_items
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_item_history();
