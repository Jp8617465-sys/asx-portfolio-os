"""
app/features/etf/routes/etf_routes.py
Feature-based API routes for ETF operations.

Thin controller layer -- delegates to direct DB queries via psycopg2 RealDictCursor.
Uses db_context() for database access and require_key() for authentication.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from psycopg2.extras import RealDictCursor

from app.core import db_context, require_key, logger

router = APIRouter()


# ===========================================================================
# GET /api/etfs
# ===========================================================================

@router.get("/api/etfs")
def get_etf_list(
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get list of all ETFs with holdings counts.

    Returns:
        Dictionary with status, count, and list of ETFs
    """
    require_key(x_api_key)

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            query = """
                SELECT
                    e.symbol,
                    e.etf_name,
                    e.sector,
                    e.nav,
                    e.return_1w,
                    e.return_1m,
                    e.return_3m,
                    COUNT(h.holding_symbol) as holdings_count
                FROM etf_metadata e
                LEFT JOIN etf_holdings h ON e.symbol = h.etf_symbol
                GROUP BY e.symbol, e.etf_name, e.sector, e.nav,
                         e.return_1w, e.return_1m, e.return_3m
                ORDER BY e.symbol ASC
            """

            cur.execute(query)
            rows = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch ETF list: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not rows:
        return {
            "status": "ok",
            "count": 0,
            "etfs": [],
        }

    etfs = [
        {
            "symbol": r["symbol"],
            "etf_name": r.get("etf_name"),
            "sector": r.get("sector"),
            "nav": float(r["nav"]) if r.get("nav") is not None else None,
            "return_1w": float(r["return_1w"]) if r.get("return_1w") is not None else None,
            "return_1m": float(r["return_1m"]) if r.get("return_1m") is not None else None,
            "return_3m": float(r["return_3m"]) if r.get("return_3m") is not None else None,
            "holdings_count": int(r["holdings_count"]) if r.get("holdings_count") is not None else 0,
        }
        for r in rows
    ]

    return {
        "status": "ok",
        "count": len(etfs),
        "etfs": etfs,
    }


# ===========================================================================
# GET /api/etfs/{symbol}/holdings
# ===========================================================================

@router.get("/api/etfs/{symbol}/holdings")
def get_etf_holdings(
    symbol: str,
    with_signals: bool = False,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get holdings for a specific ETF with optional signal enrichment.

    Args:
        symbol: ETF ticker symbol (e.g., "STW.AX" or "STW")
        with_signals: If true, enrich holdings with ensemble signals

    Returns:
        Dictionary with status, etf_symbol, holdings_count, and holdings list
    """
    require_key(x_api_key)

    # Normalize symbol to include .AX suffix
    if not symbol.endswith(".AX"):
        symbol = f"{symbol}.AX"

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            if with_signals:
                # Query with signal enrichment
                query = """
                    SELECT
                        h.etf_symbol,
                        h.holding_symbol,
                        h.holding_name,
                        h.weight,
                        h.shares_held,
                        h.market_value,
                        h.sector,
                        h.as_of_date,
                        e.signal,
                        e.confidence
                    FROM etf_holdings h
                    LEFT JOIN ensemble_signals e
                        ON h.holding_symbol = e.symbol
                        AND e.as_of = (SELECT MAX(as_of) FROM ensemble_signals)
                    WHERE h.etf_symbol = %s
                    ORDER BY h.weight DESC NULLS LAST
                """
            else:
                # Query without signals
                query = """
                    SELECT
                        etf_symbol,
                        holding_symbol,
                        holding_name,
                        weight,
                        shares_held,
                        market_value,
                        sector,
                        as_of_date
                    FROM etf_holdings
                    WHERE etf_symbol = %s
                    ORDER BY weight DESC NULLS LAST
                """

            cur.execute(query, (symbol,))
            rows = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch holdings for %s: %s", symbol, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not rows:
        return {
            "status": "ok",
            "etf_symbol": symbol,
            "holdings_count": 0,
            "as_of_date": None,
            "holdings": [],
        }

    as_of_date = str(rows[0]["as_of_date"]) if rows[0].get("as_of_date") else None

    holdings = []
    for r in rows:
        holding = {
            "etf_symbol": r["etf_symbol"],
            "holding_symbol": r["holding_symbol"],
            "holding_name": r.get("holding_name"),
            "weight": float(r["weight"]) if r.get("weight") is not None else None,
            "shares_held": int(r["shares_held"]) if r.get("shares_held") is not None else None,
            "market_value": float(r["market_value"]) if r.get("market_value") is not None else None,
            "sector": r.get("sector"),
            "as_of_date": str(r["as_of_date"]) if r.get("as_of_date") else None,
        }

        # Add signal fields if enrichment was requested
        if with_signals:
            holding["signal"] = r.get("signal")
            holding["confidence"] = float(r["confidence"]) if r.get("confidence") is not None else None

        holdings.append(holding)

    return {
        "status": "ok",
        "etf_symbol": symbol,
        "holdings_count": len(holdings),
        "as_of_date": as_of_date,
        "holdings": holdings,
    }


# ===========================================================================
# GET /api/etfs/{symbol}/sectors
# ===========================================================================

@router.get("/api/etfs/{symbol}/sectors")
def get_etf_sector_allocation(
    symbol: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get sector allocation breakdown for an ETF.

    Args:
        symbol: ETF ticker symbol (e.g., "STW.AX" or "STW")

    Returns:
        Dictionary with status, etf_symbol, and sectors list
    """
    require_key(x_api_key)

    # Normalize symbol to include .AX suffix
    if not symbol.endswith(".AX"):
        symbol = f"{symbol}.AX"

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            query = """
                SELECT
                    sector,
                    SUM(weight) as weight,
                    COUNT(*) as holding_count
                FROM etf_holdings
                WHERE etf_symbol = %s
                  AND sector IS NOT NULL
                GROUP BY sector
                ORDER BY weight DESC
            """

            cur.execute(query, (symbol,))
            rows = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch sector allocation for %s: %s", symbol, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    sectors = [
        {
            "sector": r["sector"],
            "weight": float(r["weight"]) if r.get("weight") is not None else 0.0,
            "holding_count": int(r["holding_count"]) if r.get("holding_count") is not None else 0,
        }
        for r in rows
    ]

    return {
        "status": "ok",
        "etf_symbol": symbol,
        "sectors": sectors,
    }
