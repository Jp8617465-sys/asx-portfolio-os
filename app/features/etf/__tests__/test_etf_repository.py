"""
app/features/etf/__tests__/test_etf_repository.py
Comprehensive unit tests for ETFRepository following TDD best practices.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, call
from datetime import date, datetime
from typing import Dict, Any, List

from app.features.etf.repositories.etf_repository import ETFRepository


@pytest.fixture
def mock_execute_values():
    """Mock execute_values function."""
    with patch('app.features.etf.repositories.etf_repository.execute_values') as mock_exec:
        yield mock_exec


class TestETFRepositoryInit:
    """Test ETFRepository initialization."""

    def test_init_sets_table_name(self, repository, mock_logger):
        """Test that init sets the correct table name."""
        assert repository.table_name == 'etf_holdings'

    def test_init_logs_initialization(self, mock_logger):
        """Test that init logs initialization."""
        # Create repository after logger is mocked
        repo = ETFRepository()
        mock_logger.debug.assert_called()


class TestETFRepositoryGetHoldings:
    """Test get_holdings_for_etf method."""

    def test_get_holdings_for_etf_success(self, repository, mock_db_context, mock_logger):
        """Test getting holdings for an ETF successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        mock_cursor.fetchall.return_value = [
            {
                'id': 1,
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0725,
                'shares_held': 1000000,
                'market_value': 42500000.00,
                'sector': 'Materials',
                'as_of_date': test_date
            },
            {
                'id': 2,
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'CBA.AX',
                'holding_name': 'Commonwealth Bank',
                'weight': 0.0685,
                'shares_held': 500000,
                'market_value': 52500000.00,
                'sector': 'Financials',
                'as_of_date': test_date
            }
        ]

        # Execute
        holdings = repository.get_holdings_for_etf('VAS.AX')

        # Verify
        assert len(holdings) == 2
        assert holdings[0]['holding_symbol'] == 'BHP.AX'
        assert holdings[0]['weight'] == 0.0725
        assert holdings[1]['holding_symbol'] == 'CBA.AX'

        # Verify SQL query
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args
        assert 'SELECT' in call_args[0][0]
        assert 'etf_symbol = %s' in call_args[0][0]

    def test_get_holdings_for_etf_with_date(self, repository, mock_db_context, mock_logger):
        """Test getting holdings for a specific date."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 10)

        mock_cursor.fetchall.return_value = [
            {
                'id': 1,
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0725,
                'shares_held': 1000000,
                'market_value': 42500000.00,
                'sector': 'Materials',
                'as_of_date': test_date
            }
        ]

        # Execute
        holdings = repository.get_holdings_for_etf('VAS.AX', as_of_date=test_date)

        # Verify
        assert len(holdings) == 1
        call_args = mock_cursor.execute.call_args
        assert test_date in call_args[0][1]

    def test_get_holdings_for_etf_empty_results(self, repository, mock_db_context, mock_logger):
        """Test getting holdings when ETF has no holdings."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        holdings = repository.get_holdings_for_etf('INVALID.AX')

        # Verify
        assert holdings == []

    def test_get_holdings_for_etf_db_error(self, repository, mock_db_context, mock_logger):
        """Test error handling when database query fails."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Database error")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.get_holdings_for_etf('VAS.AX')

        assert "Database error" in str(exc_info.value)
        mock_logger.error.assert_called()

    def test_get_holdings_by_date_success(self, repository, mock_db_context, mock_logger):
        """Test getting holdings for multiple ETFs by date."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        mock_cursor.fetchall.return_value = [
            {
                'id': 1,
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0725,
                'shares_held': 1000000,
                'market_value': 42500000.00,
                'sector': 'Materials',
                'as_of_date': test_date
            }
        ]

        # Execute
        holdings = repository.get_holdings_by_date(test_date)

        # Verify
        assert len(holdings) == 1
        call_args = mock_cursor.execute.call_args
        assert 'as_of_date = %s' in call_args[0][0]
        assert test_date in call_args[0][1]


