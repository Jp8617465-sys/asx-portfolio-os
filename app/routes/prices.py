"""
app/routes/prices.py
Stock price data endpoints for historical OHLC data and charts.
"""

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.core import db_context, logger

router = APIRouter(prefix="/prices", tags=["Prices"])


class OHLCData(BaseModel):
    """OHLC price data for a single day."""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class PriceHistoryResponse(BaseModel):
    """Historical price data response."""
    ticker: str
    start_date: str
    end_date: str
    count: int
    data: List[OHLCData]


@router.get("/{ticker}/history", response_model=PriceHistoryResponse)
async def get_price_history(
    ticker: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    period: Optional[str] = Query("3M", description="Time period (3M, 6M, 1Y, 2Y, 5Y)")
):
    """
    Get historical OHLC price data for a stock.

    **Parameters**:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")
    - start_date: Start date (optional, YYYY-MM-DD format)
    - end_date: End date (optional, YYYY-MM-DD format, defaults to today)
    - period: Shorthand period (3M, 6M, 1Y, 2Y, 5Y) - used if dates not provided

    **Returns**:
    - Historical OHLC data ordered by date
    - Data points include: date, open, high, low, close, volume

    **Examples**:
    - `/prices/BHP.AX/history?period=6M` - Last 6 months
    - `/prices/BHP.AX/history?start_date=2025-01-01&end_date=2025-12-31` - Custom range
    """
    try:
        ticker = ticker.strip().upper()

        # Ensure ticker has .AX suffix
        if not ticker.endswith('.AX'):
            ticker = f"{ticker}.AX"

        # Parse dates
        if not end_date:
            end_date = date.today().isoformat()

        if not start_date:
            # Calculate start date based on period
            end = date.today()
            period_map = {
                "3M": 90,
                "6M": 180,
                "1Y": 365,
                "2Y": 730,
                "5Y": 1825,
            }
            days = period_map.get(period, 90)
            start = end - timedelta(days=days)
            start_date = start.isoformat()

        with db_context() as conn:
            cur = conn.cursor()

            # Verify ticker exists
            cur.execute(
                "SELECT symbol FROM universe WHERE symbol = %s",
                (ticker,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=f"Stock '{ticker}' not found in universe"
                )

            # Get OHLC data
            cur.execute(
                """
                SELECT dt, open, high, low, close, volume
                FROM prices
                WHERE ticker = %s
                  AND dt BETWEEN %s AND %s
                ORDER BY dt ASC
                """,
                (ticker, start_date, end_date)
            )
            rows = cur.fetchall()

            if not rows:
                logger.warning(f"No price data found for {ticker} between {start_date} and {end_date}")
                return PriceHistoryResponse(
                    ticker=ticker,
                    start_date=start_date,
                    end_date=end_date,
                    count=0,
                    data=[]
                )

            data = [
                OHLCData(
                    date=row[0].isoformat() if isinstance(row[0], date) else row[0],
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=int(row[5]) if row[5] else 0
                )
                for row in rows
            ]

            logger.info(f"Returned {len(data)} price points for {ticker} ({start_date} to {end_date})")

            return PriceHistoryResponse(
                ticker=ticker,
                start_date=start_date,
                end_date=end_date,
                count=len(data),
                data=data
            )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to get price history for {ticker}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to get price history: {str(exc)}")


@router.get("/{ticker}/latest")
async def get_latest_price(ticker: str):
    """
    Get the most recent price for a stock.

    **Parameters**:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")

    **Returns**:
    - Latest price data with date, close, and volume
    """
    try:
        ticker = ticker.strip().upper()

        # Ensure ticker has .AX suffix
        if not ticker.endswith('.AX'):
            ticker = f"{ticker}.AX"

        with db_context() as conn:
            cur = conn.cursor()

            # Get latest price
            cur.execute(
                """
                SELECT dt, open, high, low, close, volume
                FROM prices
                WHERE ticker = %s
                ORDER BY dt DESC
                LIMIT 1
                """,
                (ticker,)
            )
            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"No price data found for {ticker}"
                )

            return {
                "ticker": ticker,
                "date": row[0].isoformat() if isinstance(row[0], date) else row[0],
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": int(row[5]) if row[5] else 0
            }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to get latest price for {ticker}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest price: {str(exc)}")
