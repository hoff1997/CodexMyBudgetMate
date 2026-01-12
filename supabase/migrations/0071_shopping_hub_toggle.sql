-- Migration: Add show_on_hub toggle to shopping_lists
-- Purpose: Allow users to control which shopping lists appear on the Hub

ALTER TABLE shopping_lists
ADD COLUMN show_on_hub BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN shopping_lists.show_on_hub IS 'Whether this list appears in the Hub Quick Links widget';
