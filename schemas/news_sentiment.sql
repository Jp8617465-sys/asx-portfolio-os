-- News Sentiment Table for Model C News Integration
-- Stores news articles with sentiment analysis

CREATE TABLE IF NOT EXISTS news_sentiment (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    sentiment_label VARCHAR(20), -- positive, negative, neutral
    sentiment_score NUMERIC(5, 4), -- 0-1 confidence score
    source VARCHAR(100), -- NewsAPI, ASX, etc.
    author VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_news_sentiment_ticker ON news_sentiment(ticker);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_published ON news_sentiment(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_label ON news_sentiment(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_created ON news_sentiment(created_at DESC);

-- Composite index for ticker + date queries
CREATE INDEX IF NOT EXISTS idx_news_ticker_published ON news_sentiment(ticker, published_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_news_sentiment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_sentiment_timestamp
    BEFORE UPDATE ON news_sentiment
    FOR EACH ROW
    EXECUTE FUNCTION update_news_sentiment_timestamp();

-- Comments
COMMENT ON TABLE news_sentiment IS 'News articles with sentiment analysis for Model C';
COMMENT ON COLUMN news_sentiment.ticker IS 'Stock ticker symbol - references stock_universe.symbol (FK added in migration 001)';
COMMENT ON COLUMN news_sentiment.sentiment_label IS 'Sentiment classification: positive, negative, neutral';
COMMENT ON COLUMN news_sentiment.sentiment_score IS 'Confidence score from sentiment model (0-1)';
COMMENT ON COLUMN news_sentiment.source IS 'Source of the news article (NewsAPI, ASX, etc.)';
