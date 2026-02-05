"""
Tests for PortfolioService - Test-Driven Development

This test suite drives the implementation of PortfolioService by defining
the expected behavior BEFORE implementation (RED phase).
"""

# Set environment variables BEFORE any imports
import os
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['EODHD_API_KEY'] = 'test_key'
os.environ['OS_API_KEY'] = 'test_api_key'
os.environ['JWT_SECRET_KEY'] = 'test_secret_key_for_testing_only'

import pytest
from unittest.mock import Mock, MagicMock, patch, call
from datetime import date, datetime
import io
import csv

# These imports will fail initially - that's intentional for TDD
from app.features.portfolio.services.portfolio_service import PortfolioService
from app.features.portfolio.repositories.portfolio_repository import PortfolioRepository
from app.core.events.event_bus import EventType, Event


class TestPortfolioServiceCSVParsing:
    """Test CSV parsing logic - _parse_csv method."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    def test_parse_csv_valid_data(self):
        """Test parsing valid CSV content."""
        csv_content = """ticker,shares,avg_cost,date_acquired
BHP.AX,100,45.50,2023-06-15
CBA.AX,50,95.00,2023-08-20
RIO.AX,75,120.50,2023-09-10"""

        holdings = self.service._parse_csv(csv_content)

        assert len(holdings) == 3
        assert holdings[0]['ticker'] == 'BHP.AX'
        assert holdings[0]['shares'] == 100.0
        assert holdings[0]['avg_cost'] == 45.50
        assert holdings[0]['date_acquired'] == '2023-06-15'

    def test_parse_csv_adds_ax_suffix(self):
        """Test that .AX suffix is added to tickers without it."""
        csv_content = """ticker,shares,avg_cost
BHP,100,45.50
CBA.AX,50,95.00"""

        holdings = self.service._parse_csv(csv_content)

        assert holdings[0]['ticker'] == 'BHP.AX'
        assert holdings[1]['ticker'] == 'CBA.AX'

    def test_parse_csv_uppercase_tickers(self):
        """Test that tickers are converted to uppercase."""
        csv_content = """ticker,shares,avg_cost
bhp,100,45.50
cba.ax,50,95.00"""

        holdings = self.service._parse_csv(csv_content)

        assert holdings[0]['ticker'] == 'BHP.AX'
        assert holdings[1]['ticker'] == 'CBA.AX'

    def test_parse_csv_missing_columns(self):
        """Test that missing required columns raises ValueError."""
        csv_content = """ticker,shares
BHP.AX,100"""

        with pytest.raises(ValueError) as exc_info:
            self.service._parse_csv(csv_content)

        assert "must have columns: ticker, shares, avg_cost" in str(exc_info.value)

    def test_parse_csv_empty_content(self):
        """Test that empty CSV raises ValueError."""
        csv_content = """ticker,shares,avg_cost"""

        with pytest.raises(ValueError) as exc_info:
            self.service._parse_csv(csv_content)

        assert "No valid holdings found" in str(exc_info.value)

    def test_parse_csv_invalid_number(self):
        """Test that invalid numbers raise ValueError."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,invalid,45.50"""

        with pytest.raises(ValueError) as exc_info:
            self.service._parse_csv(csv_content)

        assert "invalid" in str(exc_info.value).lower()

    def test_parse_csv_optional_date_acquired(self):
        """Test that date_acquired is optional."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,100,45.50"""

        holdings = self.service._parse_csv(csv_content)

        assert len(holdings) == 1
        assert holdings[0]['date_acquired'] is None


