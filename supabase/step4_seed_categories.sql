-- STEP 4: Seed categories and create trigger
-- Run this last

-- Trigger for new users
CREATE OR REPLACE FUNCTION create_default_shopping_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shopping_categories (parent_user_id, name, icon, default_sort_order) VALUES
    (NEW.id, 'Produce', '🥬', 1),
    (NEW.id, 'Bakery', '🍞', 2),
    (NEW.id, 'Deli', '🥓', 3),
    (NEW.id, 'Meat', '🥩', 4),
    (NEW.id, 'Seafood', '🐟', 5),
    (NEW.id, 'Dairy', '🧀', 6),
    (NEW.id, 'Frozen', '🧊', 7),
    (NEW.id, 'Pantry', '🥫', 8),
    (NEW.id, 'Snacks', '🍿', 9),
    (NEW.id, 'Beverages', '🥤', 10),
    (NEW.id, 'Health & Beauty', '💊', 11),
    (NEW.id, 'Cleaning', '🧹', 12),
    (NEW.id, 'Baby', '👶', 13),
    (NEW.id, 'Pet', '🐕', 14),
    (NEW.id, 'Other', '📦', 99);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_shopping_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_shopping_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shopping_categories();

-- Seed for existing users
INSERT INTO shopping_categories (parent_user_id, name, icon, default_sort_order)
SELECT u.id, cat.name, cat.icon, cat.sort_order
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Produce', '🥬', 1),
    ('Bakery', '🍞', 2),
    ('Deli', '🥓', 3),
    ('Meat', '🥩', 4),
    ('Seafood', '🐟', 5),
    ('Dairy', '🧀', 6),
    ('Frozen', '🧊', 7),
    ('Pantry', '🥫', 8),
    ('Snacks', '🍿', 9),
    ('Beverages', '🥤', 10),
    ('Health & Beauty', '💊', 11),
    ('Cleaning', '🧹', 12),
    ('Baby', '👶', 13),
    ('Pet', '🐕', 14),
    ('Other', '📦', 99)
) AS cat(name, icon, sort_order)
ON CONFLICT (parent_user_id, name) DO NOTHING;

SELECT 'Step 4 complete - categories seeded!' as status;
