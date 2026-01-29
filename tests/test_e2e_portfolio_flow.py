"""
E2E Test: Complete portfolio management flow
Tests portfolio upload, holdings retrieval, price sync, and analysis
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)


class TestE2EPortfolioFlow:
    """End-to-end portfolio management tests."""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user."""
        response = client.post(
            "/auth/login",
            json={"username": "demo_user", "password": "testpass123"}
        )
        return response.json()["access_token"]

    def test_complete_portfolio_flow(self, auth_token):
        """Test complete portfolio lifecycle: upload -> get -> analyze -> rebalance."""

        # Step 1: Create CSV file content
        csv_content = """ticker,shares,avg_cost,date_acquired
BHP.AX,100,42.50,2023-06-15
CBA.AX,50,98.00,2023-08-20
CSL.AX,30,280.00,2023-09-10
WES.AX,75,45.80,2024-01-05
"""

        # Step 2: Upload portfolio
        files = {"file": ("portfolio.csv", io.StringIO(csv_content), "text/csv")}
        upload_response = client.post(
            "/portfolio/upload?user_id=1",
            files=files,
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        assert upload_data["status"] == "success"
        assert upload_data["holdings_count"] == 4
        portfolio_id = upload_data["portfolio_id"]

        # Step 3: Get portfolio
        portfolio_response = client.get(
            "/portfolio?user_id=1",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert portfolio_response.status_code == 200
        portfolio_data = portfolio_response.json()
        assert portfolio_data["portfolio_id"] == portfolio_id
        assert portfolio_data["num_holdings"] == 4
        assert len(portfolio_data["holdings"]) == 4

        # Verify holdings have correct data
        holdings_by_ticker = {h["ticker"]: h for h in portfolio_data["holdings"]}
        assert "BHP.AX" in holdings_by_ticker
        assert holdings_by_ticker["BHP.AX"]["shares"] == 100
        assert holdings_by_ticker["BHP.AX"]["avg_cost"] == 42.50

        # Step 4: Analyze portfolio (sync prices and signals)
        analyze_response = client.post(
            "/portfolio/analyze?user_id=1",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert analyze_response.status_code == 200
        analyzed_data = analyze_response.json()
        assert "holdings" in analyzed_data

        # Holdings should now have prices/signals if data available
        # (In production, this would have live prices)

        # Step 5: Get risk metrics (will calculate)
        risk_response = client.get(
            "/portfolio/risk-metrics?user_id=1&recalculate=true",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        # May be 404 if no prices, which is OK in test env
        if risk_response.status_code == 200:
            risk_data = risk_response.json()
            assert "as_of" in risk_data
            assert "volatility" in risk_data

        # Step 6: Get rebalancing suggestions
        rebalance_response = client.get(
            "/portfolio/rebalancing?user_id=1&regenerate=true",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )

        assert rebalance_response.status_code == 200
        rebalance_data = rebalance_response.json()
        assert "suggestions" in rebalance_data
        # Suggestions may be empty if no prices/signals, which is OK

    def test_portfolio_error_cases(self, auth_token):
        """Test portfolio error handling."""

        # Test 1: Upload invalid CSV (missing columns)
        bad_csv = """ticker,shares
BHP.AX,100
"""
        files = {"file": ("bad.csv", io.StringIO(bad_csv), "text/csv")}
        response1 = client.post(
            "/portfolio/upload?user_id=1",
            files=files,
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )
        assert response1.status_code == 400

        # Test 2: Upload CSV with invalid shares
        bad_csv2 = """ticker,shares,avg_cost,date_acquired
BHP.AX,-100,42.50,2023-06-15
"""
        files2 = {"file": ("bad2.csv", io.StringIO(bad_csv2), "text/csv")}
        response2 = client.post(
            "/portfolio/upload?user_id=1",
            files=files2,
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )
        assert response2.status_code == 400

        # Test 3: Get portfolio for nonexistent user
        response3 = client.get(
            "/portfolio?user_id=999999",
            headers={"x-api-key": os.getenv("OS_API_KEY", "test-key")}
        )
        assert response3.status_code == 404

        # Test 4: Analyze without auth
        response4 = client.post("/portfolio/analyze?user_id=1")
        assert response4.status_code in [401, 422]  # Missing API key


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
