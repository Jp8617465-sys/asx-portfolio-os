"""
app/features/etf/routes/__tests__/test_etf_routes.py
TDD tests for ETF API endpoints.

Tests written FIRST, implementation follows.
Tests cover:
- GET /api/etfs - list all ETFs
- GET /api/etfs/{symbol}/holdings - get ETF holdings
- GET /api/etfs/{symbol}/sectors - get sector allocation
- Authentication requirements
- Error handling
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.features.etf.routes.etf_routes import router


# ---------------------------------------------------------------------------
# Test App Setup
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    """Create a test FastAPI app with the ETF router."""
    test_app = FastAPI()
    test_app.include_router(router)
    return test_app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


# ===========================================================================
# TestGetETFList
# ===========================================================================

class TestGetETFList:
    """Tests for GET /api/etfs."""

    def test_returns_list_of_etfs_with_holdings_counts(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns list of ETFs with correct structure."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = [
            {
                "symbol": "STW.AX",
                "etf_name": "SPDR S&P/ASX 200",
                "sector": "Broad Market",
                "nav": 65.50,
                "return_1w": 1.2,
                "return_1m": 3.5,
                "return_3m": 8.7,
                "holdings_count": 200,
            },
            {
                "symbol": "IOZ.AX",
                "etf_name": "iShares Core S&P/ASX 200",
                "sector": "Broad Market",
                "nav": 32.15,
                "return_1w": 1.1,
                "return_1m": 3.3,
                "return_3m": 8.5,
                "holdings_count": 195,
            },
        ]

        resp = client.get("/api/etfs", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["count"] == 2
        assert len(body["etfs"]) == 2

        etf = body["etfs"][0]
        assert etf["symbol"] == "STW.AX"
        assert etf["etf_name"] == "SPDR S&P/ASX 200"
        assert etf["holdings_count"] == 200

    def test_returns_empty_list_when_no_etfs(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns empty list when no ETFs in database."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get("/api/etfs", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["count"] == 0
        assert body["etfs"] == []

    def test_rejects_unauthenticated_request(
        self, client, mock_database_connections
    ):
        """Returns 401 without API key."""
        resp = client.get("/api/etfs")
        assert resp.status_code == 401


# ===========================================================================
# TestGetETFHoldings
# ===========================================================================

class TestGetETFHoldings:
    """Tests for GET /api/etfs/{symbol}/holdings."""

    def test_returns_holdings_for_valid_etf(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns holdings with correct structure."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = [
            {
                "etf_symbol": "STW.AX",
                "holding_symbol": "BHP.AX",
                "holding_name": "BHP Group",
                "weight": 5.2,
                "shares_held": 1000000,
                "market_value": 45000000.0,
                "sector": "Materials",
                "as_of_date": "2024-06-15",
            },
            {
                "etf_symbol": "STW.AX",
                "holding_symbol": "CBA.AX",
                "holding_name": "Commonwealth Bank",
                "weight": 7.8,
                "shares_held": 500000,
                "market_value": 52000000.0,
                "sector": "Financials",
                "as_of_date": "2024-06-15",
            },
        ]

        resp = client.get("/api/etfs/STW.AX/holdings", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["etf_symbol"] == "STW.AX"
        assert body["holdings_count"] == 2
        assert len(body["holdings"]) == 2

        holding = body["holdings"][0]
        assert holding["holding_symbol"] == "BHP.AX"
        assert holding["holding_name"] == "BHP Group"
        assert holding["weight"] == 5.2
        assert holding["sector"] == "Materials"

    def test_enriches_holdings_with_signals_when_requested(
        self, client, api_key_header, mock_database_connections
    ):
        """with_signals=true enriches holdings with signals."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = [
            {
                "etf_symbol": "STW.AX",
                "holding_symbol": "BHP.AX",
                "holding_name": "BHP Group",
                "weight": 5.2,
                "sector": "Materials",
                "as_of_date": "2024-06-15",
                "signal": "BUY",
                "confidence": 0.75,
            },
        ]

        resp = client.get(
            "/api/etfs/STW.AX/holdings?with_signals=true",
            headers=api_key_header
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["holdings"][0]["signal"] == "BUY"
        assert body["holdings"][0]["confidence"] == 0.75

        # Verify query includes signal join
        call_args = mock_cursor.execute.call_args
        sql = call_args[0][0]
        assert "ensemble_signals" in sql.lower() or "JOIN" in sql

    def test_returns_empty_holdings_for_unknown_etf(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns empty holdings for unknown ETF."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get("/api/etfs/UNKNOWN.AX/holdings", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["holdings_count"] == 0
        assert body["holdings"] == []

    def test_normalizes_etf_symbol(
        self, client, api_key_header, mock_database_connections
    ):
        """Normalizes ETF symbol to include .AX suffix."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get("/api/etfs/STW/holdings", headers=api_key_header)

        assert resp.status_code == 200
        # Verify SQL was called with normalized symbol
        call_args = mock_cursor.execute.call_args
        params = call_args[0][1]
        assert "STW.AX" in params

    def test_rejects_unauthenticated_request(
        self, client, mock_database_connections
    ):
        """Returns 401 without API key."""
        resp = client.get("/api/etfs/STW.AX/holdings")
        assert resp.status_code == 401


# ===========================================================================
# TestGetETFSectorAllocation
# ===========================================================================

class TestGetETFSectorAllocation:
    """Tests for GET /api/etfs/{symbol}/sectors."""

    def test_returns_sector_allocation_breakdown(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns sector allocation with correct structure."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = [
            {
                "sector": "Financials",
                "weight": 32.5,
                "holding_count": 45,
            },
            {
                "sector": "Materials",
                "weight": 18.2,
                "holding_count": 30,
            },
            {
                "sector": "Healthcare",
                "weight": 12.1,
                "holding_count": 25,
            },
        ]

        resp = client.get("/api/etfs/STW.AX/sectors", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["etf_symbol"] == "STW.AX"
        assert len(body["sectors"]) == 3

        sector = body["sectors"][0]
        assert sector["sector"] == "Financials"
        assert sector["weight"] == 32.5
        assert sector["holding_count"] == 45

    def test_returns_empty_allocation_for_unknown_etf(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns empty allocation for unknown ETF."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get("/api/etfs/UNKNOWN.AX/sectors", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["sectors"] == []

    def test_normalizes_etf_symbol(
        self, client, api_key_header, mock_database_connections
    ):
        """Normalizes ETF symbol to include .AX suffix."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get("/api/etfs/STW/sectors", headers=api_key_header)

        assert resp.status_code == 200
        # Verify SQL was called with normalized symbol
        call_args = mock_cursor.execute.call_args
        params = call_args[0][1]
        assert "STW.AX" in params

    def test_rejects_unauthenticated_request(
        self, client, mock_database_connections
    ):
        """Returns 401 without API key."""
        resp = client.get("/api/etfs/STW.AX/sectors")
        assert resp.status_code == 401


# ===========================================================================
# TestErrorHandling
# ===========================================================================

class TestErrorHandling:
    """Tests for error handling across all endpoints."""

    def test_handles_database_errors_gracefully(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns 500 when database errors occur."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.execute.side_effect = Exception("Database connection error")

        resp = client.get("/api/etfs", headers=api_key_header)

        assert resp.status_code == 500
        assert "error" in resp.json()["detail"].lower()

    def test_handles_malformed_symbols(
        self, client, api_key_header, mock_database_connections
    ):
        """Handles symbols with special characters gracefully."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        # Should normalize or handle gracefully
        resp = client.get("/api/etfs/ST@W/holdings", headers=api_key_header)

        # Should either return 200 with empty results or 400 for bad request
        assert resp.status_code in [200, 400]
