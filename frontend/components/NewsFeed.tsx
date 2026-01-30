'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ExternalLink, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface NewsArticle {
  id: number;
  ticker: string;
  title: string;
  content: string;
  url: string;
  published_at: string;
  sentiment_label: string;
  sentiment_score: number;
  source: string;
  author: string;
}

interface NewsFeedProps {
  ticker?: string;
  limit?: number;
  showFilters?: boolean;
}

export default function NewsFeed({ ticker, limit = 20, showFilters = true }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadNews();
  }, [ticker, sentimentFilter, days]);

  const loadNews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (ticker) {
        response = await api.getTickerNews(ticker, { days, limit });
        setArticles(response.data.articles || []);
      } else if (sentimentFilter) {
        response = await api.get(`/api/news/latest`, {
          params: { limit, sentiment: sentimentFilter },
        });
        setArticles(response.data.articles || []);
      } else {
        response = await api.getLatestNews({ limit });
        setArticles(response.data.articles || []);
      }
    } catch (err) {
      console.error('Failed to load news:', err);
      setError('Failed to load news articles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      case 'neutral':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4" />;
      case 'neutral':
        return <Minus className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading news...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Timeframe:</span>
            <div className="flex gap-1">
              {[1, 7, 30].map((d) => (
                <Button
                  key={d}
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDays(d)}
                >
                  {d === 1 ? '24h' : `${d}d`}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sentiment:</span>
            <div className="flex gap-1">
              <Button
                variant={sentimentFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter(null)}
              >
                All
              </Button>
              <Button
                variant={sentimentFilter === 'positive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('positive')}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Positive
              </Button>
              <Button
                variant={sentimentFilter === 'negative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('negative')}
              >
                <TrendingDown className="h-3 w-3 mr-1" />
                Negative
              </Button>
              <Button
                variant={sentimentFilter === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('neutral')}
              >
                <Minus className="h-3 w-3 mr-1" />
                Neutral
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-4">
        {articles.length > 0 ? (
          articles.map((article) => (
            <Card
              key={article.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.open(article.url, '_blank')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!ticker && (
                        <Badge variant="outline" className="text-xs">
                          {article.ticker}
                        </Badge>
                      )}
                      <Badge className={getSentimentColor(article.sentiment_label)}>
                        <span className="flex items-center gap-1">
                          {getSentimentIcon(article.sentiment_label)}
                          {article.sentiment_label}
                        </span>
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(article.sentiment_score * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <CardTitle className="text-lg leading-tight hover:text-blue-600 dark:hover:text-blue-400">
                      {article.title}
                    </CardTitle>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </CardHeader>

              <CardContent>
                {article.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {article.content}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(article.published_at)}
                    </span>
                    <span>{article.source}</span>
                    {article.author && <span>by {article.author}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {ticker
                ? `No news articles available for ${ticker}`
                : 'No news articles available'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
