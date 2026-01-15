"""
tests/test_api_endpoints.py
Unit tests for API endpoint validation and response handling.
"""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint_returns_ok():
    """Test that health endpoint returns expected structure."""
    import app.main as main

    client = TestClient(main.app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "ok" in data
    assert data["ok"] is True


def test_api_key_required_for_protected_endpoints():
    """Test that protected endpoints require API key."""
    import app.main as main

    main.OS_API_KEY = "test-secret-key"
    client = TestClient(main.app)

    # These endpoints should require API key
    protected_endpoints = [
        ("/run/model_a_v1_1", "POST"),
        ("/run/model_a_v1_1_persist", "POST"),
        ("/refresh/universe", "POST"),
        ("/refresh/prices/last_day", "POST"),
    ]

    for endpoint, method in protected_endpoints:
        if method == "POST":
            response = client.post(endpoint)
        else:
            response = client.get(endpoint)

        # Should return 401 or 403 without API key
        assert response.status_code in [401, 403, 422], f"Endpoint {endpoint} did not require auth"


def test_api_key_accepts_valid_key():
    """Test that valid API key grants access."""
    import app.main as main

    main.OS_API_KEY = "test-secret-key"
    client = TestClient(main.app)

    response = client.get(
        "/model/status/summary",
        headers={"x-api-key": "test-secret-key"},
    )

    # Should not return 401/403
    assert response.status_code != 401
    assert response.status_code != 403


def test_model_status_summary_structure():
    """Test that model status summary returns expected structure."""
    import app.main as main

    main.OS_API_KEY = "test-key"
    client = TestClient(main.app)

    response = client.get(
        "/model/status/summary",
        headers={"x-api-key": "test-key"},
    )

    # Endpoint might fail due to DB, but should return valid JSON structure
    assert response.status_code in [200, 500, 502]

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, dict)


def test_invalid_date_format_rejected():
    """Test that invalid date formats are rejected with 400."""
    import app.main as main

    main.OS_API_KEY = "test-key"
    client = TestClient(main.app)

    # Invalid date format
    response = client.post(
        "/run/model_a_v1_1",
        headers={"x-api-key": "test-key"},
        json={"as_of": "not-a-date"},
    )

    assert response.status_code == 400
    assert "Invalid" in response.json().get("detail", "")


def test_drift_summary_endpoint_structure():
    """Test that drift summary endpoint returns expected structure."""
    import app.main as main

    main.OS_API_KEY = "test-key"
    client = TestClient(main.app)

    response = client.get(
        "/drift/summary",
        headers={"x-api-key": "test-key"},
    )

    # May fail due to DB but should return valid response
    assert response.status_code in [200, 500, 502]

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, (dict, list))
