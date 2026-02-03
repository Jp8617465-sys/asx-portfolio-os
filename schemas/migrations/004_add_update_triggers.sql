-- Migration: Add update triggers for timestamp tracking

-- Add triggers to portfolio tables
CREATE TRIGGER update_user_portfolios_updated_at
    BEFORE UPDATE ON user_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_holdings_updated_at
    BEFORE UPDATE ON user_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to stock_universe
CREATE TRIGGER update_stock_universe_updated_at
    BEFORE UPDATE ON stock_universe
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to fundamentals
CREATE OR REPLACE FUNCTION update_fundamentals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fundamentals_updated_at
    BEFORE UPDATE ON fundamentals
    FOR EACH ROW
    EXECUTE FUNCTION update_fundamentals_timestamp();
