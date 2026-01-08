-- ============================================================================
-- Recipe Categories (Virtual Bookshelf)
-- Migration: 0069_recipe_categories_bookshelf.sql
-- ============================================================================

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recipe Categories (Book Spines)
CREATE TABLE recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color for book spine
  recipe_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Junction table: Recipes <-> Categories (many-to-many)
CREATE TABLE recipe_category_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES recipe_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recipe_id, category_id)
);

-- Auto-update recipe_count trigger
CREATE OR REPLACE FUNCTION update_recipe_category_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE recipe_categories
    SET recipe_count = recipe_count + 1
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE recipe_categories
    SET recipe_count = GREATEST(0, recipe_count - 1)
    WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER recipe_category_tags_count_trigger
AFTER INSERT OR DELETE ON recipe_category_tags
FOR EACH ROW
EXECUTE FUNCTION update_recipe_category_count();

-- Indexes for performance
CREATE INDEX idx_recipe_categories_user_id ON recipe_categories(user_id);
CREATE INDEX idx_recipe_categories_slug ON recipe_categories(user_id, slug);
CREATE INDEX idx_recipe_category_tags_recipe_id ON recipe_category_tags(recipe_id);
CREATE INDEX idx_recipe_category_tags_category_id ON recipe_category_tags(category_id);

-- RLS Policies
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_category_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe categories"
  ON recipe_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recipe categories"
  ON recipe_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipe categories"
  ON recipe_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipe categories"
  ON recipe_categories FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view recipe category tags"
  ON recipe_category_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_category_tags.recipe_id
      AND recipes.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recipe category tags"
  ON recipe_category_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_category_tags.recipe_id
      AND recipes.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipe category tags"
  ON recipe_category_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_category_tags.recipe_id
      AND recipes.parent_user_id = auth.uid()
    )
  );
