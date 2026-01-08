-- Migration: Shopping List to Envelope Link
-- Description: Add ability to link shopping lists to budget envelopes for spending tracking

-- Add linked_envelope_id column to shopping_lists
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS linked_envelope_id UUID REFERENCES envelopes(id) ON DELETE SET NULL;

-- Add budget_amount column for list-level budget tracking
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(10,2) DEFAULT NULL;

-- Add total_estimated column for easy querying of list totals
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS total_estimated DECIMAL(10,2) DEFAULT 0;

-- Add total_actual column for tracking actual spending
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS total_actual DECIMAL(10,2) DEFAULT 0;

-- Add is_completed flag to mark when shopping is done
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Add completed_at timestamp
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for envelope lookups
CREATE INDEX IF NOT EXISTS idx_shopping_lists_envelope
ON shopping_lists(linked_envelope_id)
WHERE linked_envelope_id IS NOT NULL;

-- Add actual_price column to shopping_items for tracking what was actually spent
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS actual_price DECIMAL(10,2) DEFAULT NULL;

-- Create function to update list totals when items change
CREATE OR REPLACE FUNCTION update_shopping_list_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate totals for the affected list
  UPDATE shopping_lists
  SET
    total_estimated = COALESCE((
      SELECT SUM(COALESCE(estimated_price, 0))
      FROM shopping_items
      WHERE list_id = COALESCE(NEW.list_id, OLD.list_id)
    ), 0),
    total_actual = COALESCE((
      SELECT SUM(COALESCE(actual_price, 0))
      FROM shopping_items
      WHERE list_id = COALESCE(NEW.list_id, OLD.list_id)
    ), 0)
  WHERE id = COALESCE(NEW.list_id, OLD.list_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep totals up to date
DROP TRIGGER IF EXISTS shopping_items_totals_trigger ON shopping_items;
CREATE TRIGGER shopping_items_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON shopping_items
FOR EACH ROW
EXECUTE FUNCTION update_shopping_list_totals();

-- Create function to mark list complete and optionally record spending to envelope
CREATE OR REPLACE FUNCTION complete_shopping_list(
  p_list_id UUID,
  p_actual_total DECIMAL(10,2) DEFAULT NULL,
  p_record_transaction BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_list RECORD;
  v_envelope RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get the list
  SELECT * INTO v_list FROM shopping_lists WHERE id = p_list_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Shopping list not found');
  END IF;

  -- Update the list
  UPDATE shopping_lists
  SET
    is_completed = true,
    completed_at = NOW(),
    total_actual = COALESCE(p_actual_total, total_actual)
  WHERE id = p_list_id;

  -- If recording to envelope and envelope is linked
  IF p_record_transaction AND v_list.linked_envelope_id IS NOT NULL THEN
    SELECT * INTO v_envelope FROM envelopes WHERE id = v_list.linked_envelope_id;

    IF FOUND THEN
      -- Deduct from envelope
      UPDATE envelopes
      SET
        current_balance = current_balance - COALESCE(p_actual_total, v_list.total_actual),
        updated_at = NOW()
      WHERE id = v_list.linked_envelope_id;

      RETURN jsonb_build_object(
        'success', true,
        'list_id', p_list_id,
        'amount_recorded', COALESCE(p_actual_total, v_list.total_actual),
        'envelope_id', v_list.linked_envelope_id,
        'envelope_name', v_envelope.name
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'list_id', p_list_id,
    'is_completed', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON COLUMN shopping_lists.linked_envelope_id IS 'Optional link to a budget envelope for tracking grocery/shopping spending';
COMMENT ON COLUMN shopping_lists.budget_amount IS 'Optional budget limit for this shopping list';
COMMENT ON COLUMN shopping_items.actual_price IS 'Actual price paid (may differ from estimate)';
