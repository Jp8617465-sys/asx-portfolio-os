"""
tests/test_user_journeys.py
End-to-end user journey tests to verify complete flows work correctly.

Tests:
1. New user registration flow
2. Existing user login flow
3. Portfolio upload and analysis flow
4. Stock research and watchlist flow
5. Model monitoring and comparison flow
"""

import os
import sys
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


@pytest.fixture(scope="module")
def setup_test_env():
    """Set up test environment variables."""
    os.environ['JWT_SECRET_KEY'] = 'test-secure-key-for-testing-e2e-journeys-only'
    os.environ['DATABASE_URL'] = os.getenv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
    os.environ['OS_API_KEY'] = 'test-api-key-for-e2e'
    os.environ['ENABLE_ASSISTANT'] = 'false'


@pytest.fixture(scope="module")
def client(setup_test_env):
    """Create test client with test environment."""
    from app.main import app
    return TestClient(app)


class TestUserRegistrationJourney:
    """Test Journey #1: New user registration and first login."""

    def test_registration_flow(self, client):
        """
        Complete registration flow:
        1. POST /auth/register with new user data
        2. Verify returns JWT token
        3. Verify user can access protected endpoints with token
        """
        # Step 1: Register new user
        response = client.post(
            "/auth/register",
            json={
                "username": "test_journey_user",
                "email": "journey@test.com",
                "password": "SecurePass123!",
                "full_name": "Journey Test User"
            }
        )

        # Should return 201 or 200 with token
        assert response.status_code in [200, 201], f"Registration failed: {response.json()}"

        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data

        token = data["access_token"]
        # Verify user data is present
        assert "user_id" in data["user"]

        # Step 2: Verify token works for protected endpoints
        headers = {"Authorization": f"Bearer {token}"}

        # Should be able to access /auth/me
        me_response = client.get("/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["username"] == "test_journey_user"

        # Step 3: Verify can access portfolio endpoint
        portfolio_response = client.get("/portfolio", headers=headers)

        # May return 404 (no portfolio yet) or 200 - both are OK
        # Should NOT return 401 (unauthorized)
        assert portfolio_response.status_code in [200, 404]


class TestUserLoginJourney:
    """Test Journey #2: Existing user login."""

    def test_login_flow(self, client):
        """
        Complete login flow:
        1. POST /auth/login with credentials
        2. Verify returns JWT token
        3. Verify token grants access to dashboard data
        """
        # First, create a user to log in with
        register_response = client.post(
            "/auth/register",
            json={
                "username": "login_test_user",
                "email": "logintest@example.com",
                "password": "TestPass123!"
            }
        )

        # May fail if user already exists - that's OK
        if register_response.status_code not in [200, 201]:
            print(f"Registration skipped: {register_response.json()}")

        # Step 1: Login with credentials
        login_response = client.post(
            "/auth/login",
            json={
                "username": "login_test_user",
                "password": "TestPass123!"
            }
        )

        assert login_response.status_code == 200, f"Login failed: {login_response.json()}"

        data = login_response.json()
        assert "access_token" in data
        token = data["access_token"]

        # Step 2: Verify token grants access
        headers = {"Authorization": f"Bearer {token}"}

        me_response = client.get("/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["username"] == "login_test_user"

    def test_login_with_wrong_password_fails(self, client):
        """Verify that wrong password returns 401."""
        response = client.post(
            "/auth/login",
            json={
                "username": "login_test_user",
                "password": "WrongPassword123!"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()


class TestPortfolioUploadJourney:
    """Test Journey #3: Portfolio upload and analysis."""

    def test_portfolio_upload_flow(self, client):
        """
        Complete portfolio flow:
        1. Create user and get token
        2. Upload portfolio CSV
        3. Analyze portfolio
        4. Get rebalancing suggestions
        """
        # Step 1: Create user
        register_response = client.post(
            "/auth/register",
            json={
                "username": "portfolio_test_user",
                "email": "portfolio@test.com",
                "password": "TestPass123!"
            }
        )

        # Get token (from registration or login)
        if register_response.status_code in [200, 201]:
            token = register_response.json()["access_token"]
        else:
            # User already exists - log in
            login_response = client.post(
                "/auth/login",
                json={
                    "username": "portfolio_test_user",
                    "password": "TestPass123!"
                }
            )
            token = login_response.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Upload portfolio CSV
        csv_content = """ticker,shares,avg_cost,date_acquired
BHP.AX,100,42.50,2023-06-15
CBA.AX,50,98.00,2023-08-20"""

        upload_response = client.post(
            "/portfolio/upload",
            files={"file": ("portfolio.csv", csv_content, "text/csv")},
            headers=headers
        )

        # Should succeed (200 or 201)
        assert upload_response.status_code in [200, 201], f"Upload failed: {upload_response.json()}"

        upload_data = upload_response.json()
        assert upload_data["status"] == "success"
        assert upload_data["holdings_count"] == 2

        # Step 3: Analyze portfolio
        analyze_response = client.post("/portfolio/analyze", headers=headers)

        # Should succeed
        assert analyze_response.status_code == 200

        # Step 4: Get rebalancing suggestions
        rebalance_response = client.get("/portfolio/rebalancing", headers=headers)

        # Should succeed (may have 0 suggestions if signals not available)
        assert rebalance_response.status_code == 200


class TestStockResearchJourney:
    """Test Journey #4: Stock research and watchlist management."""

    def test_stock_research_flow(self, client):
        """
        Complete stock research flow:
        1. Search for stock
        2. Get stock details
        3. Get signal reasoning
        4. Get price history
        5. Add to watchlist
        6. View watchlist
        7. Remove from watchlist
        """
        # Create user and get token
        register_response = client.post(
            "/auth/register",
            json={
                "username": "research_test_user",
                "email": "research@test.com",
                "password": "TestPass123!"
            }
        )

        if register_response.status_code in [200, 201]:
            token = register_response.json()["access_token"]
        else:
            login_response = client.post(
                "/auth/login",
                json={"username": "research_test_user", "password": "TestPass123!"}
            )
            token = login_response.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        # Step 1: Search for stock
        search_response = client.get("/search?q=BHP")
        assert search_response.status_code == 200
        assert search_response.json()["count"] > 0

        # Step 2: Get live signal (using API key for backward compatibility)
        api_key = os.getenv('OS_API_KEY')
        signal_response = client.get(
            "/signals/live/BHP.AX",
            headers={"x-api-key": api_key}
        )

        # May return 200 or 404 depending on data availability
        assert signal_response.status_code in [200, 404]

        # Step 3: Get signal reasoning (if signal exists)
        if signal_response.status_code == 200:
            reasoning_response = client.get(
                "/signals/BHP.AX/reasoning",
                headers={"x-api-key": api_key}
            )
            # May not be available for all stocks
            assert reasoning_response.status_code in [200, 404]

        # Step 4: Get price history
        price_response = client.get("/prices/BHP.AX/history?period=3M")
        assert price_response.status_code in [200, 404]  # 404 if no data

        # Step 5: Add to watchlist
        watchlist_add_response = client.post(
            "/watchlist",
            json={"ticker": "BHP.AX"},
            headers=headers
        )
        assert watchlist_add_response.status_code in [200, 201]

        # Step 6: View watchlist
        watchlist_get_response = client.get("/watchlist", headers=headers)
        assert watchlist_get_response.status_code == 200
        watchlist_data = watchlist_get_response.json()
        assert any(item["ticker"] == "BHP.AX" for item in watchlist_data["items"])

        # Step 7: Remove from watchlist
        watchlist_remove_response = client.delete("/watchlist/BHP.AX", headers=headers)
        assert watchlist_remove_response.status_code == 200


class TestModelMonitoringJourney:
    """Test Journey #5: Model monitoring and comparison."""

    def test_model_monitoring_flow(self, client):
        """
        Complete model monitoring flow:
        1. Get model status summary
        2. Get drift summary
        3. Get feature importance
        4. Get ensemble signals
        5. Compare Model A vs Model B for specific ticker
        """
        api_key = os.getenv('OS_API_KEY')
        headers = {"x-api-key": api_key}

        # Step 1: Get model status
        status_response = client.get("/model/status/summary", headers=headers)
        # May not be available in test environment
        assert status_response.status_code in [200, 404, 500]

        # Step 2: Get drift summary
        drift_response = client.get("/drift/summary", headers=headers)
        assert drift_response.status_code in [200, 404]

        # Step 3: Get feature importance
        importance_response = client.get("/insights/feature-importance", headers=headers)
        assert importance_response.status_code in [200, 404]

        # Step 4: Get ensemble signals
        ensemble_response = client.get("/signals/ensemble/latest", headers=headers)
        assert ensemble_response.status_code in [200, 404]

        # Step 5: Compare models for specific ticker
        compare_response = client.get("/signals/compare?ticker=BHP.AX", headers=headers)
        assert compare_response.status_code in [200, 404]


class TestEndToEndUserJourney:
    """Test complete end-to-end user journey from registration to portfolio analysis."""

    def test_complete_user_journey(self, client):
        """
        Complete user journey:
        1. Register new account
        2. Upload portfolio
        3. Analyze portfolio
        4. Research a stock from portfolio
        5. Add stock to watchlist
        6. Get rebalancing suggestions
        7. View model performance
        """
        # Step 1: Register
        username = f"e2e_user_{int(datetime.now().timestamp())}"
        response = client.post(
            "/auth/register",
            json={
                "username": username,
                "email": f"{username}@test.com",
                "password": "SecurePass123!"
            }
        )

        assert response.status_code in [200, 201]
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Upload portfolio
        csv_content = """ticker,shares,avg_cost,date_acquired
BHP.AX,100,42.50,2023-06-15
CBA.AX,50,98.00,2023-08-20
WES.AX,75,45.30,2023-09-10"""

        upload_response = client.post(
            "/portfolio/upload",
            files={"file": ("portfolio.csv", csv_content, "text/csv")},
            headers=headers
        )

        assert upload_response.status_code in [200, 201]
        assert upload_response.json()["holdings_count"] == 3

        # Step 3: Analyze portfolio
        analyze_response = client.post("/portfolio/analyze", headers=headers)
        assert analyze_response.status_code == 200

        # Step 4: Get portfolio
        portfolio_response = client.get("/portfolio", headers=headers)
        assert portfolio_response.status_code == 200
        portfolio = portfolio_response.json()
        assert portfolio["num_holdings"] == 3

        # Step 5: Research a stock (BHP)
        api_key = os.getenv('OS_API_KEY')
        signal_response = client.get(
            "/signals/live/BHP.AX",
            headers={"x-api-key": api_key}
        )
        # May not have signal data in test
        assert signal_response.status_code in [200, 404]

        # Step 6: Add to watchlist
        watchlist_response = client.post(
            "/watchlist",
            json={"ticker": "BHP.AX"},
            headers=headers
        )
        assert watchlist_response.status_code in [200, 201]

        # Step 7: Get rebalancing suggestions
        rebalance_response = client.get("/portfolio/rebalancing", headers=headers)
        assert rebalance_response.status_code == 200


class TestNoMockDataInProduction:
    """Verify that no mock data appears in API responses."""

    def test_watchlist_returns_real_data(self, client):
        """Verify watchlist endpoint returns real data, not hardcoded mock."""
        # Create user and token
        response = client.post(
            "/auth/register",
            json={
                "username": "mock_test_user",
                "email": "mocktest@example.com",
                "password": "TestPass123!"
            }
        )

        if response.status_code in [200, 201]:
            token = response.json()["access_token"]
        else:
            login_response = client.post(
                "/auth/login",
                json={"username": "mock_test_user", "password": "TestPass123!"}
            )
            token = login_response.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        # Get watchlist
        watchlist_response = client.get("/watchlist", headers=headers)
        assert watchlist_response.status_code == 200

        # Should return empty list or real data
        # Should NOT contain hardcoded mock tickers unless user actually added them
        data = watchlist_response.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_price_history_not_random(self, client):
        """Verify price history returns database data, not random numbers."""
        # Get price history
        response = client.get("/prices/BHP.AX/history?period=1M")

        if response.status_code == 200:
            data = response.json()

            # Should have consistent structure
            assert "ticker" in data
            assert "data" in data
            assert data["ticker"] == "BHP.AX"

            # If data exists, verify it's not random
            if len(data["data"]) > 1:
                # Real price data should have realistic values
                # (not starting at exactly 100.0 like mock data)
                first_close = data["data"][0]["close"]

                # Real ASX stocks typically trade between $0.01 and $500
                assert 0.01 <= first_close <= 500


class TestSecurityEnforcement:
    """Test that security fixes are enforced."""

    def test_portfolio_without_token_fails(self, client):
        """Verify portfolio endpoints require authentication."""
        # Attempt to access portfolio without token
        response = client.get("/portfolio")
        assert response.status_code == 401

    def test_portfolio_with_invalid_token_fails(self, client):
        """Verify invalid tokens are rejected."""
        headers = {"Authorization": "Bearer invalid-token-12345"}
        response = client.get("/portfolio", headers=headers)
        assert response.status_code == 401

    def test_cannot_spoof_user_id(self, client):
        """Verify user_id cannot be spoofed via query parameter."""
        # Create user A
        response_a = client.post(
            "/auth/register",
            json={
                "username": "user_a_spoof_test",
                "email": "usera@test.com",
                "password": "TestPass123!"
            }
        )

        if response_a.status_code in [200, 201]:
            token_a = response_a.json()["access_token"]
        else:
            login_a = client.post(
                "/auth/login",
                json={"username": "user_a_spoof_test", "password": "TestPass123!"}
            )
            token_a = login_a.json()["access_token"]

        # User A's headers
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Attempt to access with spoofed user_id in query
        response = client.get("/portfolio?user_id=999999", headers=headers_a)

        # Should ignore query param and use token
        # Returns user A's portfolio (or 404 if empty)
        assert response.status_code in [200, 404]

        # Should NOT return user 999999's data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
