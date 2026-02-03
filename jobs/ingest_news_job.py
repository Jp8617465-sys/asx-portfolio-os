"""
jobs/ingest_news_job.py
News Scraping and Sentiment Analysis Job for Model C

Fetches news articles from NewsAPI for ASX stocks and analyzes sentiment
using FinBERT or similar financial sentiment model.
"""

import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict

import requests
from psycopg2.extras import execute_values

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import get_db_connection, logger

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
NEWS_API_URL = "https://newsapi.org/v2/everything"


def get_top_tickers(limit: int = 50) -> List[str]:
    """Get top ASX tickers to fetch news for"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get tickers from universe or recent signals
        cursor.execute(
            """
            SELECT DISTINCT symbol
            FROM universe
            WHERE market_cap > 1000000000  -- Only large cap stocks
            ORDER BY market_cap DESC
            LIMIT %s
            """,
            (limit,)
        )

        tickers = [row[0] for row in cursor.fetchall()]
        return tickers
    finally:
        cursor.close()
        conn.close()


def fetch_news_for_ticker(ticker: str, days: int = 7) -> List[Dict]:
    """Fetch news articles for a specific ticker from NewsAPI"""
    if not NEWS_API_KEY:
        logger.warning("NEWS_API_KEY not set, skipping news fetch")
        return []

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Remove .AX suffix for search
    search_ticker = ticker.replace('.AX', '')

    params = {
        "q": f"{search_ticker} OR ASX:{search_ticker}",
        "from": start_date.isoformat(),
        "to": end_date.isoformat(),
        "language": "en",
        "sortBy": "publishedAt",
        "apiKey": NEWS_API_KEY,
    }

    try:
        response = requests.get(NEWS_API_URL, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        articles = data.get("articles", [])

        logger.info(f"Fetched {len(articles)} articles for {ticker}")
        return articles

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching news for {ticker}: {e}")
        return []


def analyze_sentiment(text: str) -> Dict[str, any]:
    """
    Analyze sentiment using FinBERT or fallback to basic analysis

    Returns:
        dict with 'label' (positive/negative/neutral) and 'score' (0-1)
    """
    try:
        # Try to use transformers with FinBERT
        from transformers import pipeline

        # Use FinBERT for financial sentiment
        sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert"
        )

        # Truncate to max length (512 tokens)
        result = sentiment_pipeline(text[:512])

        label = result[0]["label"].lower()
        score = result[0]["score"]

        # Map FinBERT labels to our labels
        label_map = {
            "positive": "positive",
            "negative": "negative",
            "neutral": "neutral"
        }

        return {
            "label": label_map.get(label, "neutral"),
            "score": score
        }

    except ImportError:
        logger.warning("transformers not available, using basic sentiment")
        return basic_sentiment_analysis(text)


def basic_sentiment_analysis(text: str) -> Dict[str, any]:
    """
    Basic sentiment analysis as fallback
    Counts positive/negative keywords
    """
    text_lower = text.lower()

    positive_keywords = [
        'profit', 'growth', 'increase', 'gain', 'upgrade', 'strong',
        'beat', 'exceed', 'outperform', 'positive', 'bullish', 'rally'
    ]

    negative_keywords = [
        'loss', 'decline', 'decrease', 'downgrade', 'weak', 'miss',
        'underperform', 'negative', 'bearish', 'crash', 'fall', 'drop'
    ]

    pos_count = sum(1 for word in positive_keywords if word in text_lower)
    neg_count = sum(1 for word in negative_keywords if word in text_lower)

    total = pos_count + neg_count

    if total == 0:
        return {"label": "neutral", "score": 0.5}

    if pos_count > neg_count:
        return {"label": "positive", "score": min(0.5 + (pos_count - neg_count) * 0.1, 1.0)}
    elif neg_count > pos_count:
        return {"label": "negative", "score": min(0.5 + (neg_count - pos_count) * 0.1, 1.0)}
    else:
        return {"label": "neutral", "score": 0.5}


def store_news_articles(ticker: str, articles: List[Dict]) -> int:
    """Store news articles with sentiment in database"""
    if not articles:
        return 0

    conn = get_db_connection()
    cursor = conn.cursor()

    records = []

    for article in articles:
        title = article.get("title", "")
        description = article.get("description", "")
        content = article.get("content", "")
        url = article.get("url", "")
        published_at = article.get("publishedAt", "")
        source_name = article.get("source", {}).get("name", "NewsAPI")
        author = article.get("author", "")

        if not url or not title:
            continue

        # Combine title and description for sentiment analysis
        text_for_sentiment = f"{title}. {description}"

        # Analyze sentiment
        sentiment = analyze_sentiment(text_for_sentiment)

        records.append((
            ticker,
            title,
            content,
            url,
            published_at,
            sentiment["label"],
            sentiment["score"],
            source_name,
            author
        ))

    if not records:
        cursor.close()
        conn.close()
        return 0

    try:
        # Insert with ON CONFLICT DO NOTHING to avoid duplicates
        execute_values(
            cursor,
            """
            INSERT INTO news_sentiment (
                ticker, title, content, url, published_at,
                sentiment_label, sentiment_score, source, author
            )
            VALUES %s
            ON CONFLICT (url) DO NOTHING
            """,
            records
        )

        inserted_count = cursor.rowcount
        conn.commit()

        logger.info(f"Stored {inserted_count} new articles for {ticker}")
        return inserted_count

    except Exception as e:
        logger.error(f"Error storing articles for {ticker}: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()
        conn.close()


def run_news_ingestion(ticker_limit: int = 50, days: int = 7):
    """Main job to fetch and store news for top tickers"""
    logger.info(f"Starting news ingestion for top {ticker_limit} tickers")

    tickers = get_top_tickers(limit=ticker_limit)
    logger.info(f"Fetching news for {len(tickers)} tickers")

    total_articles = 0

    for ticker in tickers:
        logger.info(f"Processing {ticker}...")

        articles = fetch_news_for_ticker(ticker, days=days)
        stored = store_news_articles(ticker, articles)

        total_articles += stored

        # Be respectful of API rate limits
        import time
        time.sleep(1)  # 1 second between requests

    logger.info(f"News ingestion complete. Stored {total_articles} total articles")
    return total_articles


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingest news and analyze sentiment")
    parser.add_argument(
        "--tickers",
        type=int,
        default=50,
        help="Number of top tickers to fetch news for"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of days of historical news to fetch"
    )

    args = parser.parse_args()

    run_news_ingestion(ticker_limit=args.tickers, days=args.days)
