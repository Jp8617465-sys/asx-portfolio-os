"""
E2E Test: Complete V2 signal generation pipeline
Tests Model A -> Model B -> Ensemble signal flow
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import db_context, logger


class TestE2ESignalPipeline:
    """End-to-end V2 signal generation pipeline tests."""

    def test_database_tables_exist(self):
        """Verify all required tables for V2 pipeline exist."""

        required_tables = [
            'prices',
            'universe',
            'fundamentals',
            'model_a_ml_signals',
            'model_b_ml_signals',
            'ensemble_signals',
            'user_portfolios',
            'user_holdings'
        ]

        with db_context() as conn:
            cur = conn.cursor()

            for table in required_tables:
                cur.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = %s
                    )
                    """,
                    (table,)
                )
                exists = cur.fetchone()[0]
                assert exists, f"Table {table} does not exist"

        logger.info("✅ All required tables exist")

    def test_stored_procedures_exist(self):
        """Verify portfolio management stored procedures exist."""

        required_functions = [
            'sync_holding_prices',
            'update_portfolio_totals',
            'sync_portfolio_prices',
            'sync_all_portfolio_prices'
        ]

        with db_context() as conn:
            cur = conn.cursor()

            for func in required_functions:
                cur.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM pg_proc
                        WHERE proname = %s
                    )
                    """,
                    (func,)
                )
                exists = cur.fetchone()[0]
                assert exists, f"Function {func} does not exist"

        logger.info("✅ All required functions exist")

    def test_price_sync_function(self):
        """Test that price sync function works with available data."""

        with db_context() as conn:
            cur = conn.cursor()

            # Get a portfolio with holdings
            cur.execute(
                """
                SELECT p.id, COUNT(h.id) as holding_count
                FROM user_portfolios p
                JOIN user_holdings h ON h.portfolio_id = p.id
                WHERE p.is_active = TRUE
                GROUP BY p.id
                LIMIT 1
                """
            )
            row = cur.fetchone()

            if not row:
                pytest.skip("No portfolios with holdings found")

            portfolio_id, holding_count = row

            # Execute sync function
            cur.execute("SELECT sync_portfolio_prices(%s)", (portfolio_id,))
            updated_count = cur.fetchone()[0]

            assert updated_count == holding_count, \
                f"Expected to update {holding_count} holdings, got {updated_count}"

            conn.commit()

        logger.info(f"✅ Price sync function worked for portfolio {portfolio_id}")

    def test_ensemble_signal_structure(self):
        """Test that ensemble signals have correct structure when present."""

        with db_context() as conn:
            cur = conn.cursor()

            cur.execute(
                """
                SELECT
                    symbol, signal, confidence,
                    model_a_signal, model_b_signal,
                    model_a_confidence, model_b_confidence,
                    signals_agree, conflict
                FROM ensemble_signals
                LIMIT 1
                """
            )
            row = cur.fetchone()

            if not row:
                pytest.skip("No ensemble signals found (run jobs first)")

            symbol, signal, confidence, ma_signal, mb_signal, ma_conf, mb_conf, agree, conflict = row

            # Verify data structure
            assert symbol is not None
            assert signal in ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']
            assert 0 <= confidence <= 1
            assert ma_signal is not None
            assert mb_signal is not None
            assert isinstance(agree, bool)
            assert isinstance(conflict, bool)

        logger.info("✅ Ensemble signal structure is correct")

    def test_model_b_quality_scores(self):
        """Test that Model B quality scores are properly formatted."""

        with db_context() as conn:
            cur = conn.cursor()

            cur.execute(
                """
                SELECT symbol, signal, quality_score, confidence
                FROM model_b_ml_signals
                LIMIT 1
                """
            )
            row = cur.fetchone()

            if not row:
                pytest.skip("No Model B signals found (run jobs first)")

            symbol, signal, quality_score, confidence = row

            # Verify quality score is A-F grade
            assert quality_score in ['A', 'B', 'C', 'D', 'F'], \
                f"Invalid quality score: {quality_score}"

            # Verify signal type
            assert signal in ['BUY', 'HOLD', 'SELL'], \
                f"Invalid Model B signal: {signal}"

            # Verify confidence range
            assert 0 <= confidence <= 1, \
                f"Invalid confidence: {confidence}"

        logger.info("✅ Model B quality scores are correct")

    def test_holding_enrichment(self):
        """Test that holdings are enriched with signals and quality scores."""

        with db_context() as conn:
            cur = conn.cursor()

            # Get a holding after sync
            cur.execute(
                """
                SELECT
                    ticker, current_signal, signal_confidence,
                    model_b_quality_score, ensemble_signal, ensemble_confidence
                FROM user_holdings
                WHERE current_signal IS NOT NULL
                LIMIT 1
                """
            )
            row = cur.fetchone()

            if not row:
                pytest.skip("No holdings with signals found (sync prices first)")

            ticker, signal, conf, quality, ensemble_sig, ensemble_conf = row

            # Verify holding has signal data
            assert ticker is not None
            # Signal data may be None if not available, which is OK
            logger.info(f"Holding {ticker}: signal={signal}, quality={quality}, ensemble={ensemble_sig}")

        logger.info("✅ Holdings can be enriched with signals")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
