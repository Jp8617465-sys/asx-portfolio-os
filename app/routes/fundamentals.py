"""
app/routes/fundamentals.py
Fundamentals data and Model B (fundamental analysis) signal endpoints.
"""

from typing import Optional

import pandas as pd
from fastapi import APIRouter, Header, HTTPException

from app.core import db, require_key, logger

router = APIRouter()


@router.get("/fundamentals/metrics")
def get_fundamentals_metrics(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get latest fundamental metrics for a stock.

    Returns P/E, P/B, ROE, debt/equity, profit margin, and other fundamentals.
    """
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith('.AU'):
        ticker = f"{ticker}.AU"

    try:
        with db() as con:
            query = """
                SELECT DISTINCT ON (symbol)
                    symbol,
                    sector,
                    industry,
                    pe_ratio,
                    pb_ratio,
                    eps,
                    roe,
                    debt_to_equity,
                    market_cap,
                    div_yield,
                    revenue_growth_yoy,
                    profit_margin,
                    current_ratio,
                    quick_ratio,
                    eps_growth,
                    free_cash_flow,
                    updated_at,
                    period_end
                FROM fundamentals
                WHERE symbol = %s
                ORDER BY symbol, updated_at DESC
            """
            df = pd.read_sql(query, con, params=(ticker,))
    except Exception as e:
        logger.error("Failed to fetch fundamentals for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No fundamental data found for {ticker}"
        )

    row = df.iloc[0]

    return {
        "symbol": row['symbol'],
        "sector": row['sector'],
        "industry": row['industry'],
        "metrics": {
            "valuation": {
                "pe_ratio": float(row['pe_ratio']) if pd.notna(row['pe_ratio']) else None,
                "pb_ratio": float(row['pb_ratio']) if pd.notna(row['pb_ratio']) else None,
                "market_cap": float(row['market_cap']) if pd.notna(row['market_cap']) else None,
            },
            "profitability": {
                "roe": float(row['roe']) if pd.notna(row['roe']) else None,
                "profit_margin": float(row['profit_margin']) if pd.notna(row['profit_margin']) else None,
                "eps": float(row['eps']) if pd.notna(row['eps']) else None,
            },
            "growth": {
                "revenue_growth_yoy": float(row['revenue_growth_yoy']) if pd.notna(row['revenue_growth_yoy']) else None,
                "eps_growth": float(row['eps_growth']) if pd.notna(row['eps_growth']) else None,
            },
            "financial_health": {
                "debt_to_equity": float(row['debt_to_equity']) if pd.notna(row['debt_to_equity']) else None,
                "current_ratio": float(row['current_ratio']) if pd.notna(row['current_ratio']) else None,
                "quick_ratio": float(row['quick_ratio']) if pd.notna(row['quick_ratio']) else None,
                "free_cash_flow": float(row['free_cash_flow']) if pd.notna(row['free_cash_flow']) else None,
            },
            "income": {
                "div_yield": float(row['div_yield']) if pd.notna(row['div_yield']) else None,
            }
        },
        "updated_at": row['updated_at'].isoformat() if pd.notna(row['updated_at']) else None,
        "period_end": str(row['period_end']) if pd.notna(row['period_end']) else None,
    }


@router.get("/fundamentals/quality")
def get_fundamentals_quality(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get Model B fundamental quality score for a stock.

    Returns quality grade (A-F) and confidence.
    """
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith('.AU'):
        ticker = f"{ticker}.AU"

    try:
        with db() as con:
            query = """
                SELECT
                    symbol,
                    as_of,
                    signal,
                    quality_score,
                    confidence,
                    ml_prob,
                    ml_expected_return,
                    rank,
                    pe_ratio,
                    pb_ratio,
                    roe,
                    debt_to_equity,
                    profit_margin,
                    created_at
                FROM model_b_ml_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
            """
            df = pd.read_sql(query, con, params=(ticker,))
    except Exception as e:
        logger.error("Failed to fetch Model B quality for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No Model B quality score found for {ticker}. Signal may not have been generated yet."
        )

    row = df.iloc[0]

    # Interpret quality score
    quality_map = {
        'A': 'Excellent',
        'B': 'Good',
        'C': 'Fair',
        'D': 'Poor',
        'F': 'Fail'
    }

    return {
        "symbol": row['symbol'],
        "as_of": str(row['as_of']),
        "quality": {
            "score": row['quality_score'],
            "grade_description": quality_map.get(row['quality_score'], 'Unknown'),
            "confidence": float(row['confidence']) if pd.notna(row['confidence']) else None,
        },
        "signal": row['signal'],
        "expected_return": float(row['ml_expected_return']) if pd.notna(row['ml_expected_return']) else None,
        "rank": int(row['rank']) if pd.notna(row['rank']) else None,
        "fundamentals_snapshot": {
            "pe_ratio": float(row['pe_ratio']) if pd.notna(row['pe_ratio']) else None,
            "pb_ratio": float(row['pb_ratio']) if pd.notna(row['pb_ratio']) else None,
            "roe": float(row['roe']) if pd.notna(row['roe']) else None,
            "debt_to_equity": float(row['debt_to_equity']) if pd.notna(row['debt_to_equity']) else None,
            "profit_margin": float(row['profit_margin']) if pd.notna(row['profit_margin']) else None,
        },
        "created_at": row['created_at'].isoformat() if pd.notna(row['created_at']) else None,
    }


@router.get("/signals/model_b/latest")
def get_model_b_signals_latest(
    limit: int = 50,
    signal_filter: Optional[str] = None,
    quality_filter: Optional[str] = None,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get latest Model B (fundamental analysis) signals.

    Returns top fundamental quality stocks with BUY/HOLD/SELL signals.
    """
    require_key(x_api_key)

    try:
        with db() as con:
            # Build query with filters
            conditions = ["as_of = (SELECT MAX(as_of) FROM model_b_ml_signals)"]
            params = []

            if signal_filter:
                conditions.append("signal = %s")
                params.append(signal_filter.upper())

            if quality_filter:
                conditions.append("quality_score = %s")
                params.append(quality_filter.upper())

            where_clause = " AND ".join(conditions)

            query = f"""
                SELECT
                    symbol,
                    as_of,
                    signal,
                    quality_score,
                    confidence,
                    ml_prob,
                    ml_expected_return,
                    rank,
                    score,
                    pe_ratio,
                    pb_ratio,
                    roe,
                    debt_to_equity,
                    profit_margin
                FROM model_b_ml_signals
                WHERE {where_clause}
                ORDER BY rank ASC
                LIMIT %s
            """
            params.append(limit)

            df = pd.read_sql(query, con, params=tuple(params))
    except Exception as e:
        logger.error("Failed to fetch Model B signals: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        return {
            "status": "ok",
            "count": 0,
            "as_of": None,
            "signals": [],
            "message": "No Model B signals found. Run generate_signals_model_b.py first."
        }

    as_of = str(df['as_of'].iloc[0])

    signals = []
    for _, row in df.iterrows():
        signals.append({
            "symbol": row['symbol'],
            "signal": row['signal'],
            "quality_score": row['quality_score'],
            "confidence": float(row['confidence']) if pd.notna(row['confidence']) else None,
            "expected_return": float(row['ml_expected_return']) if pd.notna(row['ml_expected_return']) else None,
            "rank": int(row['rank']) if pd.notna(row['rank']) else None,
            "fundamentals": {
                "pe_ratio": float(row['pe_ratio']) if pd.notna(row['pe_ratio']) else None,
                "pb_ratio": float(row['pb_ratio']) if pd.notna(row['pb_ratio']) else None,
                "roe": float(row['roe']) if pd.notna(row['roe']) else None,
                "debt_to_equity": float(row['debt_to_equity']) if pd.notna(row['debt_to_equity']) else None,
                "profit_margin": float(row['profit_margin']) if pd.notna(row['profit_margin']) else None,
            }
        })

    return {
        "status": "ok",
        "count": len(signals),
        "as_of": as_of,
        "filters": {
            "signal": signal_filter,
            "quality": quality_filter,
        },
        "signals": signals,
    }


@router.get("/signals/model_b/{ticker}")
def get_model_b_signal_for_ticker(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get Model B signal for a specific stock.
    """
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith('.AU'):
        ticker = f"{ticker}.AU"

    try:
        with db() as con:
            query = """
                SELECT
                    symbol,
                    as_of,
                    signal,
                    quality_score,
                    confidence,
                    ml_prob,
                    ml_expected_return,
                    rank,
                    score,
                    pe_ratio,
                    pb_ratio,
                    roe,
                    debt_to_equity,
                    profit_margin,
                    created_at
                FROM model_b_ml_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
            """
            df = pd.read_sql(query, con, params=(ticker,))
    except Exception as e:
        logger.error("Failed to fetch Model B signal for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No Model B signal found for {ticker}"
        )

    row = df.iloc[0]

    return {
        "symbol": row['symbol'],
        "as_of": str(row['as_of']),
        "signal": row['signal'],
        "quality_score": row['quality_score'],
        "confidence": float(row['confidence']) if pd.notna(row['confidence']) else None,
        "expected_return": float(row['ml_expected_return']) if pd.notna(row['ml_expected_return']) else None,
        "rank": int(row['rank']) if pd.notna(row['rank']) else None,
        "fundamentals": {
            "pe_ratio": float(row['pe_ratio']) if pd.notna(row['pe_ratio']) else None,
            "pb_ratio": float(row['pb_ratio']) if pd.notna(row['pb_ratio']) else None,
            "roe": float(row['roe']) if pd.notna(row['roe']) else None,
            "debt_to_equity": float(row['debt_to_equity']) if pd.notna(row['debt_to_equity']) else None,
            "profit_margin": float(row['profit_margin']) if pd.notna(row['profit_margin']) else None,
        },
        "created_at": row['created_at'].isoformat() if pd.notna(row['created_at']) else None,
    }