class TestPortfolioServiceValidation:
    """Test holdings validation logic - _validate_holdings method."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    def test_validate_holdings_valid_data(self):
        """Test validation with valid holdings data."""
        holdings = [
            {'ticker': 'BHP.AX', 'shares': 100.0, 'avg_cost': 45.50, 'date_acquired': None},
            {'ticker': 'CBA.AX', 'shares': 50.0, 'avg_cost': 95.00, 'date_acquired': '2023-08-20'},
        ]

        # Should not raise any exception
        self.service._validate_holdings(holdings)

    def test_validate_holdings_negative_shares(self):
        """Test that negative shares raises ValueError."""
        holdings = [
            {'ticker': 'BHP.AX', 'shares': -100.0, 'avg_cost': 45.50, 'date_acquired': None},
        ]

        with pytest.raises(ValueError) as exc_info:
            self.service._validate_holdings(holdings)

        assert "Shares must be positive" in str(exc_info.value)
        assert "BHP.AX" in str(exc_info.value)

    def test_validate_holdings_zero_shares(self):
        """Test that zero shares raises ValueError."""
        holdings = [
            {'ticker': 'BHP.AX', 'shares': 0.0, 'avg_cost': 45.50, 'date_acquired': None},
        ]

        with pytest.raises(ValueError) as exc_info:
            self.service._validate_holdings(holdings)

        assert "Shares must be positive" in str(exc_info.value)

    def test_validate_holdings_negative_cost(self):
        """Test that negative cost raises ValueError."""
        holdings = [
            {'ticker': 'BHP.AX', 'shares': 100.0, 'avg_cost': -45.50, 'date_acquired': None},
        ]

        with pytest.raises(ValueError) as exc_info:
            self.service._validate_holdings(holdings)

        assert "Average cost must be non-negative" in str(exc_info.value)
        assert "BHP.AX" in str(exc_info.value)

    def test_validate_holdings_empty_ticker(self):
        """Test that empty ticker raises ValueError."""
        holdings = [
            {'ticker': '', 'shares': 100.0, 'avg_cost': 45.50, 'date_acquired': None},
        ]

        with pytest.raises(ValueError) as exc_info:
            self.service._validate_holdings(holdings)

        assert "Ticker cannot be empty" in str(exc_info.value)


class TestPortfolioServiceUpload:
    """Test upload_and_analyze_portfolio method."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    @patch.object(PortfolioService, 'publish_event')
    def test_upload_creates_new_portfolio(self, mock_publish):
        """Test uploading to a user without existing portfolio."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,100,45.50
CBA.AX,50,95.00"""

        # Mock: no existing portfolio
        self.mock_repo.get_portfolio_by_user_id.return_value = None
        self.mock_repo.create_portfolio.return_value = 456
        self.mock_repo.create_holding.side_effect = [789, 790]

        result = self.service.upload_and_analyze_portfolio(
            user_id=123,
            csv_content=csv_content,
            portfolio_name="Test Portfolio"
        )

        # Verify portfolio was created
        self.mock_repo.create_portfolio.assert_called_once_with(
            user_id=123,
            name="Test Portfolio",
            cash_balance=0
        )

        # Verify holdings were created
        assert self.mock_repo.create_holding.call_count == 2

        # Verify prices were synced
        assert self.mock_repo.sync_holding_prices.call_count == 2
        self.mock_repo.sync_holding_prices.assert_any_call(789)
        self.mock_repo.sync_holding_prices.assert_any_call(790)

        # Verify totals were updated
        self.mock_repo.update_portfolio_totals.assert_called_once_with(456)

        # Verify result
        assert result['status'] == 'success'
        assert result['portfolio_id'] == 456
        assert result['holdings_count'] == 2

        # Verify event was published
        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][0] == EventType.PORTFOLIO_CHANGED
        assert call_args[0][1]['portfolio_id'] == 456
        assert call_args[0][1]['action'] == 'upload'
        assert call_args[0][1]['holdings_count'] == 2

    @patch.object(PortfolioService, 'publish_event')
    def test_upload_replaces_existing_holdings(self, mock_publish):
        """Test uploading to a user with existing portfolio."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,100,45.50"""

        # Mock: existing portfolio
        self.mock_repo.get_portfolio_by_user_id.return_value = {
            'id': 456,
            'user_id': 123,
            'name': 'Existing Portfolio'
        }
        self.mock_repo.delete_holdings_by_portfolio.return_value = 3
        self.mock_repo.create_holding.return_value = 789

        result = self.service.upload_and_analyze_portfolio(
            user_id=123,
            csv_content=csv_content,
            portfolio_name="Updated Portfolio"
        )

        # Verify portfolio was NOT created
        self.mock_repo.create_portfolio.assert_not_called()

        # Verify existing holdings were deleted
        self.mock_repo.delete_holdings_by_portfolio.assert_called_once_with(456)

        # Verify result uses existing portfolio ID
        assert result['portfolio_id'] == 456
        assert result['holdings_count'] == 1

    def test_upload_invalid_csv(self):
        """Test that invalid CSV raises ValueError."""
        csv_content = """ticker,shares
BHP.AX,100"""  # Missing avg_cost column

        with pytest.raises(ValueError) as exc_info:
            self.service.upload_and_analyze_portfolio(
                user_id=123,
                csv_content=csv_content,
                portfolio_name="Test Portfolio"
            )

        assert "must have columns" in str(exc_info.value)

    def test_upload_validates_holdings(self):
        """Test that validation is called during upload."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,-100,45.50"""  # Negative shares

        with pytest.raises(ValueError) as exc_info:
            self.service.upload_and_analyze_portfolio(
                user_id=123,
                csv_content=csv_content,
                portfolio_name="Test Portfolio"
            )

        assert "Shares must be positive" in str(exc_info.value)


