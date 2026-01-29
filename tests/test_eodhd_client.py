"""
Unit tests for EODHD client fundamentals fetching.
Tests API integration, error handling, and data parsing.
"""

import os
from unittest.mock import Mock, patch
import pytest
import requests
from api_clients.eodhd_client import fetch_fundamentals_eodhd, fetch_fundamentals_batch


class TestFetchFundamentalsEODHD:
    """Test EODHD fundamentals API client."""

    @patch('api_clients.eodhd_client.requests.get')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_fundamentals_success(self, mock_sleep, mock_get):
        """Should successfully fetch and parse fundamentals data."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'General': {
                'Sector': 'Materials',
                'Industry': 'Mining',
                'MostRecentQuarter': '2025-12-31'
            },
            'Highlights': {
                'MarketCapitalization': 150000000000,
                'EarningsShare': 2.45,
                'DividendYield': 0.045
            },
            'Valuation': {
                'TrailingPE': 12.5,
                'PriceBookMRQ': 2.3
            },
            'Financials': {
                'Ratios': {
                    'ReturnOnEquityTTM': 0.18,
                    'TotalDebtEquityTTM': 0.45
                }
            }
        }
        mock_get.return_value = mock_response

        result = fetch_fundamentals_eodhd('BHP', api_key='test-key', throttle_s=0)

        assert result is not None
        assert result['symbol'] == 'BHP.AU'
        assert result['sector'] == 'Materials'
        assert result['industry'] == 'Mining'
        assert result['pe_ratio'] == 12.5
        assert result['pb_ratio'] == 2.3
        assert result['roe'] == 0.18
        assert result['debt_to_equity'] == 0.45
        assert result['market_cap'] == 150000000000
        assert result['div_yield'] == 0.045
        assert result['period_end'] == '2025-12-31'
        assert 'updated_at' in result

    @patch('api_clients.eodhd_client.requests.get')
    def test_fetch_fundamentals_http_error(self, mock_get):
        """Should return None on HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()
        mock_get.return_value = mock_response

        result = fetch_fundamentals_eodhd('INVALID', api_key='test-key', throttle_s=0)

        assert result is None

    @patch('api_clients.eodhd_client.requests.get')
    def test_fetch_fundamentals_request_timeout(self, mock_get):
        """Should return None on request timeout."""
        mock_get.side_effect = requests.exceptions.Timeout()

        result = fetch_fundamentals_eodhd('BHP', api_key='test-key', throttle_s=0)

        assert result is None

    @patch('api_clients.eodhd_client.requests.get')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_fundamentals_missing_api_key(self, mock_sleep, mock_get):
        """Should return None when API key is missing."""
        with patch.dict(os.environ, {}, clear=True):
            result = fetch_fundamentals_eodhd('BHP', api_key=None, throttle_s=0)

        assert result is None
        mock_get.assert_not_called()

    @patch('api_clients.eodhd_client.requests.get')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_fundamentals_adds_au_suffix(self, mock_sleep, mock_get):
        """Should add .AU suffix to tickers without it."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'General': {'Sector': 'Test'},
            'Highlights': {},
            'Valuation': {},
            'Financials': {'Ratios': {}}
        }
        mock_get.return_value = mock_response

        result = fetch_fundamentals_eodhd('BHP', api_key='test-key', throttle_s=0)

        # Verify API was called with .AU suffix
        call_args = mock_get.call_args
        assert 'BHP.AU' in call_args[0][0]

    @patch('api_clients.eodhd_client.requests.get')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_fundamentals_preserves_au_suffix(self, mock_sleep, mock_get):
        """Should not double-add .AU suffix."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'General': {'Sector': 'Test'},
            'Highlights': {},
            'Valuation': {},
            'Financials': {'Ratios': {}}
        }
        mock_get.return_value = mock_response

        result = fetch_fundamentals_eodhd('BHP.AU', api_key='test-key', throttle_s=0)

        # Verify no double suffix
        call_args = mock_get.call_args
        assert 'BHP.AU' in call_args[0][0]
        assert 'BHP.AU.AU' not in call_args[0][0]

    @patch('api_clients.eodhd_client.requests.get')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_fundamentals_handles_missing_fields(self, mock_sleep, mock_get):
        """Should handle missing optional fields gracefully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'General': {'Sector': 'Materials'},
            'Highlights': {},
            'Valuation': {},
            'Financials': {}
        }
        mock_get.return_value = mock_response

        result = fetch_fundamentals_eodhd('BHP', api_key='test-key', throttle_s=0)

        assert result is not None
        assert result['sector'] == 'Materials'
        assert result['pe_ratio'] is None
        assert result['pb_ratio'] is None
        assert result['roe'] is None


class TestFetchFundamentalsBatch:
    """Test batch fundamentals fetching."""

    @patch('api_clients.eodhd_client.fetch_fundamentals_eodhd')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_batch_success(self, mock_sleep, mock_fetch):
        """Should fetch multiple tickers successfully."""
        mock_fetch.side_effect = [
            {'symbol': 'BHP.AU', 'sector': 'Materials', 'pe_ratio': 12.5},
            {'symbol': 'CBA.AU', 'sector': 'Financials', 'pe_ratio': 15.2},
            {'symbol': 'CSL.AU', 'sector': 'Health Care', 'pe_ratio': 32.1}
        ]

        tickers = ['BHP', 'CBA', 'CSL']
        results = fetch_fundamentals_batch(tickers, api_key='test-key', throttle_s=0, batch_size=100)

        assert len(results) == 3
        assert results[0]['symbol'] == 'BHP.AU'
        assert results[1]['symbol'] == 'CBA.AU'
        assert results[2]['symbol'] == 'CSL.AU'
        assert mock_fetch.call_count == 3

    @patch('api_clients.eodhd_client.fetch_fundamentals_eodhd')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_batch_handles_failures(self, mock_sleep, mock_fetch):
        """Should continue on individual failures and exclude None results."""
        mock_fetch.side_effect = [
            {'symbol': 'BHP.AU', 'sector': 'Materials'},
            None,  # CBA fails
            {'symbol': 'CSL.AU', 'sector': 'Health Care'}
        ]

        tickers = ['BHP', 'CBA', 'CSL']
        results = fetch_fundamentals_batch(tickers, api_key='test-key', throttle_s=0, batch_size=100)

        assert len(results) == 2
        assert results[0]['symbol'] == 'BHP.AU'
        assert results[1]['symbol'] == 'CSL.AU'

    @patch('api_clients.eodhd_client.fetch_fundamentals_eodhd')
    @patch('api_clients.eodhd_client.time.sleep')
    def test_fetch_batch_respects_batch_size(self, mock_sleep, mock_fetch):
        """Should sleep after batch_size requests."""
        mock_fetch.return_value = {'symbol': 'TEST.AU'}

        tickers = ['T1', 'T2', 'T3', 'T4', 'T5']
        results = fetch_fundamentals_batch(tickers, api_key='test-key', throttle_s=0, batch_size=2)

        # Should have extra sleeps at positions 2 and 4
        sleep_calls = [call for call in mock_sleep.call_args_list if call[0][0] == 5.0]
        assert len(sleep_calls) == 2  # After 2nd and 4th request

    @patch('api_clients.eodhd_client.fetch_fundamentals_eodhd')
    def test_fetch_batch_empty_list(self, mock_fetch):
        """Should handle empty ticker list."""
        results = fetch_fundamentals_batch([], api_key='test-key', throttle_s=0)

        assert len(results) == 0
        mock_fetch.assert_not_called()
