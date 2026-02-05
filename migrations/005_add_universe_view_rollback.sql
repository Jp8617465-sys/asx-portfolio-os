-- Migration 005 Rollback: Remove universe view
-- Created: 2026-02-05

-- Drop the view
DROP VIEW IF EXISTS universe CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ Universe view removed';
END $$;