class TestETFRepositoryBulkUpsert:
    """Test bulk_upsert_holdings method."""

    def test_bulk_upsert_holdings_success(self, repository, mock_db_context, mock_execute_values, mock_logger):
        """Test bulk upserting holdings successfully."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        holdings = [
            {
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0725,
                'shares_held': 1000000,
                'market_value': 42500000.00,
                'sector': 'Materials',
                'as_of_date': test_date
            },
            {
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'CBA.AX',
                'holding_name': 'Commonwealth Bank',
                'weight': 0.0685,
                'shares_held': 500000,
                'market_value': 52500000.00,
                'sector': 'Financials',
                'as_of_date': test_date
            }
        ]

        # Execute
        count = repository.bulk_upsert_holdings(holdings)

        # Verify
        assert count == 2
        mock_execute_values.assert_called_once()

        # Verify SQL includes ON CONFLICT
        call_args = mock_execute_values.call_args
        assert 'ON CONFLICT' in call_args[0][1]
        assert 'DO UPDATE SET' in call_args[0][1]

    def test_bulk_upsert_holdings_conflict_update(self, repository, mock_db_context, mock_execute_values, mock_logger):
        """Test bulk upsert handles conflicts with UPDATE."""
        # Setup
        test_date = date(2024, 1, 15)
        holdings = [
            {
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0800,  # Updated weight
                'shares_held': 1100000,  # Updated shares
                'market_value': 50000000.00,  # Updated value
                'sector': 'Materials',
                'as_of_date': test_date
            }
        ]

        # Execute
        count = repository.bulk_upsert_holdings(holdings)

        # Verify
        assert count == 1
        call_args = mock_execute_values.call_args
        assert 'etf_symbol, holding_symbol, as_of_date' in call_args[0][1]
        assert 'weight = EXCLUDED.weight' in call_args[0][1]

    def test_bulk_upsert_holdings_empty_list(self, repository, mock_db_context, mock_execute_values, mock_logger):
        """Test bulk upsert with empty list."""
        # Execute
        count = repository.bulk_upsert_holdings([])

        # Verify
        assert count == 0
        mock_execute_values.assert_not_called()

    def test_bulk_upsert_holdings_db_error(self, repository, mock_db_context, mock_execute_values, mock_logger):
        """Test error handling in bulk upsert."""
        # Setup
        test_date = date(2024, 1, 15)
        holdings = [
            {
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0725,
                'shares_held': 1000000,
                'market_value': 42500000.00,
                'sector': 'Materials',
                'as_of_date': test_date
            }
        ]

        mock_execute_values.side_effect = Exception("Insert failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.bulk_upsert_holdings(holdings)

        assert "Insert failed" in str(exc_info.value)
        mock_logger.error.assert_called()


class TestETFRepositoryGetETFList:
    """Test get_all_etfs method."""

    def test_get_all_etfs_success(self, repository, mock_db_context, mock_logger):
        """Test getting all ETFs with holdings count."""
        # Setup
        mock_cursor = mock_db_context['cursor']

        mock_cursor.fetchall.return_value = [
            {
                'etf_symbol': 'VAS.AX',
                'holdings_count': 200,
                'latest_date': date(2024, 1, 15)
            },
            {
                'etf_symbol': 'VGS.AX',
                'holdings_count': 1500,
                'latest_date': date(2024, 1, 15)
            }
        ]

        # Execute
        etfs = repository.get_all_etfs()

        # Verify
        assert len(etfs) == 2
        assert etfs[0]['etf_symbol'] == 'VAS.AX'
        assert etfs[0]['holdings_count'] == 200
        assert etfs[1]['etf_symbol'] == 'VGS.AX'

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'GROUP BY' in call_args[0][0]
        assert 'COUNT(*)' in call_args[0][0]

    def test_get_all_etfs_empty_results(self, repository, mock_db_context, mock_logger):
        """Test getting ETFs when no data exists."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        etfs = repository.get_all_etfs()

        # Verify
        assert etfs == []

    def test_get_all_etfs_db_error(self, repository, mock_db_context, mock_logger):
        """Test error handling in get_all_etfs."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Query failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.get_all_etfs()

        assert "Query failed" in str(exc_info.value)
        mock_logger.error.assert_called()


class TestETFRepositoryGetSectorAllocation:
    """Test get_sector_allocation method."""

    def test_get_sector_allocation_success(self, repository, mock_db_context, mock_logger):
        """Test getting sector allocation for an ETF."""
        # Setup
        mock_cursor = mock_db_context['cursor']

        mock_cursor.fetchall.return_value = [
            {
                'sector': 'Financials',
                'total_weight': 0.35,
                'holding_count': 25
            },
            {
                'sector': 'Materials',
                'total_weight': 0.22,
                'holding_count': 15
            },
            {
                'sector': 'Healthcare',
                'total_weight': 0.18,
                'holding_count': 12
            }
        ]

        # Execute
        allocations = repository.get_sector_allocation('VAS.AX')

        # Verify
        assert len(allocations) == 3
        assert allocations[0]['sector'] == 'Financials'
        assert allocations[0]['total_weight'] == 0.35
        assert allocations[0]['holding_count'] == 25

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'GROUP BY sector' in call_args[0][0]
        assert 'SUM(weight)' in call_args[0][0]

    def test_get_sector_allocation_with_date(self, repository, mock_db_context, mock_logger):
        """Test getting sector allocation for specific date."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 10)

        mock_cursor.fetchall.return_value = [
            {
                'sector': 'Financials',
                'total_weight': 0.35,
                'holding_count': 25
            }
        ]

        # Execute
        allocations = repository.get_sector_allocation('VAS.AX', as_of_date=test_date)

        # Verify
        call_args = mock_cursor.execute.call_args
        assert test_date in call_args[0][1]

    def test_get_sector_allocation_empty_results(self, repository, mock_db_context, mock_logger):
        """Test sector allocation when ETF has no holdings."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        allocations = repository.get_sector_allocation('INVALID.AX')

        # Verify
        assert allocations == []

    def test_get_sector_allocation_db_error(self, repository, mock_db_context, mock_logger):
        """Test error handling in get_sector_allocation."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Query failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.get_sector_allocation('VAS.AX')

        assert "Query failed" in str(exc_info.value)
        mock_logger.error.assert_called()


