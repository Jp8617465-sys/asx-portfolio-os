"""
app/routes/search.py
Stock search and autocomplete endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.core import db_context, logger

router = APIRouter(prefix="/search", tags=["Search"])


class StockSearchResult(BaseModel):
    """Stock search result."""
    symbol: str
    name: str
    sector: Optional[str] = None
    market_cap: Optional[float] = None
    exchange: str = "ASX"


class SearchResponse(BaseModel):
    """Search results response."""
    query: str
    results: List[StockSearchResult]
    count: int


@router.get("", response_model=SearchResponse)
async def search_stocks(
    q: str = Query(..., min_length=1, max_length=20, description="Search query (ticker symbol or company name)"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of results to return")
):
    """
    Search for ASX stocks by ticker symbol or company name.

    **Parameters**:
    - q: Search query (e.g., "BHP", "Commonwealth", "CBA")
    - limit: Maximum results (default: 10, max: 50)

    **Returns**:
    - List of matching stocks ordered by market cap (largest first)

    **Examples**:
    - `/search?q=BHP` - Find BHP Group
    - `/search?q=bank` - Find all banks
    - `/search?q=CBA.AX` - Find Commonwealth Bank by ticker
    """
    try:
        search_query = q.strip().upper()

        with db_context() as conn:
            cur = conn.cursor()

            # Search in stock_universe table (all ASX stocks)
            # Search both symbol and name fields
            # Use ILIKE for case-insensitive search
            cur.execute(
                """
                SELECT ticker as symbol, company_name as name, sector, market_cap
                FROM stock_universe
                WHERE (ticker ILIKE %s OR company_name ILIKE %s)
                  AND is_active = TRUE
                ORDER BY market_cap DESC NULLS LAST, ticker ASC
                LIMIT %s
                """,
                (f"%{search_query}%", f"%{search_query}%", limit)
            )
            rows = cur.fetchall()

            results = [
                StockSearchResult(
                    symbol=row[0],
                    name=row[1],
                    sector=row[2],
                    market_cap=float(row[3]) if row[3] else None,
                    exchange="ASX"
                )
                for row in rows
            ]

            logger.info(f"Search query '{q}' returned {len(results)} results")

            return SearchResponse(
                query=q,
                results=results,
                count=len(results)
            )

    except Exception as exc:
        logger.exception(f"Search failed for query '{q}': {exc}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(exc)}")
