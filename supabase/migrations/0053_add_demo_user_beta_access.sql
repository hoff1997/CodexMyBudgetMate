-- Migration: Add Demo User Beta Access
-- Date: January 2026
-- Description: Grants beta access to Life and Kids features for demo user

-- Insert demo user into feature_beta_access table
-- Using ON CONFLICT to avoid errors if user already exists
INSERT INTO feature_beta_access (user_email, user_type)
VALUES ('futureproperty97@gmail.com', 'adult')
ON CONFLICT (user_email) DO NOTHING;

-- Verify insertion
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM feature_beta_access
    WHERE user_email = 'futureproperty97@gmail.com'
  ) THEN
    RAISE NOTICE 'Demo user futureproperty97@gmail.com granted beta access successfully';
  END IF;
END $$;