class TestETFRepositoryGetLatestDate:
    """Test get_latest_holdings_date method."""

    def test_get_latest_holdings_date_success(self, repository, mock_db_context, mock_logger):
        """Test getting latest holdings date for an ETF."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        test_date = date(2024, 1, 15)

        mock_cursor.fetchone.return_value = {'max_date': test_date}

        # Execute
        latest_date = repository.get_latest_holdings_date('VAS.AX')

        # Verify
        assert latest_date == test_date

        # Verify SQL query
        call_args = mock_cursor.execute.call_args
        assert 'MAX(as_of_date)' in call_args[0][0]
        assert 'etf_symbol = %s' in call_args[0][0]

    def test_get_latest_holdings_date_no_data(self, repository, mock_db_context, mock_logger):
        """Test getting latest date when no holdings exist."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchone.return_value = {'max_date': None}

        # Execute
        latest_date = repository.get_latest_holdings_date('INVALID.AX')

        # Verify
        assert latest_date is None

    def test_get_latest_holdings_date_db_error(self, repository, mock_db_context, mock_logger):
        """Test error handling in get_latest_holdings_date."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.execute.side_effect = Exception("Query failed")

        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            repository.get_latest_holdings_date('VAS.AX')

        assert "Query failed" in str(exc_info.value)
        mock_logger.error.assert_called()


class TestSQLQueryCorrectness:
    """Test SQL query correctness."""

    def test_get_holdings_sql_structure(self, repository, mock_db_context, mock_logger):
        """Test that get_holdings_for_etf generates correct SQL."""
        # Setup
        mock_cursor = mock_db_context['cursor']
        mock_cursor.fetchall.return_value = []

        # Execute
        repository.get_holdings_for_etf('VAS.AX')

        # Verify SQL structure
        call_args = mock_cursor.execute.call_args
        assert 'SELECT' in call_args[0][0]
        assert 'FROM etf_holdings' in call_args[0][0]
        assert 'ORDER BY' in call_args[0][0]

    def test_bulk_upsert_uses_execute_values(self, repository, mock_db_context, mock_execute_values, mock_logger):
        """Test that bulk_upsert_holdings uses execute_values for efficiency."""
        # Setup
        test_date = date(2024, 1, 15)
        holdings = [
            {
                'etf_symbol': 'VAS.AX',
                'holding_symbol': 'BHP.AX',
                'holding_name': 'BHP Group Ltd',
                'weight': 0.0725,
                'shares_held': 1000000,
                'market_value': 42500000.00,
                'sector': 'Materials',
                'as_of_date': test_date
            }
        ]

        # Execute
        repository.bulk_upsert_holdings(holdings)

        # Verify execute_values was used
        mock_execute_values.assert_called_once()
