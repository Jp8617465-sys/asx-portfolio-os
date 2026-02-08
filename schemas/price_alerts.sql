-- schemas/price_alerts.sql
-- Price Alerts schema for WP-10: user-defined price alerts with history tracking.

CREATE TABLE IF NOT EXISTS price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'SIGNAL_CHANGE', 'VOLUME_SPIKE')),
    threshold DECIMAL(18,4) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'disabled', 'expired')),
    notification_channel VARCHAR(20) DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    triggered_at TIMESTAMPTZ,
    current_price DECIMAL(18,4),
    CONSTRAINT unique_user_symbol_type UNIQUE(user_id, symbol, alert_type, threshold)
);

CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold DECIMAL(18,4) NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    price_at_trigger DECIMAL(18,4) NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_status ON price_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at DESC);
