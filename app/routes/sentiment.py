"""
Sentiment analysis endpoints for Model C signals.
"""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from app.core import db_context, require_key, logger

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


@router.get("/signals/model_c/latest")
async def get_model_c_latest_signals(
    limit: int = 50,
    x_api_key: Optional[str] = Header(None),
):
    """
    Get latest Model C (Sentiment) signals.

    Args:
        limit: Maximum number of signals to return (default 50)

    Returns:
        JSON with as_of date and list of signals
    """
    require_key(x_api_key)

    query = """
        WITH latest_date AS (
            SELECT MAX(as_of) as max_date
            FROM model_c_sentiment_signals
        )
        SELECT
            s.symbol,
            s.signal,
            s.confidence,
            s.sentiment_score,
            s.bullish_count,
            s.bearish_count,
            s.neutral_count,
            s.avg_relevance,
            s.event_types,
            s.as_of
        FROM model_c_sentiment_signals s
        INNER JOIN latest_date ld ON s.as_of = ld.max_date
        ORDER BY s.confidence DESC
        LIMIT %s
    """

    with db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (limit,))
        rows = cursor.fetchall()

        if not rows:
            cursor.close()
            return {"signals": [], "as_of": None, "count": 0}

        as_of = rows[0][9] if rows else None

        signals = []
        for row in rows:
            signals.append({
                "symbol": row[0],
                "signal": row[1],
                "confidence": float(row[2]) if row[2] else 0.0,
                "sentiment_score": float(row[3]) if row[3] else 0.0,
                "bullish_count": row[4],
                "bearish_count": row[5],
                "neutral_count": row[6],
                "avg_relevance": float(row[7]) if row[7] else 0.0,
                "event_types": row[8] or [],
            })

        cursor.close()

    return {
        "signals": signals,
        "as_of": as_of.isoformat() if as_of else None,
        "count": len(signals),
    }


@router.get("/signals/model_c/{ticker}")
async def get_model_c_signal_for_ticker(
    ticker: str,
    x_api_key: Optional[str] = Header(None),
):
    """
    Get latest Model C (Sentiment) signal for specific ticker.

    Args:
        ticker: Stock symbol (e.g., 'BHP.AX')

    Returns:
        JSON with signal details
    """
    require_key(x_api_key)

    query = """
        SELECT
            symbol,
            signal,
            confidence,
            sentiment_score,
            bullish_count,
            bearish_count,
            neutral_count,
            avg_relevance,
            event_types,
            as_of
        FROM model_c_sentiment_signals
        WHERE symbol = %s
        ORDER BY as_of DESC
        LIMIT 1
    """

    with db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (ticker,))
        row = cursor.fetchone()
        cursor.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"No Model C signal found for {ticker}")

    return {
        "symbol": row[0],
        "signal": row[1],
        "confidence": float(row[2]) if row[2] else 0.0,
        "sentiment_score": float(row[3]) if row[3] else 0.0,
        "bullish_count": row[4],
        "bearish_count": row[5],
        "neutral_count": row[6],
        "avg_relevance": float(row[7]) if row[7] else 0.0,
        "event_types": row[8] or [],
        "as_of": row[9].isoformat() if row[9] else None,
    }


@router.get("/summary")
async def get_sentiment_summary(
    days: int = 7,
    x_api_key: Optional[str] = Header(None),
):
    """
    Get aggregated sentiment summary across all tickers.

    Args:
        days: Number of days to look back (default 7)

    Returns:
        JSON with sentiment distribution and top movers
    """
    require_key(x_api_key)

    cutoff_date = date.today() - timedelta(days=days)

    # Get overall sentiment distribution
    dist_query = """
        SELECT
            sentiment_label,
            COUNT(*) as count,
            AVG(sentiment_score) as avg_score
        FROM nlp_announcements
        WHERE published_at >= %s
        AND sentiment_label IS NOT NULL
        GROUP BY sentiment_label
    """

    # Get top positive and negative movers
    movers_query = """
        SELECT
            symbol,
            signal,
            sentiment_score,
            confidence,
            bullish_count,
            bearish_count
        FROM model_c_sentiment_signals
        ORDER BY ABS(sentiment_score) DESC
        LIMIT 10
    """

    with db_context() as conn:
        cursor = conn.cursor()

        # Get distribution
        cursor.execute(dist_query, (cutoff_date,))
        dist_rows = cursor.fetchall()

        distribution = {
            "positive": 0,
            "negative": 0,
            "neutral": 0,
        }
        for row in dist_rows:
            label = row[0] or 'neutral'
            distribution[label] = row[1]

        # Get top movers
        cursor.execute(movers_query)
        mover_rows = cursor.fetchall()

        top_movers = []
        for row in mover_rows:
            top_movers.append({
                "symbol": row[0],
                "signal": row[1],
                "sentiment_score": float(row[2]) if row[2] else 0.0,
                "confidence": float(row[3]) if row[3] else 0.0,
                "bullish_count": row[4],
                "bearish_count": row[5],
            })

        cursor.close()

    total = sum(distribution.values())
    distribution_pct = {
        k: round((v / total * 100) if total > 0 else 0, 1)
        for k, v in distribution.items()
    }

    return {
        "distribution": distribution,
        "distribution_pct": distribution_pct,
        "top_movers": top_movers,
        "period_days": days,
    }
