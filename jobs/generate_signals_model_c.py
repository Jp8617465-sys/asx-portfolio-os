"""
Generate Model C (Sentiment) trading signals based on NLP analysis of ASX announcements.

Signal Generation Logic:
- Aggregate sentiment from last 7 days of announcements per ticker
- sentiment_score > 0.3 AND bullish_count >= 2 → BUY
- sentiment_score < -0.3 AND bearish_count >= 2 → SELL
- Otherwise → HOLD
- Confidence = avg_relevance * (|sentiment_score| / 1.0)
"""

import os
import sys
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import db_context, logger


def fetch_recent_sentiment(days: int = 7) -> List[Dict[str, Any]]:
    """
    Fetch sentiment data from nlp_announcements for the last N days.

    Returns list of dicts with ticker, sentiment, relevance, event_type
    """
    cutoff_date = datetime.now() - timedelta(days=days)

    query = """
        SELECT
            ticker,
            sentiment_label,
            sentiment_score,
            relevance_score,
            event_type,
            published_at
        FROM nlp_announcements
        WHERE published_at >= %s
        AND ticker IS NOT NULL
        AND sentiment_score IS NOT NULL
        ORDER BY ticker, published_at DESC
    """

    with db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (cutoff_date,))
        rows = cursor.fetchall()
        cursor.close()

    results = []
    for row in rows:
        results.append({
            'ticker': row[0],
            'sentiment_label': row[1],
            'sentiment_score': row[2],
            'relevance_score': row[3],
            'event_type': row[4],
            'published_at': row[5],
        })

    return results


