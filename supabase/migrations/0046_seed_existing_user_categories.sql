-- Seed default shopping categories for existing users
-- This is a one-time migration to populate categories for users who existed before 0044

-- Insert default categories for all existing users who don't have any categories yet
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
WHERE NOT EXISTS (
  SELECT 1 FROM shopping_categories sc WHERE sc.parent_user_id = u.id
)
ON CONFLICT (parent_user_id, name) DO NOTHING;
