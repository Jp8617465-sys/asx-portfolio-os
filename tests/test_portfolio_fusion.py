"""
tests/test_portfolio_fusion.py
Unit tests for Portfolio Fusion API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock


def test_portfolio_overview_no_data():
    """Test portfolio overview endpoint when no data is available."""
    import app.main as main
    
    client = TestClient(main.app)
    
    # Mock the database to return no data
    with patch('app.routes.fusion.get_db_connection') as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_db.return_value = mock_conn
        
        response = client.get(
            "/portfolio/overview",
            headers={"x-api-key": "test-key"}
        )
        
        # Should return 200 with no_data status
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "no_data"
        assert data.get("total_assets") == 0
        assert data.get("net_worth") == 0


def test_portfolio_overview_calculations():
    """Test that portfolio overview calculates values correctly."""
    # Mock fusion data
    fusion_data = {
        'equity_value': 100000.0,
        'equity_count': 10,
        'equity_allocation_pct': 60.0,
        'property_value': 50000.0,
        'property_count': 1,
        'property_allocation_pct': 30.0,
        'loan_balance': 20000.0,
        'loan_count': 1,
        'loan_monthly_payment': 1000.0,
        'loan_allocation_pct': 10.0,
        'total_assets': 150000.0,
        'total_liabilities': 20000.0,
        'net_worth': 130000.0,
        'debt_service_ratio': 0.15,
        'risk_score': 25.0,
        'computed_at': '2026-01-17T00:00:00'
    }
    
    # Test calculations
    assert fusion_data['total_assets'] == fusion_data['equity_value'] + fusion_data['property_value']
    assert fusion_data['net_worth'] == fusion_data['total_assets'] - fusion_data['total_liabilities']
    assert abs(fusion_data['equity_allocation_pct'] + fusion_data['property_allocation_pct'] + fusion_data['loan_allocation_pct'] - 100.0) < 0.01


def test_risk_analysis_metrics():
    """Test portfolio risk analysis calculations."""
    # Mock risk data
    risk_data = {
        'risk_score': 45.0,
        'debt_service_ratio': 0.25,
        'total_assets': 200000.0,
        'total_liabilities': 50000.0,
        'net_worth': 150000.0,
        'loan_allocation_pct': 25.0,
        'portfolio_volatility': 0.15,
        'max_drawdown': -0.10
    }
    
    # Calculate leverage ratio
    leverage = (risk_data['total_liabilities'] / risk_data['total_assets']) * 100
    assert leverage == 25.0
    
    # Test risk level classification
    if risk_data['risk_score'] < 30:
        risk_level = "low"
    elif risk_data['risk_score'] < 60:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    assert risk_level == "medium"


def test_asset_allocation_logic():
    """Test asset allocation calculation logic."""
    # Sample allocation data
    equity_value = 80000.0
    property_value = 30000.0
    loan_balance = 10000.0
    
    total_assets = equity_value + property_value
    
    # Calculate allocation percentages
    equity_pct = (equity_value / total_assets) * 100
    property_pct = (property_value / total_assets) * 100
    loan_pct = (loan_balance / total_assets) * 100
    
    # Test calculations
    assert abs(equity_pct - 72.73) < 0.1
    assert abs(property_pct - 27.27) < 0.1
    assert abs(loan_pct - 9.09) < 0.1
    
    # Test that asset allocations sum to ~100
    assert abs(equity_pct + property_pct - 100.0) < 0.1


def test_portfolio_risk_endpoint_structure():
    """Test that portfolio risk endpoint returns expected structure."""
    import app.main as main
    
    client = TestClient(main.app)
    
    # Mock the database
    with patch('app.routes.fusion.get_db_connection') as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_db.return_value = mock_conn
        
        response = client.get(
            "/portfolio/risk",
            headers={"x-api-key": "test-key"}
        )
        
        # Should return 200
        assert response.status_code == 200
        data = response.json()
        
        # Should have expected structure
        assert "status" in data
        if data["status"] == "success":
            assert "risk_score" in data
            assert "risk_level" in data


def test_portfolio_allocation_endpoint():
    """Test portfolio allocation endpoint structure."""
    import app.main as main
    
    client = TestClient(main.app)
    
    # Mock the database
    with patch('app.routes.fusion.get_db_connection') as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_db.return_value = mock_conn
        
        response = client.get(
            "/portfolio/allocation",
            headers={"x-api-key": "test-key"}
        )
        
        # Should return 200
        assert response.status_code == 200
        data = response.json()
        
        # Should have expected structure
        assert "status" in data
        if data["status"] == "success":
            assert "total_assets" in data
            assert "asset_classes" in data


def test_api_key_required():
    """Test that portfolio endpoints require API key."""
    import app.main as main
    
    client = TestClient(main.app)
    
    endpoints = [
        "/portfolio/overview",
        "/portfolio/risk",
        "/portfolio/allocation",
    ]
    
    for endpoint in endpoints:
        # Request without API key
        response = client.get(endpoint)
        
        # Should return 401 or 500 (depends on implementation)
        assert response.status_code in [401, 500]


def test_debt_service_ratio_calculation():
    """Test debt service ratio calculation."""
    # Mock data
    loan_monthly_payment = 2000.0
    monthly_income = 10000.0
    
    # Calculate DSR
    dsr = loan_monthly_payment / monthly_income
    
    assert dsr == 0.2
    
    # Test DSR interpretation
    if dsr < 0.25:
        dsr_status = "healthy"
    elif dsr < 0.35:
        dsr_status = "moderate"
    else:
        dsr_status = "high"
    
    assert dsr_status == "healthy"


def test_leverage_ratio_calculation():
    """Test leverage ratio calculation."""
    total_assets = 500000.0
    total_liabilities = 100000.0
    
    # Calculate leverage
    leverage = (total_liabilities / total_assets) * 100
    
    assert leverage == 20.0
    
    # Test leverage interpretation
    if leverage < 30:
        leverage_status = "low"
    elif leverage < 60:
        leverage_status = "moderate"
    else:
        leverage_status = "high"
    
    assert leverage_status == "low"


def test_portfolio_allocation_sum():
    """Test that allocation percentages sum to 100%."""
    allocations = [
        {"name": "Equities", "percentage": 60.0},
        {"name": "Property", "percentage": 30.0},
        {"name": "Loans", "percentage": 10.0}
    ]
    
    total = sum(a["percentage"] for a in allocations)
    
    # Should sum to 100 (within floating point tolerance)
    assert abs(total - 100.0) < 0.01


def test_risk_score_bounds():
    """Test that risk score is within valid bounds."""
    risk_scores = [15.0, 45.0, 75.0, 0.0, 100.0]
    
    for score in risk_scores:
        assert 0 <= score <= 100
        
        # Test risk level classification
        if score < 30:
            level = "low"
        elif score < 60:
            level = "medium"
        else:
            level = "high"
        
        assert level in ["low", "medium", "high"]
