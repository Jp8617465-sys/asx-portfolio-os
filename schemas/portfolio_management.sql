-- Portfolio Management Tables and Functions
-- Created: 2026-01-29
-- Purpose: Multi-portfolio support with live price tracking and P&L calculations

-- Portfolio metadata table
CREATE TABLE IF NOT EXISTS user_portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Portfolio',
    description TEXT,
    cash_balance NUMERIC(15, 2) DEFAULT 0,
    total_value NUMERIC(15, 2),
    total_cost_basis NUMERIC(15, 2),
    total_pl NUMERIC(15, 2),
    total_pl_pct NUMERIC(8, 4),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    CONSTRAINT cash_balance_positive CHECK (cash_balance >= 0)
);

-- Portfolio holdings table
CREATE TABLE IF NOT EXISTS user_holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    shares NUMERIC(15, 4) NOT NULL,
    avg_cost NUMERIC(15, 4) NOT NULL,
    date_acquired DATE,
    current_price NUMERIC(15, 4),
    current_value NUMERIC(15, 2),
    cost_basis NUMERIC(15, 2),
    unrealized_pl NUMERIC(15, 2),
    unrealized_pl_pct NUMERIC(8, 4),
    current_signal VARCHAR(20),
    signal_confidence NUMERIC(5, 4),
    model_b_quality_score VARCHAR(5),  -- A, B, C, D, F grades
    ensemble_signal VARCHAR(20),
    ensemble_confidence NUMERIC(5, 4),
    last_price_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shares_positive CHECK (shares > 0),
    CONSTRAINT avg_cost_nonnegative CHECK (avg_cost >= 0),
    UNIQUE(portfolio_id, ticker)
);

-- Portfolio rebalancing suggestions table
CREATE TABLE IF NOT EXISTS portfolio_rebalancing_suggestions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,  -- BUY, SELL, HOLD, TRIM, ADD
    suggested_quantity NUMERIC(15, 4),
    suggested_value NUMERIC(15, 2),
    reason TEXT NOT NULL,
    current_signal VARCHAR(20),
    signal_confidence NUMERIC(5, 4),
    current_shares NUMERIC(15, 4),
    current_weight_pct NUMERIC(8, 4),
    target_weight_pct NUMERIC(8, 4),
    priority INTEGER DEFAULT 999,
    confidence_score NUMERIC(5, 2) DEFAULT 50.0,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, executed, rejected
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    CONSTRAINT action_valid CHECK (action IN ('BUY', 'SELL', 'HOLD', 'TRIM', 'ADD')),
    CONSTRAINT status_valid CHECK (status IN ('pending', 'executed', 'rejected'))
);

