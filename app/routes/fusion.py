"""
app/routes/fusion.py
Portfolio Fusion API - Unified portfolio view across all asset classes.
"""

import os
from datetime import datetime
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Header

from app.core import logger

router = APIRouter(prefix="/portfolio", tags=["Portfolio Fusion"])


def get_db_connection():
    """Create database connection."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verify API key for protected endpoints."""
    expected = os.getenv("OS_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.get("/overview")
def get_portfolio_overview(x_api_key: Optional[str] = Header(None)):
    """
    Get unified portfolio overview across all asset classes.
    
    Returns:
        - Total assets, liabilities, net worth
        - Allocation by asset class
        - Risk metrics
        - Latest fusion snapshot
    """
    verify_api_key(x_api_key)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get latest fusion record
        cursor.execute("""
            SELECT 
                equity_value, equity_count, equity_allocation_pct,
                property_value, property_count, property_allocation_pct,
                loan_balance, loan_count, loan_monthly_payment, loan_allocation_pct,
                total_assets, total_liabilities, net_worth,
                debt_service_ratio, risk_score,
                computed_at
            FROM portfolio_fusion
            ORDER BY computed_at DESC
            LIMIT 1
        """)
        
        fusion = cursor.fetchone()
        
        if not fusion:
            return {
                "status": "no_data",
                "message": "No portfolio fusion data available. Run portfolio_fusion_job.py first.",
                "total_assets": 0,
                "total_liabilities": 0,
                "net_worth": 0
            }
        
        # Format response
        return {
            "status": "success",
            "computed_at": fusion['computed_at'].isoformat(),
            "summary": {
                "total_assets": float(fusion['total_assets'] or 0),
                "total_liabilities": float(fusion['total_liabilities'] or 0),
                "net_worth": float(fusion['net_worth'] or 0),
                "debt_service_ratio": float(fusion['debt_service_ratio'] or 0),
                "risk_score": float(fusion['risk_score'] or 0)
            },
            "equities": {
                "value": float(fusion['equity_value'] or 0),
                "count": fusion['equity_count'],
                "allocation_pct": float(fusion['equity_allocation_pct'] or 0)
            },
            "property": {
                "value": float(fusion['property_value'] or 0),
                "count": fusion['property_count'],
                "allocation_pct": float(fusion['property_allocation_pct'] or 0)
            },
            "loans": {
                "balance": float(fusion['loan_balance'] or 0),
                "count": fusion['loan_count'],
                "monthly_payment": float(fusion['loan_monthly_payment'] or 0),
                "allocation_pct": float(fusion['loan_allocation_pct'] or 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching portfolio overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/risk")
def get_portfolio_risk(x_api_key: Optional[str] = Header(None)):
    """
    Get portfolio risk analysis.
    
    Returns:
        - Risk score
        - Debt service ratio
        - Leverage metrics
        - Risk breakdown by asset class
    """
    verify_api_key(x_api_key)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                risk_score,
                debt_service_ratio,
                total_assets,
                total_liabilities,
                net_worth,
                loan_allocation_pct,
                portfolio_volatility,
                max_drawdown,
                computed_at
            FROM portfolio_fusion
            ORDER BY computed_at DESC
            LIMIT 1
        """)
        
        risk = cursor.fetchone()
        
        if not risk:
            return {
                "status": "no_data",
                "message": "No risk data available"
            }
        
        # Calculate leverage ratio
        leverage = (risk['total_liabilities'] / risk['total_assets'] * 100) if risk['total_assets'] > 0 else 0
        
        return {
            "status": "success",
            "computed_at": risk['computed_at'].isoformat(),
            "risk_score": float(risk['risk_score'] or 0),
            "risk_level": "low" if risk['risk_score'] < 30 else "medium" if risk['risk_score'] < 60 else "high",
            "debt_service_ratio": float(risk['debt_service_ratio'] or 0),
            "leverage_ratio": float(leverage),
            "metrics": {
                "total_liabilities": float(risk['total_liabilities'] or 0),
                "net_worth": float(risk['net_worth'] or 0),
                "loan_allocation_pct": float(risk['loan_allocation_pct'] or 0),
                "portfolio_volatility": float(risk['portfolio_volatility']) if risk['portfolio_volatility'] else None,
                "max_drawdown": float(risk['max_drawdown']) if risk['max_drawdown'] else None
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching portfolio risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/allocation")
def get_portfolio_allocation(x_api_key: Optional[str] = Header(None)):
    """
    Get portfolio allocation breakdown by asset class.
    
    Returns detailed allocation percentages and values for:
    - Equities
    - Property
    - Loans
    """
    verify_api_key(x_api_key)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                equity_value, equity_allocation_pct,
                property_value, property_allocation_pct,
                loan_balance, loan_allocation_pct,
                total_assets,
                computed_at
            FROM portfolio_fusion
            ORDER BY computed_at DESC
            LIMIT 1
        """)
        
        allocation = cursor.fetchone()
        
        if not allocation:
            return {
                "status": "no_data",
                "message": "No allocation data available"
            }
        
        return {
            "status": "success",
            "computed_at": allocation['computed_at'].isoformat(),
            "total_assets": float(allocation['total_assets'] or 0),
            "asset_classes": [
                {
                    "name": "Equities",
                    "value": float(allocation['equity_value'] or 0),
                    "percentage": float(allocation['equity_allocation_pct'] or 0)
                },
                {
                    "name": "Property",
                    "value": float(allocation['property_value'] or 0),
                    "percentage": float(allocation['property_allocation_pct'] or 0)
                },
                {
                    "name": "Loans (Liabilities)",
                    "value": float(allocation['loan_balance'] or 0),
                    "percentage": float(allocation['loan_allocation_pct'] or 0)
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching portfolio allocation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.post("/refresh")
def refresh_portfolio_fusion(x_api_key: Optional[str] = Header(None)):
    """
    Trigger portfolio fusion recomputation.
    
    This will recalculate all portfolio metrics from current data.
    """
    verify_api_key(x_api_key)
    
    try:
        # Import and run the fusion job
        from jobs.portfolio_fusion_job import compute_portfolio_fusion
        
        result = compute_portfolio_fusion()
        
        return {
            "status": "success",
            "message": "Portfolio fusion recomputed",
            "summary": result
        }
        
    except Exception as e:
        logger.error(f"Error refreshing portfolio fusion: {e}")
        raise HTTPException(status_code=500, detail=str(e))