class TestPortfolioServiceGetPortfolio:
    """Test get_portfolio_with_holdings method."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    def test_get_portfolio_with_holdings(self):
        """Test retrieving portfolio with holdings."""
        # Mock portfolio data
        self.mock_repo.get_portfolio_by_user_id.return_value = {
            'id': 456,
            'user_id': 123,
            'name': 'Test Portfolio',
            'total_value': 10000.0,
            'total_cost_basis': 8000.0,
            'total_pl': 2000.0,
            'total_pl_pct': 25.0,
            'cash_balance': 500.0,
            'last_synced_at': datetime(2024, 1, 15, 10, 30, 0)
        }

        # Mock holdings data
        self.mock_repo.get_holdings.return_value = [
            {
                'id': 789,
                'ticker': 'BHP.AX',
                'shares': 100.0,
                'avg_cost': 45.50,
                'current_price': 50.00,
                'current_value': 5000.0,
                'cost_basis': 4550.0,
                'unrealized_pl': 450.0,
                'unrealized_pl_pct': 9.89,
                'current_signal': 'BUY',
                'signal_confidence': 0.75,
                'date_acquired': date(2023, 6, 15)
            }
        ]

        result = self.service.get_portfolio_with_holdings(user_id=123)

        # Verify repository calls
        self.mock_repo.get_portfolio_by_user_id.assert_called_once_with(123)
        self.mock_repo.get_holdings.assert_called_once_with(456)

        # Verify result structure
        assert result['portfolio_id'] == 456
        assert result['user_id'] == 123
        assert result['name'] == 'Test Portfolio'
        assert result['num_holdings'] == 1
        assert len(result['holdings']) == 1
        assert result['holdings'][0]['ticker'] == 'BHP.AX'

    def test_get_portfolio_not_found(self):
        """Test that ValueError is raised when portfolio not found."""
        self.mock_repo.get_portfolio_by_user_id.return_value = None

        with pytest.raises(ValueError) as exc_info:
            self.service.get_portfolio_with_holdings(user_id=123)

        assert "Portfolio not found" in str(exc_info.value)

    def test_get_portfolio_enriches_holdings(self):
        """Test that holdings are enriched with calculated fields."""
        self.mock_repo.get_portfolio_by_user_id.return_value = {
            'id': 456,
            'user_id': 123,
            'name': 'Test Portfolio'
        }

        self.mock_repo.get_holdings.return_value = [
            {
                'id': 789,
                'ticker': 'BHP.AX',
                'shares': 100.0,
                'avg_cost': 45.50,
                'current_price': None,  # No price data yet
                'current_value': None,
                'date_acquired': None
            }
        ]

        result = self.service.get_portfolio_with_holdings(user_id=123)

        # Verify holdings are included even without price data
        assert len(result['holdings']) == 1
        assert result['holdings'][0]['current_price'] is None


class TestPortfolioServiceAnalyze:
    """Test analyze_portfolio method - sync prices and signals."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    @patch.object(PortfolioService, 'publish_event')
    @patch.object(PortfolioService, 'get_portfolio_with_holdings')
    def test_analyze_portfolio_syncs_prices(self, mock_get_portfolio, mock_publish):
        """Test that analyze_portfolio syncs prices and signals."""
        # Mock portfolio exists
        self.mock_repo.get_portfolio_by_user_id.return_value = {
            'id': 456,
            'user_id': 123
        }

        # Mock sync returns count
        self.mock_repo.sync_portfolio_prices.return_value = 5

        # Mock get_portfolio_with_holdings return
        mock_get_portfolio.return_value = {
            'portfolio_id': 456,
            'holdings': []
        }

        result = self.service.analyze_portfolio(user_id=123)

        # Verify sync was called
        self.mock_repo.sync_portfolio_prices.assert_called_once_with(456)

        # Verify event was published
        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][0] == EventType.PORTFOLIO_CHANGED
        assert call_args[0][1]['action'] == 'analyze'
        assert call_args[0][1]['synced_count'] == 5

        # Verify get_portfolio_with_holdings was called
        mock_get_portfolio.assert_called_once_with(user_id=123, portfolio_id=456)

    def test_analyze_portfolio_not_found(self):
        """Test that ValueError is raised when portfolio not found."""
        self.mock_repo.get_portfolio_by_user_id.return_value = None

        with pytest.raises(ValueError) as exc_info:
            self.service.analyze_portfolio(user_id=123)

        assert "Portfolio not found" in str(exc_info.value)


