-- Migration: Add update triggers for timestamp tracking

-- Note: user_portfolios and user_holdings triggers already exist in portfolio_management.sql
-- Only create triggers that don't already exist

-- Add trigger to stock_universe
CREATE OR REPLACE FUNCTION create_trigger_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Check and create stock_universe trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_stock_universe_updated_at'
    ) THEN
        CREATE TRIGGER update_stock_universe_updated_at
            BEFORE UPDATE ON stock_universe
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_trigger_if_not_exists();
DROP FUNCTION create_trigger_if_not_exists();

-- Add trigger to fundamentals
-- Note: Reusing the existing update_updated_at_column() function for consistency
DROP TRIGGER IF EXISTS update_fundamentals_updated_at ON fundamentals;

CREATE TRIGGER update_fundamentals_updated_at
    BEFORE UPDATE ON fundamentals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
