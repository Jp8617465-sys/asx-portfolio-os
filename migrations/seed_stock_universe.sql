-- Sample Stock Universe Data for ASX Portfolio OS
-- Purpose: Populate stock_universe table with common ASX stocks for testing
-- Note: This is sample data. In production, populate from a real data source.

-- Insert common ASX stocks (top holdings from ASX 200)
INSERT INTO stock_universe (ticker, company_name, sector, industry, is_active, listed_date) VALUES
    ('BHP.AX', 'BHP Group Limited', 'Materials', 'Metals & Mining', TRUE, '1885-08-13'),
    ('CBA.AX', 'Commonwealth Bank of Australia', 'Financials', 'Banks', TRUE, '1991-09-12'),
    ('CSL.AX', 'CSL Limited', 'Health Care', 'Biotechnology', TRUE, '1994-05-27'),
    ('NAB.AX', 'National Australia Bank Limited', 'Financials', 'Banks', TRUE, '1992-10-29'),
    ('WBC.AX', 'Westpac Banking Corporation', 'Financials', 'Banks', TRUE, '1987-11-09'),
    ('ANZ.AX', 'Australia and New Zealand Banking Group', 'Financials', 'Banks', TRUE, '1987-11-09'),
    ('WES.AX', 'Wesfarmers Limited', 'Consumer Staples', 'Diversified Retail', TRUE, '1984-11-15'),
    ('MQG.AX', 'Macquarie Group Limited', 'Financials', 'Investment Banking', TRUE, '1996-07-29'),
    ('WOW.AX', 'Woolworths Group Limited', 'Consumer Staples', 'Food Retail', TRUE, '1993-08-31'),
    ('FMG.AX', 'Fortescue Metals Group Ltd', 'Materials', 'Metals & Mining', TRUE, '2003-06-18'),
    ('TLS.AX', 'Telstra Corporation Limited', 'Communication Services', 'Telecommunications', TRUE, '1997-11-17'),
    ('RIO.AX', 'Rio Tinto Limited', 'Materials', 'Metals & Mining', TRUE, '1962-09-28'),
    ('GMG.AX', 'Goodman Group', 'Real Estate', 'Industrial REITs', TRUE, '1989-12-14'),
    ('TCL.AX', 'Transurban Group', 'Industrials', 'Transportation Infrastructure', TRUE, '1996-03-25'),
    ('WDS.AX', 'Woodside Energy Group Ltd', 'Energy', 'Oil & Gas Exploration', TRUE, '1971-11-01'),
    ('COL.AX', 'Coles Group Limited', 'Consumer Staples', 'Food Retail', TRUE, '2018-11-21'),
    ('REA.AX', 'REA Group Ltd', 'Communication Services', 'Interactive Media', TRUE, '2003-06-19'),
    ('ALL.AX', 'Aristocrat Leisure Limited', 'Consumer Discretionary', 'Gaming', TRUE, '1996-11-04'),
    ('STO.AX', 'Santos Limited', 'Energy', 'Oil & Gas Exploration', TRUE, '1971-11-01'),
    ('NCM.AX', 'Newcrest Mining Limited', 'Materials', 'Gold Mining', TRUE, '1990-01-22'),
    ('SCG.AX', 'Scentre Group', 'Real Estate', 'Retail REITs', TRUE, '2014-06-30'),
    ('QBE.AX', 'QBE Insurance Group Limited', 'Financials', 'Insurance', TRUE, '1973-03-01'),
    ('AMP.AX', 'AMP Limited', 'Financials', 'Asset Management', TRUE, '1998-06-15'),
    ('BXB.AX', 'Brambles Limited', 'Industrials', 'Logistics', TRUE, '1985-01-01'),
    ('IAG.AX', 'Insurance Australia Group Limited', 'Financials', 'Insurance', TRUE, '2000-07-03'),
    ('WTC.AX', 'WiseTech Global Limited', 'Information Technology', 'Software', TRUE, '2016-04-06'),
    ('SHL.AX', 'Sonic Healthcare Limited', 'Health Care', 'Health Care Services', TRUE, '1987-05-22'),
    ('S32.AX', 'South32 Limited', 'Materials', 'Diversified Mining', TRUE, '2015-05-18'),
    ('RMD.AX', 'ResMed Inc.', 'Health Care', 'Medical Equipment', TRUE, '1995-06-01'),
    ('ASX.AX', 'ASX Limited', 'Financials', 'Financial Exchanges', TRUE, '1998-10-14'),
    ('SUN.AX', 'Suncorp Group Limited', 'Financials', 'Insurance', TRUE, '1996-10-01'),
    ('CPU.AX', 'Computershare Limited', 'Information Technology', 'IT Services', TRUE, '1994-05-19'),
    ('BEN.AX', 'Bendigo and Adelaide Bank Limited', 'Financials', 'Regional Banks', TRUE, '2007-07-02'),
    ('BOQ.AX', 'Bank of Queensland Limited', 'Financials', 'Regional Banks', TRUE, '1971-11-01'),
    ('ORG.AX', 'Origin Energy Limited', 'Utilities', 'Utilities', TRUE, '2000-10-23'),
    ('ALX.AX', 'Atlas Arteria Limited', 'Industrials', 'Transportation Infrastructure', TRUE, '2010-04-20'),
    ('LLC.AX', 'Lendlease Group', 'Real Estate', 'Real Estate Development', TRUE, '2000-11-13'),
    ('SYD.AX', 'Sydney Airport', 'Industrials', 'Airport Services', TRUE, '2002-04-09'),
    ('APA.AX', 'APA Group', 'Utilities', 'Gas Utilities', TRUE, '2000-06-29'),
    ('DXS.AX', 'Dexus', 'Real Estate', 'Office REITs', TRUE, '2004-12-01')
ON CONFLICT (ticker) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    sector = EXCLUDED.sector,
    industry = EXCLUDED.industry,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Add some delisted stocks for testing
INSERT INTO stock_universe (ticker, company_name, sector, industry, is_active, listed_date, delisted_date) VALUES
    ('TEN.AX', 'Ten Network Holdings Limited', 'Communication Services', 'Broadcasting', FALSE, '1998-03-01', '2017-11-30'),
    ('MRM.AX', 'Mermaid Marine Australia', 'Energy', 'Oil & Gas Services', FALSE, '2000-01-01', '2018-06-30')
ON CONFLICT (ticker) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    is_active = EXCLUDED.is_active,
    delisted_date = EXCLUDED.delisted_date,
    updated_at = NOW();

-- Display summary
DO $$
DECLARE
    active_count INTEGER;
    delisted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count FROM stock_universe WHERE is_active = TRUE;
    SELECT COUNT(*) INTO delisted_count FROM stock_universe WHERE is_active = FALSE;
    
    RAISE NOTICE '✓ Stock universe populated';
    RAISE NOTICE '  Active stocks: %', active_count;
    RAISE NOTICE '  Delisted stocks: %', delisted_count;
    RAISE NOTICE '  Total stocks: %', active_count + delisted_count;
END $$;
