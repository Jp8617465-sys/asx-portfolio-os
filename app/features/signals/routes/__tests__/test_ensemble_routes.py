"""
app/features/signals/routes/__tests__/test_ensemble_routes.py
TDD tests for ensemble signal API endpoints.

Tests written FIRST, implementation follows.
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import date

from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.features.signals.routes.ensemble_routes import router, ensemble_service


# ---------------------------------------------------------------------------
# Test App Setup
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    """Create a test FastAPI app with the ensemble router."""
    test_app = FastAPI()
    test_app.include_router(router, prefix="/api")
    return test_app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_ensemble_service():
    """Mock EnsembleService methods used by the routes."""
    with patch(
        "app.features.signals.routes.ensemble_routes.ensemble_service"
    ) as mock_svc:
        mock_svc.generate_ensemble_signals = AsyncMock()
        yield mock_svc


# ---------------------------------------------------------------------------
# Sample Data Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_ensemble_signal():
    """A single ensemble signal row dict as returned from the database."""
    return {
        "symbol": "BHP.AX",
        "signal": "BUY",
        "ensemble_score": 0.72,
        "confidence": 0.72,
        "model_a_signal": "BUY",
        "model_b_signal": "BUY",
        "model_a_confidence": 0.80,
        "model_b_confidence": 0.60,
        "conflict": False,
        "conflict_reason": None,
        "signals_agree": True,
        "rank": 1,
        "as_of": "2024-06-15",
    }


@pytest.fixture
def sample_ensemble_signals_rows():
    """Multiple ensemble signal rows as they come from a database cursor."""
    return [
        {
            "symbol": "BHP.AX",
            "signal": "BUY",
            "ensemble_score": 0.72,
            "confidence": 0.72,
            "model_a_signal": "BUY",
            "model_b_signal": "BUY",
            "model_a_confidence": 0.80,
            "model_b_confidence": 0.60,
            "conflict": False,
            "conflict_reason": None,
            "signals_agree": True,
            "rank": 1,
            "as_of": "2024-06-15",
        },
        {
            "symbol": "CBA.AX",
            "signal": "HOLD",
            "ensemble_score": 0.55,
            "confidence": 0.55,
            "model_a_signal": "BUY",
            "model_b_signal": "SELL",
            "model_a_confidence": 0.65,
            "model_b_confidence": 0.50,
            "conflict": True,
            "conflict_reason": "model_a=BUY, model_b=SELL",
            "signals_agree": False,
            "rank": 2,
            "as_of": "2024-06-15",
        },
    ]


# ===========================================================================
# TestGetEnsembleLatest
# ===========================================================================

class TestGetEnsembleLatest:
    """Tests for GET /api/signals/ensemble/latest."""

    def test_returns_list_of_ensemble_signals_with_correct_shape(
        self, client, api_key_header, mock_database_connections
    ):
        """Endpoint returns signals list with status, count, as_of, and signals array."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = [
            {
                "symbol": "BHP.AX",
                "signal": "BUY",
                "ensemble_score": 0.72,
                "confidence": 0.72,
                "model_a_signal": "BUY",
                "model_b_signal": "BUY",
                "model_a_confidence": 0.80,
                "model_b_confidence": 0.60,
                "conflict": False,
                "conflict_reason": None,
                "signals_agree": True,
                "rank": 1,
                "as_of": "2024-06-15",
            }
        ]

        resp = client.get("/api/signals/ensemble/latest", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["count"] == 1
        assert body["as_of"] == "2024-06-15"
        assert len(body["signals"]) == 1

        sig = body["signals"][0]
        assert sig["symbol"] == "BHP.AX"
        assert sig["signal"] == "BUY"
        assert sig["ensemble_score"] == 0.72
        assert sig["confidence"] == 0.72
        assert sig["conflict"] is False
        assert sig["signals_agree"] is True
        assert sig["rank"] == 1

    def test_filters_by_signal_filter_param(
        self, client, api_key_header, mock_database_connections
    ):
        """Endpoint passes signal_filter to the database query."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = [
            {
                "symbol": "BHP.AX",
                "signal": "BUY",
                "ensemble_score": 0.72,
                "confidence": 0.72,
                "model_a_signal": "BUY",
                "model_b_signal": "BUY",
                "model_a_confidence": 0.80,
                "model_b_confidence": 0.60,
                "conflict": False,
                "conflict_reason": None,
                "signals_agree": True,
                "rank": 1,
                "as_of": "2024-06-15",
            }
        ]

        resp = client.get(
            "/api/signals/ensemble/latest?signal_filter=BUY",
            headers=api_key_header,
        )

        assert resp.status_code == 200
        # Verify the SQL was called with parameters including signal filter
        call_args = mock_cursor.execute.call_args
        sql = call_args[0][0]
        params = call_args[0][1]
        assert "signal = %s" in sql
        assert "BUY" in params

    def test_handles_empty_results(
        self, client, api_key_header, mock_database_connections
    ):
        """Endpoint returns count=0 and empty signals list."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get("/api/signals/ensemble/latest", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["count"] == 0
        assert body["signals"] == []

    def test_supports_agreement_only_param(
        self, client, api_key_header, mock_database_connections
    ):
        """agreement_only=true adds signals_agree filter."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get(
            "/api/signals/ensemble/latest?agreement_only=true",
            headers=api_key_header,
        )

        assert resp.status_code == 200
        call_args = mock_cursor.execute.call_args
        sql = call_args[0][0]
        assert "signals_agree = true" in sql

    def test_supports_no_conflict_param(
        self, client, api_key_header, mock_database_connections
    ):
        """no_conflict=true adds conflict filter."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchall.return_value = []

        resp = client.get(
            "/api/signals/ensemble/latest?no_conflict=true",
            headers=api_key_header,
        )

        assert resp.status_code == 200
        call_args = mock_cursor.execute.call_args
        sql = call_args[0][0]
        assert "conflict = false" in sql

    def test_rejects_unauthenticated_request(
        self, client, mock_database_connections
    ):
        """Endpoint returns 401 without API key."""
        resp = client.get("/api/signals/ensemble/latest")
        assert resp.status_code == 401


# ===========================================================================
# TestGetEnsembleTicker
# ===========================================================================

class TestGetEnsembleTicker:
    """Tests for GET /api/signals/ensemble/{ticker}."""

    def test_returns_single_signal_for_valid_ticker(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns a single ensemble signal for a valid ticker."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchone.return_value = {
            "symbol": "BHP.AX",
            "signal": "BUY",
            "ensemble_score": 0.72,
            "confidence": 0.72,
            "model_a_signal": "BUY",
            "model_b_signal": "BUY",
            "model_a_confidence": 0.80,
            "model_b_confidence": 0.60,
            "conflict": False,
            "conflict_reason": None,
            "signals_agree": True,
            "rank": 1,
            "as_of": "2024-06-15",
        }

        resp = client.get("/api/signals/ensemble/BHP", headers=api_key_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["symbol"] == "BHP.AX"
        assert body["signal"] == "BUY"
        assert body["ensemble_score"] == 0.72

    def test_normalizes_ticker_without_suffix(
        self, client, api_key_header, mock_database_connections
    ):
        """Ticker without .AX suffix is normalized to include it."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchone.return_value = {
            "symbol": "CBA.AX",
            "signal": "HOLD",
            "ensemble_score": 0.55,
            "confidence": 0.55,
            "model_a_signal": "BUY",
            "model_b_signal": "SELL",
            "model_a_confidence": 0.65,
            "model_b_confidence": 0.50,
            "conflict": True,
            "conflict_reason": "model_a=BUY, model_b=SELL",
            "signals_agree": False,
            "rank": 2,
            "as_of": "2024-06-15",
        }

        resp = client.get("/api/signals/ensemble/CBA", headers=api_key_header)

        assert resp.status_code == 200
        # Check the SQL was called with normalized ticker
        call_args = mock_cursor.execute.call_args
        params = call_args[0][1]
        assert "CBA.AX" in params

    def test_returns_404_for_unknown_ticker(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns 404 when no signal exists for the ticker."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchone.return_value = None

        resp = client.get(
            "/api/signals/ensemble/ZZZZZ", headers=api_key_header
        )

        assert resp.status_code == 404
        assert "no ensemble signal found" in resp.json()["detail"].lower()

    def test_rejects_unauthenticated_request(
        self, client, mock_database_connections
    ):
        """Endpoint returns 401 without API key."""
        resp = client.get("/api/signals/ensemble/BHP")
        assert resp.status_code == 401


# ===========================================================================
# TestGenerateEnsemble
# ===========================================================================

class TestGenerateEnsemble:
    """Tests for POST /api/signals/ensemble/generate."""

    def test_triggers_signal_generation_successfully(
        self, client, api_key_header, mock_ensemble_service
    ):
        """POST triggers EnsembleService.generate_ensemble_signals."""
        mock_ensemble_service.generate_ensemble_signals.return_value = [
            {"symbol": "BHP.AX", "signal": "BUY"},
            {"symbol": "CBA.AX", "signal": "HOLD"},
        ]

        resp = client.post(
            "/api/signals/ensemble/generate",
            json={},
            headers=api_key_header,
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["signals_generated"] == 2

    def test_accepts_optional_symbols_and_as_of(
        self, client, api_key_header, mock_ensemble_service
    ):
        """POST accepts symbols and as_of in request body."""
        mock_ensemble_service.generate_ensemble_signals.return_value = [
            {"symbol": "BHP.AX", "signal": "BUY"},
        ]

        resp = client.post(
            "/api/signals/ensemble/generate",
            json={"symbols": ["BHP.AX"], "as_of": "2024-06-15"},
            headers=api_key_header,
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["signals_generated"] == 1
        assert body["as_of"] == "2024-06-15"

        # Verify service called with correct args
        mock_ensemble_service.generate_ensemble_signals.assert_called_once()
        call_kwargs = mock_ensemble_service.generate_ensemble_signals.call_args
        assert call_kwargs[1]["symbols"] == ["BHP.AX"]
        assert call_kwargs[1]["as_of"] == date(2024, 6, 15)

    def test_returns_count_of_generated_signals(
        self, client, api_key_header, mock_ensemble_service
    ):
        """Response includes signals_generated count."""
        mock_ensemble_service.generate_ensemble_signals.return_value = [
            {"symbol": f"SYM{i}.AX", "signal": "BUY"} for i in range(5)
        ]

        resp = client.post(
            "/api/signals/ensemble/generate",
            json={},
            headers=api_key_header,
        )

        assert resp.status_code == 200
        assert resp.json()["signals_generated"] == 5

    def test_rejects_unauthenticated_request(
        self, client, mock_ensemble_service
    ):
        """Endpoint returns 401 without API key."""
        resp = client.post("/api/signals/ensemble/generate", json={})
        assert resp.status_code == 401


# ===========================================================================
# TestCompareSignals
# ===========================================================================

class TestCompareSignals:
    """Tests for GET /api/signals/compare."""

    def test_returns_comparison_of_all_model_signals(
        self, client, api_key_header, mock_database_connections
    ):
        """Returns model_a, model_b, and ensemble side-by-side."""
        mock_conn, mock_cursor = mock_database_connections

        # The route makes three queries; cursor.fetchone is called for each.
        # We return results in the order: model_a, model_b, ensemble
        mock_cursor.fetchone.side_effect = [
            # Model A
            {
                "symbol": "BHP.AX",
                "as_of": "2024-06-15",
                "confidence": 0.80,
                "ml_expected_return": 0.12,
                "rank": 1,
            },
            # Model B
            {
                "symbol": "BHP.AX",
                "as_of": "2024-06-15",
                "signal": "BUY",
                "quality_score": 85,
                "confidence": 0.75,
                "ml_expected_return": 0.10,
                "rank": 2,
            },
            # Ensemble
            {
                "symbol": "BHP.AX",
                "as_of": "2024-06-15",
                "signal": "BUY",
                "ensemble_score": 0.72,
                "confidence": 0.72,
                "model_a_signal": "BUY",
                "model_b_signal": "BUY",
                "conflict": False,
                "signals_agree": True,
                "rank": 1,
            },
        ]

        resp = client.get(
            "/api/signals/compare?ticker=BHP", headers=api_key_header
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["symbol"] == "BHP.AX"
        assert body["model_a"] is not None
        assert body["model_b"] is not None
        assert body["ensemble"] is not None

    def test_returns_model_availability_flags(
        self, client, api_key_header, mock_database_connections
    ):
        """Response includes availability dict with boolean flags."""
        mock_conn, mock_cursor = mock_database_connections

        # Only ensemble available
        mock_cursor.fetchone.side_effect = [
            None,  # model_a not found
            None,  # model_b not found
            {
                "symbol": "BHP.AX",
                "as_of": "2024-06-15",
                "signal": "HOLD",
                "ensemble_score": 0.50,
                "confidence": 0.50,
                "model_a_signal": None,
                "model_b_signal": None,
                "conflict": False,
                "signals_agree": True,
                "rank": 1,
            },
        ]

        resp = client.get(
            "/api/signals/compare?ticker=BHP", headers=api_key_header
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["availability"]["model_a"] is False
        assert body["availability"]["model_b"] is False
        assert body["availability"]["ensemble"] is True

    def test_handles_ticker_without_suffix(
        self, client, api_key_header, mock_database_connections
    ):
        """Normalizes ticker to include .AX suffix."""
        mock_conn, mock_cursor = mock_database_connections
        mock_cursor.fetchone.side_effect = [None, None, None]

        resp = client.get(
            "/api/signals/compare?ticker=CBA", headers=api_key_header
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["symbol"] == "CBA.AX"

    def test_rejects_unauthenticated_request(
        self, client, mock_database_connections
    ):
        """Endpoint returns 401 without API key."""
        resp = client.get("/api/signals/compare?ticker=BHP")
        assert resp.status_code == 401
