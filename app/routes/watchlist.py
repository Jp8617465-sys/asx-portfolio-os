"""
app/routes/watchlist.py
User watchlist management endpoints.
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core import db_context, logger
from app.auth import get_current_user_id

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


class WatchlistItem(BaseModel):
    """Watchlist item with stock info and current signal."""
    id: int
    ticker: str
    name: Optional[str] = None
    current_price: Optional[float] = None
    price_change_pct: Optional[float] = None
    current_signal: Optional[str] = None
    signal_confidence: Optional[float] = None
    quality_score: Optional[str] = None
    added_at: str


class AddWatchlistRequest(BaseModel):
    """Request to add stock to watchlist."""
    ticker: str


class WatchlistResponse(BaseModel):
    """Watchlist response."""
    count: int
    items: List[WatchlistItem]


@router.get("", response_model=WatchlistResponse)
async def get_watchlist(user_id: int = Depends(get_current_user_id)):
    """
    Get user's watchlist with current prices and signals.

    **Authentication**: Requires valid JWT token.

    **Returns**:
    - List of stocks in watchlist with current data
    - Includes latest signal and price information
    """
    try:
        with db_context() as conn:
            cur = conn.cursor()

            # Get watchlist items with enriched data
            cur.execute(
                """
                SELECT
                    w.id,
                    w.ticker,
                    u.name,
                    p.close as current_price,
                    NULL as price_change_pct,  -- TODO: Calculate from yesterday's close
                    a.signal_label as current_signal,
                    a.confidence as signal_confidence,
                    b.quality_score,
                    w.added_at
                FROM user_watchlist w
                LEFT JOIN universe u ON u.symbol = w.ticker
                LEFT JOIN LATERAL (
                    SELECT close
                    FROM prices
                    WHERE symbol = w.ticker
                    ORDER BY dt DESC
                    LIMIT 1
                ) p ON true
                LEFT JOIN LATERAL (
                    SELECT signal_label, confidence
                    FROM model_a_ml_signals
                    WHERE symbol = w.ticker
                    ORDER BY as_of DESC
                    LIMIT 1
                ) a ON true
                LEFT JOIN LATERAL (
                    SELECT quality_score
                    FROM model_b_ml_signals
                    WHERE symbol = w.ticker
                    ORDER BY as_of DESC
                    LIMIT 1
                ) b ON true
                WHERE w.user_id = %s
                ORDER BY w.added_at DESC
                """,
                (user_id,)
            )
            rows = cur.fetchall()

            items = [
                WatchlistItem(
                    id=row[0],
                    ticker=row[1],
                    name=row[2],
                    current_price=float(row[3]) if row[3] else None,
                    price_change_pct=float(row[4]) if row[4] else None,
                    current_signal=row[5],
                    signal_confidence=float(row[6]) if row[6] else None,
                    quality_score=row[7],
                    added_at=row[8].isoformat() if row[8] else datetime.now().isoformat()
                )
                for row in rows
            ]

            return WatchlistResponse(
                count=len(items),
                items=items
            )

    except Exception as exc:
        logger.exception(f"Failed to get watchlist for user {user_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to get watchlist: {str(exc)}")


@router.post("", status_code=201)
async def add_to_watchlist(
    request: AddWatchlistRequest,
    user_id: int = Depends(get_current_user_id)
):
    """
    Add a stock to user's watchlist.

    **Authentication**: Requires valid JWT token.

    **Request Body**:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")

    **Returns**:
    - Confirmation message with watchlist item ID
    """
    try:
        ticker = request.ticker.strip().upper()

        # Ensure ticker has .AX suffix
        if not ticker.endswith('.AX'):
            ticker = f"{ticker}.AX"

        with db_context() as conn:
            cur = conn.cursor()

            # Verify ticker exists in universe
            cur.execute(
                "SELECT symbol FROM universe WHERE symbol = %s",
                (ticker,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=f"Stock '{ticker}' not found in ASX200 universe"
                )

            # Check if already in watchlist
            cur.execute(
                "SELECT id FROM user_watchlist WHERE user_id = %s AND ticker = %s",
                (user_id, ticker)
            )
            existing = cur.fetchone()

            if existing:
                return {
                    "status": "ok",
                    "message": f"{ticker} is already in your watchlist",
                    "watchlist_item_id": existing[0]
                }

            # Add to watchlist
            cur.execute(
                """
                INSERT INTO user_watchlist (user_id, ticker)
                VALUES (%s, %s)
                RETURNING id
                """,
                (user_id, ticker)
            )
            watchlist_item_id = cur.fetchone()[0]
            conn.commit()

            logger.info(f"User {user_id} added {ticker} to watchlist (ID: {watchlist_item_id})")

            return {
                "status": "success",
                "message": f"{ticker} added to watchlist",
                "watchlist_item_id": watchlist_item_id,
                "ticker": ticker
            }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to add {request.ticker} to watchlist: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to add to watchlist: {str(exc)}")


@router.delete("/{ticker}", status_code=200)
async def remove_from_watchlist(
    ticker: str,
    user_id: int = Depends(get_current_user_id)
):
    """
    Remove a stock from user's watchlist.

    **Authentication**: Requires valid JWT token.

    **Parameters**:
    - ticker: Stock ticker symbol to remove (e.g., "BHP.AX")

    **Returns**:
    - Confirmation message
    """
    try:
        ticker = ticker.strip().upper()

        # Ensure ticker has .AX suffix
        if not ticker.endswith('.AX'):
            ticker = f"{ticker}.AX"

        with db_context() as conn:
            cur = conn.cursor()

            # Delete from watchlist
            cur.execute(
                """
                DELETE FROM user_watchlist
                WHERE user_id = %s AND ticker = %s
                RETURNING id
                """,
                (user_id, ticker)
            )
            deleted = cur.fetchone()

            if not deleted:
                raise HTTPException(
                    status_code=404,
                    detail=f"{ticker} not found in your watchlist"
                )

            conn.commit()

            logger.info(f"User {user_id} removed {ticker} from watchlist")

            return {
                "status": "success",
                "message": f"{ticker} removed from watchlist",
                "ticker": ticker
            }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to remove {ticker} from watchlist: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to remove from watchlist: {str(exc)}")
