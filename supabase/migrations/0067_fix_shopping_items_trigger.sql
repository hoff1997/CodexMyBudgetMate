-- Migration: Fix Shopping Items Trigger
-- Description: Fix the update_shopping_list_totals() trigger to use correct column name
-- The original migration 0057 used 'list_id' but the actual column is 'shopping_list_id'

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS shopping_items_totals_trigger ON shopping_items;

-- Recreate the function with correct column name (shopping_list_id instead of list_id)
CREATE OR REPLACE FUNCTION update_shopping_list_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate totals for the affected list
  UPDATE shopping_lists
  SET
    total_estimated = COALESCE((
      SELECT SUM(COALESCE(estimated_price, 0))
      FROM shopping_items
      WHERE shopping_list_id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id)
    ), 0),
    total_actual = COALESCE((
      SELECT SUM(COALESCE(actual_price, 0))
      FROM shopping_items
      WHERE shopping_list_id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id)
    ), 0)
  WHERE id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER shopping_items_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON shopping_items
FOR EACH ROW
EXECUTE FUNCTION update_shopping_list_totals();

-- Add comment documenting the fix
COMMENT ON FUNCTION update_shopping_list_totals() IS 'Recalculates shopping list totals when items change. Fixed in migration 0067 to use correct column name shopping_list_id.';
