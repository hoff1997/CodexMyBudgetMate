-- Migration: Notification System Infrastructure
-- Description: Create tables and functions for in-app notifications

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  -- Kids module
  'chore_completed',
  'chore_approved',
  'chore_rejected',
  'allowance_paid',
  'reward_redeemed',
  'savings_goal_reached',
  'screen_time_request',
  'screen_time_approved',
  'screen_time_denied',
  'bank_link_requested',
  'bank_link_approved',

  -- Life module
  'birthday_reminder',
  'shopping_list_shared',
  'meal_plan_reminder',
  'calendar_event_reminder',

  -- Budget module
  'bill_due_soon',
  'envelope_low',
  'income_received',
  'goal_progress',
  'achievement_unlocked',

  -- System
  'system_announcement',
  'feature_update'
);

-- Create priority enum
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT DEFAULT NULL,
  priority notification_priority DEFAULT 'medium',

  -- Related entities
  related_entity_type TEXT DEFAULT NULL, -- 'chore', 'envelope', 'child', etc.
  related_entity_id UUID DEFAULT NULL,
  action_url TEXT DEFAULT NULL, -- URL to navigate to when clicked

  -- Metadata for rich notifications
  metadata JSONB DEFAULT '{}',

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ DEFAULT NULL,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ DEFAULT NULL,

  -- Delivery tracking
  sent_push BOOLEAN DEFAULT false,
  sent_email BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NULL -- Optional expiration

);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE NOT is_read;
CREATE INDEX idx_notifications_type ON notifications(user_id, type);
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel preferences
  enable_in_app BOOLEAN DEFAULT true,
  enable_push BOOLEAN DEFAULT false,
  enable_email BOOLEAN DEFAULT false,

  -- Type-specific settings (JSON object with type -> enabled)
  disabled_types TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',

  -- Frequency settings
  digest_frequency TEXT DEFAULT 'instant' CHECK (digest_frequency IN ('instant', 'hourly', 'daily', 'weekly')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Create function to send a notification
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_icon TEXT DEFAULT NULL,
  p_priority notification_priority DEFAULT 'medium',
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs notification_preferences;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;

  -- Check if this notification type is disabled
  IF v_prefs IS NOT NULL AND p_type::TEXT = ANY(v_prefs.disabled_types) THEN
    RETURN NULL;
  END IF;

  -- Check quiet hours
  IF v_prefs IS NOT NULL
     AND v_prefs.quiet_hours_enabled
     AND CURRENT_TIME BETWEEN v_prefs.quiet_hours_start AND v_prefs.quiet_hours_end
     AND p_priority != 'urgent' THEN
    -- Could queue for later, for now just skip push/email
    NULL;
  END IF;

  -- Insert the notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    icon,
    priority,
    related_entity_type,
    related_entity_id,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_icon,
    p_priority,
    p_related_entity_type,
    p_related_entity_id,
    p_action_url,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id AND NOT is_read;
  ELSE
    -- Mark specific ones as read
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND NOT is_read;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND NOT is_read
      AND NOT is_dismissed
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for chore completion notifications
CREATE OR REPLACE FUNCTION notify_chore_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_child_name TEXT;
  v_chore_name TEXT;
BEGIN
  -- Only on status change to 'pending_approval'
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    -- Get parent and child info
    SELECT parent_user_id, first_name INTO v_parent_id, v_child_name
    FROM child_profiles WHERE id = NEW.child_profile_id;

    -- Get chore name
    SELECT name INTO v_chore_name
    FROM chore_templates WHERE id = NEW.chore_template_id;

    -- Send notification to parent
    PERFORM send_notification(
      v_parent_id,
      'chore_completed'::notification_type,
      'Chore Completed',
      v_child_name || ' completed "' || v_chore_name || '" and is waiting for approval',
      '✅',
      'medium'::notification_priority,
      'chore_assignment',
      NEW.id,
      '/kids/chores?child=' || NEW.child_profile_id::TEXT,
      jsonb_build_object('child_name', v_child_name, 'chore_name', v_chore_name)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger (only if chore_assignments exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chore_assignments') THEN
    DROP TRIGGER IF EXISTS chore_completed_notification_trigger ON chore_assignments;
    CREATE TRIGGER chore_completed_notification_trigger
    AFTER INSERT OR UPDATE ON chore_assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_chore_completed();
  END IF;
END $$;

-- Create trigger for achievement unlock notifications
CREATE OR REPLACE FUNCTION notify_achievement_unlocked()
RETURNS TRIGGER AS $$
DECLARE
  v_achievement_name TEXT;
  v_achievement_desc TEXT;
BEGIN
  -- Get achievement details (from your achievements definition)
  v_achievement_name := CASE NEW.achievement_key
    WHEN 'onboarding_complete' THEN 'Welcome Aboard!'
    WHEN 'first_envelope' THEN 'Budget Builder'
    WHEN 'emergency_fund_started' THEN 'Safety Net Started'
    WHEN 'emergency_fund_1000' THEN '$1,000 Saved'
    WHEN 'emergency_fund_complete' THEN 'Fully Protected'
    WHEN 'debt_free' THEN 'Debt Free!'
    ELSE 'Achievement Unlocked'
  END;

  -- Send notification
  PERFORM send_notification(
    NEW.user_id,
    'achievement_unlocked'::notification_type,
    'Achievement Unlocked! 🏆',
    'You earned: ' || v_achievement_name,
    '🏆',
    'high'::notification_priority,
    'achievement',
    NEW.id,
    '/achievements',
    jsonb_build_object('achievement_key', NEW.achievement_key, 'achievement_name', v_achievement_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger (only if achievements exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements') THEN
    DROP TRIGGER IF EXISTS achievement_notification_trigger ON achievements;
    CREATE TRIGGER achievement_notification_trigger
    AFTER INSERT ON achievements
    FOR EACH ROW
    EXECUTE FUNCTION notify_achievement_unlocked();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE notifications IS 'In-app notification storage for all user notifications';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery';
COMMENT ON FUNCTION send_notification IS 'Creates a notification respecting user preferences';
