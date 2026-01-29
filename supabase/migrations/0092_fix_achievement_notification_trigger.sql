-- Migration: Fix achievement notification trigger to use correct column name
-- The trigger in 0058_notifications.sql references 'achievement_key' but the column is 'achievement_type'

-- Drop the old trigger first
DROP TRIGGER IF EXISTS achievement_notification_trigger ON achievements;

-- Recreate the function with the correct column name
CREATE OR REPLACE FUNCTION notify_achievement_unlocked()
RETURNS TRIGGER AS $$
DECLARE
  v_achievement_name TEXT;
  v_achievement_desc TEXT;
BEGIN
  -- Get achievement details using correct column name: achievement_type
  v_achievement_name := CASE NEW.achievement_type
    WHEN 'onboarding_complete' THEN 'Welcome Aboard!'
    WHEN 'first_envelope' THEN 'Budget Builder'
    WHEN 'emergency_fund_started' THEN 'Safety Net Started'
    WHEN 'emergency_fund_1000' THEN '$1,000 Saved'
    WHEN 'emergency_fund_complete' THEN 'Fully Protected'
    WHEN 'debt_free' THEN 'Debt Free!'
    WHEN 'first_budget_month' THEN 'First Budget Month'
    ELSE 'Achievement Unlocked'
  END;

  -- Send notification (if send_notification function exists)
  BEGIN
    PERFORM send_notification(
      NEW.user_id,
      'achievement_unlocked'::notification_type,
      v_achievement_name,
      'Congratulations! You unlocked: ' || v_achievement_name,
      jsonb_build_object('achievement_type', NEW.achievement_type)
    );
  EXCEPTION WHEN undefined_function OR undefined_object THEN
    -- send_notification or notification_type doesn't exist, skip silently
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER achievement_notification_trigger
AFTER INSERT ON achievements
FOR EACH ROW
EXECUTE FUNCTION notify_achievement_unlocked();
