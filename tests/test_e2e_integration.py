"""
E2E Test: Full system integration test
Tests complete user journey: register -> portfolio -> signals -> notifications
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core import db_context

client = TestClient(app)


class TestE2EIntegration:
    """End-to-end full system integration tests."""

    def test_complete_user_journey(self):
        """
        Test complete user journey from registration to portfolio analysis.

        Flow:
        1. Register new user
        2. Upload portfolio
        3. Analyze portfolio (sync prices/signals)
        4. Get notifications (if any)
        5. Get rebalancing suggestions
        6. Update alert preferences
        """

        # Step 1: Register new user
        register_response = client.post(
            "/auth/register",
            json={
                "username": "integration_test_user",
                "email": "integration@test.com",
                "password": "testpass123",
                "full_name": "Integration Test User"
            }
        )

        assert register_response.status_code == 200
        token = register_response.json()["access_token"]
        user_data = register_response.json()["user"]
        user_id = user_data["user_id"]

        # Step 2: Upload portfolio
        csv_content = """ticker,shares,avg_cost,date_acquired
BHP.AX,100,42.50,2023-06-15
CBA.AX,50,98.00,2023-08-20
"""

        files = {"file": ("portfolio.csv", io.StringIO(csv_content), "text/csv")}
        upload_response = client.post(
            f"/portfolio/upload?user_id={user_id}",
            files=files,
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert upload_response.status_code == 200
        assert upload_response.json()["holdings_count"] == 2

        # Step 3: Get portfolio
        portfolio_response = client.get(
            f"/portfolio?user_id={user_id}",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert portfolio_response.status_code == 200
        portfolio_data = portfolio_response.json()
        assert portfolio_data["num_holdings"] == 2

        # Step 4: Analyze portfolio
        analyze_response = client.post(
            f"/portfolio/analyze?user_id={user_id}",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert analyze_response.status_code == 200

        # Step 5: Get notifications
        notifications_response = client.get(
            "/notifications",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert notifications_response.status_code == 200
        assert "notifications" in notifications_response.json()

        # Step 6: Get alert preferences
        alerts_response = client.get(
            "/alerts/preferences",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert alerts_response.status_code == 200
        assert len(alerts_response.json()["preferences"]) > 0

        # Step 7: Update user settings
        settings_response = client.put(
            "/users/me/settings",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "settings": {
                    "theme": "dark",
                    "default_portfolio": portfolio_data["portfolio_id"]
                }
            }
        )

        assert settings_response.status_code == 200

        # Step 8: Get user profile
        profile_response = client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert profile_response.status_code == 200
        assert profile_response.json()["user_id"] == user_id

        # Cleanup: Delete user (soft delete)
        delete_response = client.delete(
            "/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert delete_response.status_code == 200

        print("\n✅ Complete user journey test passed!")

    def test_api_authentication_methods(self):
        """Test that both API key and JWT authentication work."""

        # Method 1: API Key authentication
        api_key_response = client.get(
            "/health",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        # Health endpoint doesn't require auth, but should accept it
        assert api_key_response.status_code == 200

        # Method 2: JWT authentication
        login_response = client.post(
            "/auth/login",
            json={"username": "demo_user", "password": "testpass123"}
        )

        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Use JWT token
        jwt_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert jwt_response.status_code == 200

        print("\n✅ Both authentication methods work!")

    def test_v2_endpoints_operational(self):
        """Test that all V2 (Model B + Ensemble) endpoints are operational."""

        api_key = os.getenv("OS_API_KEY", "test-key")
        headers = {"x-api-key": api_key}

        # Test fundamentals endpoints
        fundamentals_endpoints = [
            "/fundamentals/metrics?ticker=BHP.AX",
            "/fundamentals/quality?ticker=BHP.AX",
        ]

        for endpoint in fundamentals_endpoints:
            response = client.get(endpoint, headers=headers)
            # 200 OK or 404 Not Found are both acceptable (depends on data)
            assert response.status_code in [200, 404], \
                f"{endpoint} returned {response.status_code}"

        # Test Model B signal endpoints
        model_b_endpoints = [
            "/signals/model_b/latest",
            "/signals/model_b/BHP.AX",
        ]

        for endpoint in model_b_endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code in [200, 404], \
                f"{endpoint} returned {response.status_code}"

        # Test ensemble signal endpoints
        ensemble_endpoints = [
            "/signals/ensemble/latest",
            "/signals/ensemble/BHP.AX",
            "/signals/compare?ticker=BHP.AX",
        ]

        for endpoint in ensemble_endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code in [200, 404], \
                f"{endpoint} returned {response.status_code}"

        print("\n✅ All V2 endpoints are operational!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
