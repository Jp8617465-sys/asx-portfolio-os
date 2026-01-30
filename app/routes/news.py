"""
app/routes/news.py
News and Sentiment API Routes for Model C
"""

from datetime import datetime, timedelta
from typing import Optional

from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Header, Query

from app.core import db_context, require_key, logger

router = APIRouter(prefix="/news", tags=["News & Sentiment"])


@router.get("/{ticker}")
def get_ticker_news(
    ticker: str,
    days: int = Query(7, description="Number of days of historical news"),
    limit: int = Query(20, description="Maximum number of articles to return"),
    x_api_key: Optional[str] = Header(None)
):
    """
    Get recent news and sentiment for a specific ticker

    Args:
        ticker: Stock ticker symbol (e.g., BHP.AX)
        days: Number of days to look back (default 7)
        limit: Max articles to return (default 20)

    Returns:
        List of news articles with sentiment analysis
    """
    require_key(x_api_key)

    start_date = datetime.now() - timedelta(days=days)

    with db_context() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    ticker,
                    title,
                    content,
                    url,
                    published_at,
                    sentiment_label,
                    sentiment_score,
                    source,
                    author,
                    created_at
                FROM news_sentiment
                WHERE ticker = %s
                  AND published_at >= %s
                ORDER BY published_at DESC
                LIMIT %s
                """,
                (ticker, start_date, limit)
            )

            articles = cursor.fetchall()

            return {
                "status": "success",
                "ticker": ticker,
                "article_count": len(articles),
                "days": days,
                "articles": [
                    {
                        "id": article["id"],
                        "ticker": article["ticker"],
                        "title": article["title"],
                        "content": article["content"],
                        "url": article["url"],
                        "published_at": article["published_at"].isoformat(),
                        "sentiment_label": article["sentiment_label"],
                        "sentiment_score": float(article["sentiment_score"] or 0),
                        "source": article["source"],
                        "author": article["author"],
                        "created_at": article["created_at"].isoformat()
                    }
                    for article in articles
                ]
            }


@router.get("/sentiment/summary")
def get_sentiment_summary(
    days: int = Query(7, description="Number of days to aggregate"),
    limit: int = Query(20, description="Max stocks to return"),
    x_api_key: Optional[str] = Header(None)
):
    """
    Get aggregated sentiment summary across all stocks

    Args:
        days: Number of days to aggregate (default 7)
        limit: Max stocks to return in top movers (default 20)

    Returns:
        Sentiment distribution and top positive/negative stocks
    """
    require_key(x_api_key)

    start_date = datetime.now() - timedelta(days=days)

    with db_context() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Overall sentiment distribution
            cursor.execute(
                """
                SELECT
                    sentiment_label,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
                FROM news_sentiment
                WHERE published_at >= %s
                GROUP BY sentiment_label
                """,
                (start_date,)
            )

            distribution = {row["sentiment_label"]: {
                "count": row["count"],
                "percentage": float(row["percentage"])
            } for row in cursor.fetchall()}

            # Top positive stocks (highest avg sentiment)
            cursor.execute(
                """
                SELECT
                    ticker,
                    COUNT(*) as article_count,
                    AVG(sentiment_score) as avg_sentiment,
                    sentiment_label,
                    MAX(published_at) as latest_article
                FROM news_sentiment
                WHERE published_at >= %s
                  AND sentiment_label = 'positive'
                GROUP BY ticker, sentiment_label
                HAVING COUNT(*) >= 2  -- At least 2 articles
                ORDER BY AVG(sentiment_score) DESC
                LIMIT %s
                """,
                (start_date, limit)
            )

            top_positive = cursor.fetchall()

            # Top negative stocks (lowest avg sentiment)
            cursor.execute(
                """
                SELECT
                    ticker,
                    COUNT(*) as article_count,
                    AVG(sentiment_score) as avg_sentiment,
                    sentiment_label,
                    MAX(published_at) as latest_article
                FROM news_sentiment
                WHERE published_at >= %s
                  AND sentiment_label = 'negative'
                GROUP BY ticker, sentiment_label
                HAVING COUNT(*) >= 2
                ORDER BY AVG(sentiment_score) DESC
                LIMIT %s
                """,
                (start_date, limit)
            )

            top_negative = cursor.fetchall()

            # Total articles
            cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM news_sentiment
                WHERE published_at >= %s
                """,
                (start_date,)
            )

            total_articles = cursor.fetchone()["total"]

            return {
                "status": "success",
                "period_days": days,
                "total_articles": total_articles,
                "distribution": distribution,
                "top_positive": [
                    {
                        "ticker": row["ticker"],
                        "article_count": row["article_count"],
                        "avg_sentiment": float(row["avg_sentiment"]),
                        "sentiment_label": row["sentiment_label"],
                        "latest_article": row["latest_article"].isoformat()
                    }
                    for row in top_positive
                ],
                "top_negative": [
                    {
                        "ticker": row["ticker"],
                        "article_count": row["article_count"],
                        "avg_sentiment": float(row["avg_sentiment"]),
                        "sentiment_label": row["sentiment_label"],
                        "latest_article": row["latest_article"].isoformat()
                    }
                    for row in top_negative
                ]
            }


@router.get("/latest")
def get_latest_news(
    limit: int = Query(50, description="Max articles to return"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment (positive/negative/neutral)"),
    x_api_key: Optional[str] = Header(None)
):
    """
    Get latest news articles across all stocks

    Args:
        limit: Max articles to return (default 50)
        sentiment: Optional filter by sentiment label

    Returns:
        List of latest news articles
    """
    require_key(x_api_key)

    with db_context() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            if sentiment:
                cursor.execute(
                    """
                    SELECT
                        id, ticker, title, content, url, published_at,
                        sentiment_label, sentiment_score, source, author
                    FROM news_sentiment
                    WHERE sentiment_label = %s
                    ORDER BY published_at DESC
                    LIMIT %s
                    """,
                    (sentiment, limit)
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        id, ticker, title, content, url, published_at,
                        sentiment_label, sentiment_score, source, author
                    FROM news_sentiment
                    ORDER BY published_at DESC
                    LIMIT %s
                    """,
                    (limit,)
                )

            articles = cursor.fetchall()

            return {
                "status": "success",
                "article_count": len(articles),
                "filter": sentiment,
                "articles": [
                    {
                        "id": article["id"],
                        "ticker": article["ticker"],
                        "title": article["title"],
                        "content": article["content"],
                        "url": article["url"],
                        "published_at": article["published_at"].isoformat(),
                        "sentiment_label": article["sentiment_label"],
                        "sentiment_score": float(article["sentiment_score"] or 0),
                        "source": article["source"],
                        "author": article["author"]
                    }
                    for article in articles
                ]
            }
