-- Model C: Sentiment-based signals from NLP analysis of ASX announcements
-- Creates signals based on aggregated sentiment scores from recent announcements

CREATE TABLE IF NOT EXISTS model_c_sentiment_signals (
    id BIGSERIAL PRIMARY KEY,
    as_of DATE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    signal VARCHAR(20) NOT NULL,  -- BUY, HOLD, SELL
    confidence NUMERIC(5,4),
    sentiment_score NUMERIC(5,4),  -- Aggregated score (-1 to +1)
    bullish_count INT DEFAULT 0,
    bearish_count INT DEFAULT 0,
    neutral_count INT DEFAULT 0,
    avg_relevance NUMERIC(5,4),
    event_types TEXT[],  -- Array of event types seen
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(as_of, symbol)
);

CREATE INDEX IF NOT EXISTS idx_sentiment_signals_symbol ON model_c_sentiment_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_signals_date ON model_c_sentiment_signals(as_of DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_signals_signal ON model_c_sentiment_signals(signal);

COMMENT ON TABLE model_c_sentiment_signals IS 'Daily sentiment-based trading signals derived from NLP analysis of announcements';
COMMENT ON COLUMN model_c_sentiment_signals.sentiment_score IS 'Weighted average sentiment from -1 (very negative) to +1 (very positive)';
COMMENT ON COLUMN model_c_sentiment_signals.avg_relevance IS 'Average relevance score of announcements used (0-1)';
COMMENT ON COLUMN model_c_sentiment_signals.event_types IS 'Array of announcement types (e.g., earnings, dividends, M&A)';