-- Portfolio risk metrics table
CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
    as_of DATE NOT NULL DEFAULT CURRENT_DATE,
    total_return_pct NUMERIC(8, 4),
    volatility NUMERIC(8, 4),
    sharpe_ratio NUMERIC(8, 4),
    beta NUMERIC(8, 4),
    max_drawdown_pct NUMERIC(8, 4),
    top_holding_weight_pct NUMERIC(8, 4),
    top_5_weight_pct NUMERIC(8, 4),
    herfindahl_index NUMERIC(8, 6),
    sector_weights JSONB,
    signal_distribution JSONB,
    calculation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, as_of)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_active ON user_portfolios(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_holdings_portfolio_id ON user_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_user_holdings_ticker ON user_holdings(ticker);
CREATE INDEX IF NOT EXISTS idx_rebalancing_suggestions_portfolio_id ON portfolio_rebalancing_suggestions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_suggestions_status ON portfolio_rebalancing_suggestions(portfolio_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_id ON portfolio_risk_metrics(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_as_of ON portfolio_risk_metrics(as_of DESC);

-- Update triggers
CREATE TRIGGER update_user_portfolios_updated_at
    BEFORE UPDATE ON user_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_holdings_updated_at
    BEFORE UPDATE ON user_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Sync prices and signals for a single holding
CREATE OR REPLACE FUNCTION sync_holding_prices(holding_id INTEGER)
RETURNS void AS $$
DECLARE
    v_ticker VARCHAR(20);
    v_shares NUMERIC(15, 4);
    v_avg_cost NUMERIC(15, 4);
    v_current_price NUMERIC(15, 4);
    v_signal VARCHAR(20);
    v_confidence NUMERIC(5, 4);
    v_quality_score VARCHAR(5);
    v_ensemble_signal VARCHAR(20);
    v_ensemble_confidence NUMERIC(5, 4);
BEGIN
    -- Get holding info
    SELECT ticker, shares, avg_cost
    INTO v_ticker, v_shares, v_avg_cost
    FROM user_holdings
    WHERE id = holding_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get latest price from prices table
    SELECT close INTO v_current_price
    FROM prices
    WHERE symbol = v_ticker
    ORDER BY dt DESC
    LIMIT 1;

    -- Get latest Model A signal from model_a_ml_signals
    SELECT rank, ml_prob INTO v_signal, v_confidence
    FROM model_a_ml_signals
    WHERE symbol = v_ticker
    ORDER BY created_at DESC
    LIMIT 1;

    -- Convert rank to signal text (1-20 = STRONG_BUY, etc.)
    IF v_signal IS NOT NULL THEN
        IF v_signal <= 20 THEN
            v_signal := 'STRONG_BUY';
        ELSIF v_signal <= 50 THEN
            v_signal := 'BUY';
        ELSIF v_signal <= 150 THEN
            v_signal := 'HOLD';
        ELSIF v_signal <= 180 THEN
            v_signal := 'SELL';
        ELSE
            v_signal := 'STRONG_SELL';
        END IF;
    END IF;

    -- Get Model B quality score
    SELECT quality_score INTO v_quality_score
    FROM model_b_ml_signals
    WHERE symbol = v_ticker
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get ensemble signal
    SELECT signal, confidence INTO v_ensemble_signal, v_ensemble_confidence
    FROM ensemble_signals
    WHERE symbol = v_ticker
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update holding
    UPDATE user_holdings
    SET
        current_price = v_current_price,
        current_value = CASE WHEN v_current_price IS NOT NULL THEN v_shares * v_current_price ELSE NULL END,
        cost_basis = v_shares * v_avg_cost,
        unrealized_pl = CASE WHEN v_current_price IS NOT NULL THEN (v_shares * v_current_price) - (v_shares * v_avg_cost) ELSE NULL END,
        unrealized_pl_pct = CASE
            WHEN v_current_price IS NOT NULL AND v_avg_cost > 0
            THEN ((v_current_price - v_avg_cost) / v_avg_cost)
            ELSE NULL
        END,
        current_signal = v_signal,
        signal_confidence = v_confidence,
        model_b_quality_score = v_quality_score,
        ensemble_signal = v_ensemble_signal,
        ensemble_confidence = v_ensemble_confidence,
        last_price_update = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = holding_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update portfolio totals from holdings
CREATE OR REPLACE FUNCTION update_portfolio_totals(p_portfolio_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE user_portfolios
    SET
        total_value = (
            SELECT COALESCE(SUM(current_value), 0) + cash_balance
            FROM user_holdings
            WHERE portfolio_id = p_portfolio_id
        ),
        total_cost_basis = (
            SELECT COALESCE(SUM(cost_basis), 0)
            FROM user_holdings
            WHERE portfolio_id = p_portfolio_id
        ),
        total_pl = (
            SELECT COALESCE(SUM(unrealized_pl), 0)
            FROM user_holdings
            WHERE portfolio_id = p_portfolio_id
        ),
        total_pl_pct = CASE
            WHEN (SELECT COALESCE(SUM(cost_basis), 0) FROM user_holdings WHERE portfolio_id = p_portfolio_id) > 0
            THEN (
                SELECT COALESCE(SUM(unrealized_pl), 0) FROM user_holdings WHERE portfolio_id = p_portfolio_id
            ) / (
                SELECT COALESCE(SUM(cost_basis), 0) FROM user_holdings WHERE portfolio_id = p_portfolio_id
            )
            ELSE 0
        END,
        last_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_portfolio_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Sync all holdings for a portfolio
CREATE OR REPLACE FUNCTION sync_portfolio_prices(p_portfolio_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    holding_rec RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR holding_rec IN
        SELECT id FROM user_holdings WHERE portfolio_id = p_portfolio_id
    LOOP
        PERFORM sync_holding_prices(holding_rec.id);
        updated_count := updated_count + 1;
    END LOOP;

    PERFORM update_portfolio_totals(p_portfolio_id);

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Sync all active portfolios (for scheduled jobs)
CREATE OR REPLACE FUNCTION sync_all_portfolio_prices()
RETURNS TABLE(portfolio_id INTEGER, holdings_updated INTEGER) AS $$
DECLARE
    portfolio_rec RECORD;
    v_updated_count INTEGER;
BEGIN
    FOR portfolio_rec IN
        SELECT id FROM user_portfolios WHERE is_active = TRUE
    LOOP
        v_updated_count := sync_portfolio_prices(portfolio_rec.id);
        portfolio_id := portfolio_rec.id;
        holdings_updated := v_updated_count;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Sample portfolio for demo user
INSERT INTO user_portfolios (user_id, name, cash_balance)
SELECT user_id, 'Demo Portfolio', 10000.00
FROM user_accounts
WHERE username = 'demo_user'
ON CONFLICT DO NOTHING;

-- Sample holdings for demo portfolio
INSERT INTO user_holdings (portfolio_id, ticker, shares, avg_cost, date_acquired)
SELECT
    p.id,
    unnest(ARRAY['BHP.AX', 'CBA.AX', 'CSL.AX', 'WES.AX']),
    unnest(ARRAY[100, 50, 30, 75]::NUMERIC[]),
    unnest(ARRAY[42.50, 98.00, 280.00, 45.80]::NUMERIC[]),
    unnest(ARRAY['2023-06-15', '2023-08-20', '2023-09-10', '2024-01-05']::DATE[])
FROM user_portfolios p
JOIN user_accounts u ON p.user_id = u.user_id
WHERE u.username = 'demo_user'
ON CONFLICT (portfolio_id, ticker) DO NOTHING;

-- Sync prices for demo portfolio
DO $$
DECLARE
    v_portfolio_id INTEGER;
BEGIN
    SELECT p.id INTO v_portfolio_id
    FROM user_portfolios p
    JOIN user_accounts u ON p.user_id = u.user_id
    WHERE u.username = 'demo_user'
    LIMIT 1;

    IF v_portfolio_id IS NOT NULL THEN
        PERFORM sync_portfolio_prices(v_portfolio_id);
    END IF;
END $$;

COMMENT ON TABLE user_portfolios IS 'User portfolio metadata with aggregated values';
COMMENT ON TABLE user_holdings IS 'Individual holdings within portfolios with live prices and signals';
COMMENT ON FUNCTION sync_holding_prices IS 'Update prices and signals for a single holding';
COMMENT ON FUNCTION update_portfolio_totals IS 'Recalculate portfolio-level totals from holdings';
COMMENT ON FUNCTION sync_portfolio_prices IS 'Sync all holdings in a portfolio';
COMMENT ON FUNCTION sync_all_portfolio_prices IS 'Sync all active portfolios (for scheduled jobs)';
