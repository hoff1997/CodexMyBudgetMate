-- Shopping List Templates
-- Allows users to save lists as reusable templates

CREATE TABLE shopping_list_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🛒',
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shopping_list_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own templates
CREATE POLICY "Users can view own templates"
  ON shopping_list_templates FOR SELECT
  USING (auth.uid() = parent_user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON shopping_list_templates FOR INSERT
  WITH CHECK (auth.uid() = parent_user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON shopping_list_templates FOR UPDATE
  USING (auth.uid() = parent_user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON shopping_list_templates FOR DELETE
  USING (auth.uid() = parent_user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shopping_template_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shopping_template_updated_at
  BEFORE UPDATE ON shopping_list_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_template_updated_at();

-- Index for faster lookups
CREATE INDEX idx_shopping_templates_user_id ON shopping_list_templates(parent_user_id);