def aggregate_sentiment_by_ticker(sentiment_data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Aggregate sentiment scores per ticker.

    Returns dict mapping ticker to aggregated metrics.
    """
    ticker_data: Dict[str, Dict[str, Any]] = {}

    for entry in sentiment_data:
        ticker = entry['ticker']

        if ticker not in ticker_data:
            ticker_data[ticker] = {
                'ticker': ticker,
                'sentiment_scores': [],
                'relevance_scores': [],
                'bullish_count': 0,
                'bearish_count': 0,
                'neutral_count': 0,
                'event_types': set(),
            }

        # Aggregate sentiment
        sentiment_score = entry['sentiment_score']
        sentiment_label = entry['sentiment_label']
        relevance = entry['relevance_score'] or 0.5

        ticker_data[ticker]['sentiment_scores'].append(sentiment_score)
        ticker_data[ticker]['relevance_scores'].append(relevance)

        # Count sentiment types
        if sentiment_label == 'positive':
            ticker_data[ticker]['bullish_count'] += 1
        elif sentiment_label == 'negative':
            ticker_data[ticker]['bearish_count'] += 1
        else:
            ticker_data[ticker]['neutral_count'] += 1

        # Collect event types
        if entry['event_type']:
            ticker_data[ticker]['event_types'].add(entry['event_type'])

    # Calculate averages
    for ticker, data in ticker_data.items():
        if data['sentiment_scores']:
            # Weighted average sentiment (weight by relevance)
            total_weight = sum(data['relevance_scores'])
            if total_weight > 0:
                weighted_sentiment = sum(
                    s * r for s, r in zip(data['sentiment_scores'], data['relevance_scores'])
                ) / total_weight
            else:
                weighted_sentiment = sum(data['sentiment_scores']) / len(data['sentiment_scores'])

            data['sentiment_score'] = weighted_sentiment
            data['avg_relevance'] = sum(data['relevance_scores']) / len(data['relevance_scores'])
        else:
            data['sentiment_score'] = 0.0
            data['avg_relevance'] = 0.0

        # Convert event_types set to list
        data['event_types'] = list(data['event_types'])

    return ticker_data


def generate_signal(agg_data: Dict[str, Any]) -> tuple[str, float]:
    """
    Generate BUY/HOLD/SELL signal based on aggregated sentiment.

    Returns (signal, confidence)
    """
    sentiment_score = agg_data['sentiment_score']
    bullish_count = agg_data['bullish_count']
    bearish_count = agg_data['bearish_count']
    avg_relevance = agg_data['avg_relevance']

    # Signal logic
    if sentiment_score > 0.3 and bullish_count >= 2:
        signal = 'BUY'
    elif sentiment_score < -0.3 and bearish_count >= 2:
        signal = 'SELL'
    else:
        signal = 'HOLD'

    # Confidence = relevance * normalized sentiment strength
    confidence = avg_relevance * min(abs(sentiment_score) / 1.0, 1.0)

    return signal, confidence


def persist_signals(as_of: date, ticker_signals: List[Dict[str, Any]]) -> int:
    """
    Insert or update Model C signals in database.

    Returns number of records inserted/updated.
    """
    query = """
        INSERT INTO model_c_sentiment_signals (
            as_of,
            symbol,
            signal,
            confidence,
            sentiment_score,
            bullish_count,
            bearish_count,
            neutral_count,
            avg_relevance,
            event_types,
            created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (as_of, symbol)
        DO UPDATE SET
            signal = EXCLUDED.signal,
            confidence = EXCLUDED.confidence,
            sentiment_score = EXCLUDED.sentiment_score,
            bullish_count = EXCLUDED.bullish_count,
            bearish_count = EXCLUDED.bearish_count,
            neutral_count = EXCLUDED.neutral_count,
            avg_relevance = EXCLUDED.avg_relevance,
            event_types = EXCLUDED.event_types,
            created_at = NOW()
    """

    with db_context() as conn:
        cursor = conn.cursor()

        for signal_data in ticker_signals:
            cursor.execute(
                query,
                (
                    as_of,
                    signal_data['ticker'],
                    signal_data['signal'],
                    signal_data['confidence'],
                    signal_data['sentiment_score'],
                    signal_data['bullish_count'],
                    signal_data['bearish_count'],
                    signal_data['neutral_count'],
                    signal_data['avg_relevance'],
                    signal_data['event_types'],
                ),
            )

        cursor.close()

    return len(ticker_signals)


def main():
    """Main execution: Fetch sentiment, aggregate, generate signals, persist."""
    logger.info("🚀 Starting Model C (Sentiment) signal generation...")

    as_of = date.today()

    # Fetch recent sentiment data
    logger.info("Fetching sentiment data from last 7 days...")
    sentiment_data = fetch_recent_sentiment(days=7)
    logger.info(f"Found {len(sentiment_data)} announcement sentiment records")

    if not sentiment_data:
        logger.warning("No sentiment data available - skipping signal generation")
        return

    # Aggregate by ticker
    logger.info("Aggregating sentiment by ticker...")
    ticker_aggregates = aggregate_sentiment_by_ticker(sentiment_data)
    logger.info(f"Aggregated sentiment for {len(ticker_aggregates)} tickers")

    # Generate signals
    logger.info("Generating BUY/HOLD/SELL signals...")
    ticker_signals = []

    for ticker, agg_data in ticker_aggregates.items():
        signal, confidence = generate_signal(agg_data)

        ticker_signals.append({
            'ticker': ticker,
            'signal': signal,
            'confidence': confidence,
            'sentiment_score': agg_data['sentiment_score'],
            'bullish_count': agg_data['bullish_count'],
            'bearish_count': agg_data['bearish_count'],
            'neutral_count': agg_data['neutral_count'],
            'avg_relevance': agg_data['avg_relevance'],
            'event_types': agg_data['event_types'],
        })

    # Persist to database
    logger.info(f"Persisting {len(ticker_signals)} signals to database...")
    count = persist_signals(as_of, ticker_signals)

    # Summary statistics
    buy_count = sum(1 for s in ticker_signals if s['signal'] == 'BUY')
    sell_count = sum(1 for s in ticker_signals if s['signal'] == 'SELL')
    hold_count = sum(1 for s in ticker_signals if s['signal'] == 'HOLD')

    logger.info(f"✅ Model C signal generation complete!")
    logger.info(f"   - Total signals: {count}")
    logger.info(f"   - BUY: {buy_count}")
    logger.info(f"   - SELL: {sell_count}")
    logger.info(f"   - HOLD: {hold_count}")
    logger.info(f"   - As of: {as_of}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        logger.exception(f"❌ Model C signal generation failed: {e}")
        sys.exit(1)
