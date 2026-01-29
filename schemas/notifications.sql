-- Notifications and Alert Preferences Tables
-- Created: 2026-01-29
-- Purpose: Support user notifications and configurable alert preferences

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,  -- 'signal_change', 'portfolio_alert', 'system', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,  -- Additional structured data
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,  -- Optional expiration
    CONSTRAINT priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Alert preferences table
CREATE TABLE IF NOT EXISTS alert_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,  -- 'signal_strong_buy', 'signal_strong_sell', 'drift_detected', etc.
    enabled BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',  -- Type-specific settings (thresholds, frequency, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, alert_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON alert_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_preferences_type ON alert_preferences(alert_type);

-- Update trigger for alert_preferences
CREATE TRIGGER update_alert_preferences_updated_at
    BEFORE UPDATE ON alert_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to mark old notifications as read automatically
CREATE OR REPLACE FUNCTION auto_expire_notifications()
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET is_read = TRUE
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP
      AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Sample alert preferences for demo users
INSERT INTO alert_preferences (user_id, alert_type, enabled, settings)
SELECT
    user_id,
    unnest(ARRAY[
        'signal_strong_buy',
        'signal_strong_sell',
        'signal_change',
        'drift_detected',
        'portfolio_alert',
        'model_update'
    ]) as alert_type,
    TRUE as enabled,
    '{"frequency": "immediate", "min_confidence": 0.7}'::jsonb as settings
FROM user_accounts
WHERE username IN ('demo_user', 'test_user')
ON CONFLICT (user_id, alert_type) DO NOTHING;

-- Sample notifications for testing
INSERT INTO notifications (user_id, notification_type, title, message, data, priority, expires_at)
SELECT
    user_id,
    'signal_change',
    'New STRONG_BUY Signal - BHP',
    'BHP.AX has received a new STRONG_BUY signal from Model A with 89% confidence.',
    '{"ticker": "BHP.AX", "signal": "STRONG_BUY", "confidence": 0.89, "model": "model_a"}'::jsonb,
    'high',
    CURRENT_TIMESTAMP + INTERVAL '7 days'
FROM user_accounts
WHERE username = 'demo_user'
UNION ALL
SELECT
    user_id,
    'portfolio_alert',
    'Portfolio Rebalancing Suggested',
    'Your portfolio allocation has drifted from targets. Review rebalancing suggestions.',
    '{"drift_percentage": 15.2, "affected_holdings": 3}'::jsonb,
    'normal',
    CURRENT_TIMESTAMP + INTERVAL '30 days'
FROM user_accounts
WHERE username = 'demo_user'
UNION ALL
SELECT
    user_id,
    'system',
    'Welcome to ASX Portfolio OS',
    'Your account has been set up successfully. Start by uploading your portfolio or exploring signals.',
    '{"action": "onboarding"}'::jsonb,
    'low',
    CURRENT_TIMESTAMP + INTERVAL '90 days'
FROM user_accounts
WHERE username IN ('demo_user', 'test_user');

COMMENT ON TABLE notifications IS 'User notifications for signals, alerts, and system messages';
COMMENT ON TABLE alert_preferences IS 'User-configurable alert preferences';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification (signal_change, portfolio_alert, etc.)';
COMMENT ON COLUMN notifications.data IS 'Additional structured data specific to notification type';
COMMENT ON COLUMN notifications.priority IS 'Notification priority level for UI display';
COMMENT ON COLUMN alert_preferences.alert_type IS 'Type of alert (signal_strong_buy, drift_detected, etc.)';
COMMENT ON COLUMN alert_preferences.settings IS 'Alert-specific settings (frequency, thresholds, etc.)';
