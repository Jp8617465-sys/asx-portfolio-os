"""
jobs/__tests__/test_sync_etf_holdings.py
Unit tests for ETF holdings sync job.
Tests EODHD API integration, data parsing, and database upsert operations.
"""

import os
from datetime import date
from unittest.mock import MagicMock, Mock, call, patch

import pytest
import requests


class TestSyncETFHoldingsJob:
    """Test ETF holdings sync job."""

    @patch('jobs.sync_etf_holdings.requests.get')
    def test_fetches_holdings_from_eodhd_api(self, mock_get):
        """Should fetch holdings from EODHD API with correct parameters."""
        from jobs.sync_etf_holdings import fetch_etf_holdings

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'Holdings': {
                'BHP.AX': {
                    'Code': 'BHP.AX',
                    'Name': 'BHP Group Limited',
                    'Assets_%': 5.23,
                    'Number of Shares': 1000000,
                    'Market Value': 45000000.0
                }
            }
        }
        mock_get.return_value = mock_response

        api_key = 'test-api-key'
        result = fetch_etf_holdings('IOZ.AX', api_key)

        # Verify API call
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert 'https://eodhd.com/api/fundamentals/IOZ.AX' in call_args[0][0]
        assert call_args[1]['params']['api_token'] == api_key
        assert 'filter=Holdings' in str(call_args[1]['params']) or call_args[1]['params'].get('filter') == 'Holdings'

        # Verify result
        assert isinstance(result, list)
        assert len(result) > 0

    @patch('jobs.sync_etf_holdings.requests.get')
    def test_parses_eodhd_response_correctly(self, mock_get):
        """Should correctly parse EODHD holdings response."""
        from jobs.sync_etf_holdings import fetch_etf_holdings

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'Holdings': {
                'BHP.AX': {
                    'Code': 'BHP.AX',
                    'Name': 'BHP Group Limited',
                    'Assets_%': 5.23,
                    'Number of Shares': 1000000,
                    'Market Value': 45000000.0
                },
                'CBA.AX': {
                    'Code': 'CBA.AX',
                    'Name': 'Commonwealth Bank',
                    'Assets_%': 4.87,
                    'Number of Shares': 500000,
                    'Market Value': 52000000.0
                }
            }
        }
        mock_get.return_value = mock_response

        result = fetch_etf_holdings('IOZ.AX', 'test-api-key')

        assert len(result) == 2

        # Check first holding
        bhp = next(h for h in result if h['holding_symbol'] == 'BHP.AX')
        assert bhp['holding_name'] == 'BHP Group Limited'
        assert bhp['weight'] == 5.23
        assert bhp['shares'] == 1000000
        assert bhp['market_value'] == 45000000.0

        # Check second holding
        cba = next(h for h in result if h['holding_symbol'] == 'CBA.AX')
        assert cba['holding_name'] == 'Commonwealth Bank'
        assert cba['weight'] == 4.87

    @patch('jobs.sync_etf_holdings.requests.get')
    @patch('jobs.sync_etf_holdings.logger')
    def test_handles_api_error_gracefully(self, mock_logger, mock_get):
        """Should handle EODHD API errors gracefully and log them."""
        from jobs.sync_etf_holdings import fetch_etf_holdings

        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()
        mock_get.return_value = mock_response

        result = fetch_etf_holdings('IOZ.AX', 'test-api-key')

        # Should return empty list on error
        assert result == []

        # Should log the error
        mock_logger.error.assert_called()

    @patch('jobs.sync_etf_holdings.requests.get')
    def test_handles_empty_response(self, mock_get):
        """Should handle empty holdings response."""
        from jobs.sync_etf_holdings import fetch_etf_holdings

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'Holdings': {}}
        mock_get.return_value = mock_response

        result = fetch_etf_holdings('IOZ.AX', 'test-api-key')

        assert result == []

    @patch('jobs.sync_etf_holdings.execute_values')
    def test_inserts_holdings_into_database(self, mock_execute_values):
        """Should insert holdings into database with ON CONFLICT handling."""
        from jobs.sync_etf_holdings import upsert_holdings

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        holdings = [
            {
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Limited',
                'weight': 5.23,
                'shares': 1000000,
                'market_value': 45000000.0,
                'sector': None
            },
            {
                'holding_symbol': 'CBA.AX',
                'holding_name': 'Commonwealth Bank',
                'weight': 4.87,
                'shares': 500000,
                'market_value': 52000000.0,
                'sector': None
            }
        ]

        as_of = date(2026, 2, 7)
        result = upsert_holdings(mock_conn, 'IOZ.AX', holdings, as_of)

        # Verify cursor was called
        mock_conn.cursor.assert_called_once()

        # Verify execute_values was called with correct SQL pattern
        mock_execute_values.assert_called_once()
        sql = mock_execute_values.call_args[0][1]
        assert 'INSERT INTO ETF_HOLDINGS' in sql.upper()
        assert 'ON CONFLICT' in sql.upper()

        # Verify data rows
        data_rows = mock_execute_values.call_args[0][2]
        assert len(data_rows) == 2
        assert data_rows[0][0] == 'IOZ.AX'  # etf_symbol
        assert data_rows[0][1] == 'BHP.AX'  # holding_symbol

        # Verify return count
        assert result == 2

    @patch('jobs.sync_etf_holdings.upsert_holdings')
    @patch('jobs.sync_etf_holdings.fetch_etf_holdings')
    @patch('jobs.sync_etf_holdings.db')
    @patch('jobs.sync_etf_holdings.return_conn')
    def test_processes_multiple_etfs(self, mock_return_conn, mock_db, mock_fetch, mock_upsert):
        """Should loop through and process all tracked ETFs."""
        from jobs.sync_etf_holdings import run, TRACKED_ETFS

        mock_conn = MagicMock()
        mock_db.return_value = mock_conn

        # Mock fetch to return different holdings for each ETF
        mock_fetch.side_effect = [
            [{'holding_symbol': 'BHP.AX', 'holding_name': 'BHP', 'weight': 5.0, 'shares': 1000, 'market_value': 50000, 'sector': None}],
            [{'holding_symbol': 'CBA.AX', 'holding_name': 'CBA', 'weight': 4.0, 'shares': 500, 'market_value': 40000, 'sector': None}],
            [{'holding_symbol': 'CSL.AX', 'holding_name': 'CSL', 'weight': 3.0, 'shares': 300, 'market_value': 30000, 'sector': None}],
            [{'holding_symbol': 'WES.AX', 'holding_name': 'WES', 'weight': 2.0, 'shares': 200, 'market_value': 20000, 'sector': None}],
            [{'holding_symbol': 'WOW.AX', 'holding_name': 'WOW', 'weight': 1.0, 'shares': 100, 'market_value': 10000, 'sector': None}],
        ]

        mock_upsert.return_value = 1

        run()

        # Verify fetch was called for each tracked ETF
        assert mock_fetch.call_count == len(TRACKED_ETFS)

        # Verify all ETFs were processed
        fetched_symbols = [call[0][0] for call in mock_fetch.call_args_list]
        for etf in TRACKED_ETFS:
            assert etf in fetched_symbols

    @patch('jobs.sync_etf_holdings.upsert_holdings')
    @patch('jobs.sync_etf_holdings.fetch_etf_holdings')
    @patch('jobs.sync_etf_holdings.db')
    @patch('jobs.sync_etf_holdings.return_conn')
    @patch('jobs.sync_etf_holdings.logger')
    def test_skips_etf_on_api_failure(self, mock_logger, mock_return_conn, mock_db, mock_fetch, mock_upsert):
        """Should continue processing other ETFs when one fails."""
        from jobs.sync_etf_holdings import run, TRACKED_ETFS

        mock_conn = MagicMock()
        mock_db.return_value = mock_conn

        # First ETF returns empty (error), others succeed
        mock_fetch.side_effect = [
            [],  # IOZ.AX fails
            [{'holding_symbol': 'BHP.AX', 'holding_name': 'BHP', 'weight': 5.0, 'shares': 1000, 'market_value': 50000, 'sector': None}],
            [{'holding_symbol': 'CBA.AX', 'holding_name': 'CBA', 'weight': 4.0, 'shares': 500, 'market_value': 40000, 'sector': None}],
            [{'holding_symbol': 'CSL.AX', 'holding_name': 'CSL', 'weight': 3.0, 'shares': 300, 'market_value': 30000, 'sector': None}],
            [{'holding_symbol': 'WES.AX', 'holding_name': 'WES', 'weight': 2.0, 'shares': 200, 'market_value': 20000, 'sector': None}],
        ]

        mock_upsert.return_value = 1

        run()

        # Verify all ETFs were attempted
        assert mock_fetch.call_count == len(TRACKED_ETFS)

        # Verify upsert was only called for successful fetches (4 times, not 5)
        assert mock_upsert.call_count == 4

        # Verify warning was logged for empty holdings
        assert any('no holdings' in str(call).lower() or 'skipping' in str(call).lower()
                   for call in mock_logger.warning.call_args_list)

    @patch('jobs.sync_etf_holdings.upsert_holdings')
    @patch('jobs.sync_etf_holdings.fetch_etf_holdings')
    @patch('jobs.sync_etf_holdings.db')
    @patch('jobs.sync_etf_holdings.return_conn')
    @patch('jobs.sync_etf_holdings.logger')
    def test_logs_summary_on_completion(self, mock_logger, mock_return_conn, mock_db, mock_fetch, mock_upsert):
        """Should log summary statistics on job completion."""
        from jobs.sync_etf_holdings import run, TRACKED_ETFS

        mock_conn = MagicMock()
        mock_db.return_value = mock_conn

        # Mock successful fetches
        mock_fetch.return_value = [
            {'holding_symbol': 'BHP.AX', 'holding_name': 'BHP', 'weight': 5.0, 'shares': 1000, 'market_value': 50000, 'sector': None}
        ]

        mock_upsert.return_value = 10  # Each ETF has 10 holdings

        run()

        # Verify info logs include summary
        info_calls = [str(call) for call in mock_logger.info.call_args_list]
        summary_logs = [log for log in info_calls if 'total' in log.lower() or 'summary' in log.lower() or 'synced' in log.lower()]

        assert len(summary_logs) > 0, "Should log a summary with totals"

    @patch('jobs.sync_etf_holdings.requests.get')
    def test_handles_timeout_errors(self, mock_get):
        """Should handle request timeout errors gracefully."""
        from jobs.sync_etf_holdings import fetch_etf_holdings

        mock_get.side_effect = requests.exceptions.Timeout()

        result = fetch_etf_holdings('IOZ.AX', 'test-api-key')

        assert result == []

    @patch('jobs.sync_etf_holdings.requests.get')
    def test_handles_malformed_json_response(self, mock_get):
        """Should handle malformed JSON responses gracefully."""
        from jobs.sync_etf_holdings import fetch_etf_holdings

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("Invalid JSON")
        mock_get.return_value = mock_response

        result = fetch_etf_holdings('IOZ.AX', 'test-api-key')

        assert result == []

    @patch('jobs.sync_etf_holdings.execute_values')
    def test_upsert_handles_partial_data(self, mock_execute_values):
        """Should handle holdings with missing optional fields."""
        from jobs.sync_etf_holdings import upsert_holdings

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        holdings = [
            {
                'holding_symbol': 'BHP.AX',
                'holding_name': None,  # Missing name
                'weight': None,  # Missing weight
                'shares': 1000000,
                'market_value': None,  # Missing market value
                'sector': 'Materials'
            }
        ]

        as_of = date(2026, 2, 7)
        result = upsert_holdings(mock_conn, 'IOZ.AX', holdings, as_of)

        # Should still process the holding
        mock_execute_values.assert_called_once()

        # Verify data row has None values where appropriate
        data_rows = mock_execute_values.call_args[0][2]
        assert len(data_rows) == 1

        result_row = data_rows[0]
        assert result_row[0] == 'IOZ.AX'
        assert result_row[1] == 'BHP.AX'
        # Verify None values are preserved
        assert None in result_row
