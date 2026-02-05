-- Migration 005: Add universe view for backward compatibility
-- Created: 2026-02-05
-- Purpose: Create a view named 'universe' that maps to stock_universe table
--          This provides backward compatibility for code that references 'universe'

-- Drop existing view if it exists
DROP VIEW IF EXISTS universe CASCADE;

-- Create view that maps stock_universe columns to legacy universe format
CREATE VIEW universe AS
SELECT
    ticker AS symbol,
    company_name AS name,
    'AU' AS exchange,
    CASE
        WHEN sector = 'Financials' THEN 'Equity'
        WHEN sector = 'Materials' THEN 'Equity'
        ELSE 'Equity'
    END AS type,
    'AUD' AS currency,
    sector,
    industry,
    market_cap,
    is_active,
    listed_date,
    delisted_date,
    created_at,
    updated_at
FROM stock_universe;

-- Add comment explaining the view
COMMENT ON VIEW universe IS 'Backward compatibility view that maps to stock_universe table. New code should use stock_universe directly.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ Universe view created for backward compatibility';
    RAISE NOTICE '  View maps stock_universe columns to legacy universe format';
    RAISE NOTICE '  Note: New code should use stock_universe table directly';
END $$;
