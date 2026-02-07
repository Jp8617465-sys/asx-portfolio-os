"""
app/features/etf/services/__tests__/test_etf_service.py
TDD tests for ETFService - written FIRST before implementation.

Tests cover:
- Service initialization with DI
- get_etf_holdings with/without signal enrichment
- get_etf_list with holdings counts
- get_sector_allocation
- Event publishing
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import date

from app.features.etf.services.etf_service import ETFService
from app.core.events.event_bus import EventType


# ===========================================================================
# TestETFServiceInit
# ===========================================================================

class TestETFServiceInit:
    """Tests for ETFService initialization."""

    def test_initializes_with_default_repository(self, mock_event_bus):
        """Service creates default repository when none provided."""
        service = ETFService()

        assert service.repo is not None
        assert service.event_bus is not None

    def test_initializes_with_injected_repository(self, mock_event_bus, mock_etf_repository):
        """Service uses injected repository via DI."""
        service = ETFService(repository=mock_etf_repository)

        assert service.repo is mock_etf_repository


# ===========================================================================
# TestETFServiceGetHoldings
# ===========================================================================

class TestETFServiceGetHoldings:
    """Tests for get_etf_holdings method."""

    @pytest.mark.asyncio
    async def test_returns_holdings_for_valid_etf(
        self, mock_event_bus, mock_etf_repository
    ):
        """Returns holdings with correct structure."""
        mock_etf_repository.get_etf_holdings.return_value = {
            "etf_symbol": "STW.AX",
            "holdings_count": 2,
            "as_of_date": "2024-06-15",
            "holdings": [
                {
                    "etf_symbol": "STW.AX",
                    "holding_symbol": "BHP.AX",
                    "holding_name": "BHP Group",
                    "weight": 5.2,
                    "sector": "Materials",
                },
                {
                    "etf_symbol": "STW.AX",
                    "holding_symbol": "CBA.AX",
                    "holding_name": "Commonwealth Bank",
                    "weight": 7.8,
                    "sector": "Financials",
                },
            ],
        }

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_etf_holdings("STW.AX")

        assert result["status"] == "ok"
        assert result["etf_symbol"] == "STW.AX"
        assert result["holdings_count"] == 2
        assert len(result["holdings"]) == 2
        mock_etf_repository.get_etf_holdings.assert_called_once_with(
            etf_symbol="STW.AX", with_signals=False
        )

    @pytest.mark.asyncio
    async def test_enriches_holdings_with_signals_when_requested(
        self, mock_event_bus, mock_etf_repository
    ):
        """with_signals=True enriches holdings with ensemble signals."""
        mock_etf_repository.get_etf_holdings.return_value = {
            "etf_symbol": "STW.AX",
            "holdings_count": 1,
            "as_of_date": "2024-06-15",
            "holdings": [
                {
                    "etf_symbol": "STW.AX",
                    "holding_symbol": "BHP.AX",
                    "holding_name": "BHP Group",
                    "weight": 5.2,
                    "sector": "Materials",
                    "signal": "BUY",
                    "confidence": 0.75,
                },
            ],
        }

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_etf_holdings("STW.AX", with_signals=True)

        assert result["status"] == "ok"
        assert result["holdings"][0]["signal"] == "BUY"
        assert result["holdings"][0]["confidence"] == 0.75
        mock_etf_repository.get_etf_holdings.assert_called_once_with(
            etf_symbol="STW.AX", with_signals=True
        )

    @pytest.mark.asyncio
    async def test_returns_empty_holdings_when_etf_not_found(
        self, mock_event_bus, mock_etf_repository
    ):
        """Returns empty holdings for unknown ETF."""
        mock_etf_repository.get_etf_holdings.return_value = {
            "etf_symbol": "UNKNOWN.AX",
            "holdings_count": 0,
            "as_of_date": None,
            "holdings": [],
        }

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_etf_holdings("UNKNOWN.AX")

        assert result["status"] == "ok"
        assert result["holdings_count"] == 0
        assert result["holdings"] == []

    @pytest.mark.asyncio
    async def test_publishes_data_fetched_event(
        self, mock_event_bus, mock_etf_repository
    ):
        """Publishes DATA_FETCHED event when holdings retrieved."""
        mock_etf_repository.get_etf_holdings.return_value = {
            "etf_symbol": "STW.AX",
            "holdings_count": 5,
            "as_of_date": "2024-06-15",
            "holdings": [{"holding_symbol": f"SYM{i}.AX"} for i in range(5)],
        }

        service = ETFService(repository=mock_etf_repository)
        service.publish_event = AsyncMock()

        await service.get_etf_holdings("STW.AX")

        service.publish_event.assert_called_once()
        call_args = service.publish_event.call_args
        # Note: DATA_FETCHED may not exist in EventType yet, so we check the pattern
        assert "etf_symbol" in call_args[0][1]
        assert call_args[0][1]["etf_symbol"] == "STW.AX"

    @pytest.mark.asyncio
    async def test_handles_repository_errors(
        self, mock_event_bus, mock_etf_repository
    ):
        """Propagates repository errors."""
        mock_etf_repository.get_etf_holdings.side_effect = Exception("DB error")

        service = ETFService(repository=mock_etf_repository)

        with pytest.raises(Exception, match="DB error"):
            await service.get_etf_holdings("STW.AX")


# ===========================================================================
# TestETFServiceGetETFList
# ===========================================================================

class TestETFServiceGetETFList:
    """Tests for get_etf_list method."""

    @pytest.mark.asyncio
    async def test_returns_list_of_etfs_with_holdings_counts(
        self, mock_event_bus, mock_etf_repository
    ):
        """Returns ETF list with holdings counts."""
        mock_etf_repository.get_etf_list.return_value = {
            "count": 2,
            "etfs": [
                {
                    "symbol": "STW.AX",
                    "etf_name": "SPDR S&P/ASX 200",
                    "sector": "Broad Market",
                    "holdings_count": 200,
                },
                {
                    "symbol": "IOZ.AX",
                    "etf_name": "iShares Core S&P/ASX 200",
                    "sector": "Broad Market",
                    "holdings_count": 195,
                },
            ],
        }

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_etf_list()

        assert result["status"] == "ok"
        assert result["count"] == 2
        assert len(result["etfs"]) == 2
        assert result["etfs"][0]["symbol"] == "STW.AX"
        assert result["etfs"][0]["holdings_count"] == 200
        mock_etf_repository.get_etf_list.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_etfs(
        self, mock_event_bus, mock_etf_repository
    ):
        """Returns empty list when no ETFs in database."""
        mock_etf_repository.get_etf_list.return_value = {
            "count": 0,
            "etfs": [],
        }

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_etf_list()

        assert result["status"] == "ok"
        assert result["count"] == 0
        assert result["etfs"] == []

    @pytest.mark.asyncio
    async def test_handles_repository_errors(
        self, mock_event_bus, mock_etf_repository
    ):
        """Propagates repository errors."""
        mock_etf_repository.get_etf_list.side_effect = Exception("DB error")

        service = ETFService(repository=mock_etf_repository)

        with pytest.raises(Exception, match="DB error"):
            await service.get_etf_list()


# ===========================================================================
# TestETFServiceGetSectorAllocation
# ===========================================================================

class TestETFServiceGetSectorAllocation:
    """Tests for get_sector_allocation method."""

    @pytest.mark.asyncio
    async def test_returns_sector_breakdown_for_etf(
        self, mock_event_bus, mock_etf_repository
    ):
        """Returns sector allocation with weights."""
        mock_etf_repository.get_sector_allocation.return_value = [
            {"sector": "Financials", "total_weight": 32.5, "holding_count": 45},
            {"sector": "Materials", "total_weight": 18.2, "holding_count": 30},
            {"sector": "Healthcare", "total_weight": 12.1, "holding_count": 25},
        ]

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_sector_allocation("STW.AX")

        assert result["status"] == "ok"
        assert result["etf_symbol"] == "STW.AX"
        assert len(result["sectors"]) == 3
        assert result["sectors"][0]["sector"] == "Financials"
        assert result["sectors"][0]["weight"] == 32.5
        assert result["sectors"][0]["holding_count"] == 45
        mock_etf_repository.get_sector_allocation.assert_called_once_with("STW.AX")

    @pytest.mark.asyncio
    async def test_returns_empty_allocation_when_no_data(
        self, mock_event_bus, mock_etf_repository
    ):
        """Returns empty allocation for ETF with no holdings."""
        mock_etf_repository.get_sector_allocation.return_value = []

        service = ETFService(repository=mock_etf_repository)
        result = await service.get_sector_allocation("UNKNOWN.AX")

        assert result["status"] == "ok"
        assert result["sectors"] == []

    @pytest.mark.asyncio
    async def test_handles_repository_errors(
        self, mock_event_bus, mock_etf_repository
    ):
        """Propagates repository errors."""
        mock_etf_repository.get_sector_allocation.side_effect = Exception("DB error")

        service = ETFService(repository=mock_etf_repository)

        with pytest.raises(Exception, match="DB error"):
            await service.get_sector_allocation("STW.AX")


# ===========================================================================
# TestETFServiceEventPublishing
# ===========================================================================

class TestETFServiceEventPublishing:
    """Tests for event publishing behavior."""

    @pytest.mark.asyncio
    async def test_publishes_event_after_fetching_holdings(
        self, mock_event_bus, mock_etf_repository
    ):
        """Publishes event when holdings are fetched."""
        mock_etf_repository.get_etf_holdings.return_value = {
            "etf_symbol": "STW.AX",
            "holdings_count": 10,
            "as_of_date": "2024-06-15",
            "holdings": [],
        }

        service = ETFService(repository=mock_etf_repository)
        service.publish_event = AsyncMock()

        await service.get_etf_holdings("STW.AX")

        service.publish_event.assert_called_once()
        call_kwargs = service.publish_event.call_args[0]
        payload = call_kwargs[1]
        assert payload["etf_symbol"] == "STW.AX"
        assert payload["holdings_count"] == 10

    @pytest.mark.asyncio
    async def test_event_includes_enrichment_flag(
        self, mock_event_bus, mock_etf_repository
    ):
        """Event payload indicates if signals were enriched."""
        mock_etf_repository.get_etf_holdings.return_value = {
            "etf_symbol": "STW.AX",
            "holdings_count": 5,
            "as_of_date": "2024-06-15",
            "holdings": [],
        }

        service = ETFService(repository=mock_etf_repository)
        service.publish_event = AsyncMock()

        await service.get_etf_holdings("STW.AX", with_signals=True)

        call_kwargs = service.publish_event.call_args[0]
        payload = call_kwargs[1]
        assert payload.get("with_signals") is True