class TestPortfolioServiceEventPublishing:
    """Test event publishing integration."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    @patch.object(PortfolioService, 'publish_event')
    def test_publish_event_on_upload(self, mock_publish):
        """Test that PORTFOLIO_CHANGED event is published on upload."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,100,45.50"""

        self.mock_repo.get_portfolio_by_user_id.return_value = None
        self.mock_repo.create_portfolio.return_value = 456
        self.mock_repo.create_holding.return_value = 789

        self.service.upload_and_analyze_portfolio(
            user_id=123,
            csv_content=csv_content,
            portfolio_name="Test Portfolio"
        )

        # Verify event was published with correct parameters
        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][0] == EventType.PORTFOLIO_CHANGED
        assert call_args[0][1]['action'] == 'upload'

    @patch.object(PortfolioService, 'publish_event')
    def test_publish_event_on_analyze(self, mock_publish):
        """Test that PORTFOLIO_CHANGED event is published on analyze."""
        self.mock_repo.get_portfolio_by_user_id.return_value = {
            'id': 456,
            'user_id': 123,
            'name': 'Test Portfolio',
            'total_value': None,
            'total_cost_basis': None,
            'total_pl': None,
            'total_pl_pct': None,
            'cash_balance': 0.0,
            'last_synced_at': None
        }
        self.mock_repo.sync_portfolio_prices.return_value = 5

        # Mock get_holdings for get_portfolio_with_holdings
        self.mock_repo.get_holdings.return_value = []

        self.service.analyze_portfolio(user_id=123)

        # Verify event was published with correct parameters
        mock_publish.assert_called_once()
        call_args = mock_publish.call_args
        assert call_args[0][0] == EventType.PORTFOLIO_CHANGED
        assert call_args[0][1]['action'] == 'analyze'


class TestPortfolioServiceErrorHandling:
    """Test error handling and edge cases."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_repo = Mock(spec=PortfolioRepository)
        self.service = PortfolioService(repository=self.mock_repo)

    def test_repository_error_propagates(self):
        """Test that repository errors are propagated."""
        self.mock_repo.get_portfolio_by_user_id.side_effect = Exception("Database error")

        with pytest.raises(Exception) as exc_info:
            self.service.get_portfolio_with_holdings(user_id=123)

        assert "Database error" in str(exc_info.value)

    def test_upload_handles_sync_failure(self):
        """Test that sync failures during upload are handled gracefully."""
        csv_content = """ticker,shares,avg_cost
BHP.AX,100,45.50"""

        self.mock_repo.get_portfolio_by_user_id.return_value = None
        self.mock_repo.create_portfolio.return_value = 456
        self.mock_repo.create_holding.return_value = 789
        self.mock_repo.sync_holding_prices.side_effect = Exception("Sync failed")

        # Should raise the exception
        with pytest.raises(Exception) as exc_info:
            self.service.upload_and_analyze_portfolio(
                user_id=123,
                csv_content=csv_content,
                portfolio_name="Test Portfolio"
            )

        assert "Sync failed" in str(exc_info.value)
