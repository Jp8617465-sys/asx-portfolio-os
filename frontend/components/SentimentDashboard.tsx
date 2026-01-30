'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from './ui/badge';
import SignalBadge from './signal-badge';

interface ModelCSignal {
  symbol: string;
  signal: string;
  confidence: number;
  sentiment_score: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  avg_relevance: number;
  event_types: string[];
}

interface SentimentSummary {
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  distribution_pct: {
    positive: number;
    negative: number;
    neutral: number;
  };
  top_movers: ModelCSignal[];
  period_days: number;
}

export default function SentimentDashboard() {
  const [signals, setSignals] = useState<ModelCSignal[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSentimentData();
  }, []);

  const loadSentimentData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [signalsResponse, summaryResponse] = await Promise.all([
        api.getModelCSignals({ limit: 50 }),
        api.get('/api/sentiment/summary', { params: { days: 7 } }),
      ]);

      setSignals(signalsResponse.data.signals || []);
      setSummary(summaryResponse.data);
    } catch (err) {
      console.error('Failed to load sentiment data:', err);
      setError('Failed to load sentiment analysis data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return '#10b981'; // green
    if (score < -0.3) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const getSentimentBadgeColor = (label: string) => {
    if (label === 'positive') return 'bg-green-500';
    if (label === 'negative') return 'bg-red-500';
    return 'bg-gray-500';
  };

  // Prepare pie chart data
  const pieData = summary
    ? [
        { name: 'Positive', value: summary.distribution.positive, color: '#10b981' },
        { name: 'Neutral', value: summary.distribution.neutral, color: '#6b7280' },
        { name: 'Negative', value: summary.distribution.negative, color: '#ef4444' },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading sentiment analysis...</div>
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
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Signals
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{signals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Bullish Sentiment
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.distribution_pct.positive.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Bearish Sentiment
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.distribution_pct.negative.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              BUY Signals
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {signals.filter((s) => s.signal === 'BUY').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution (Last 7 Days)</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Based on{' '}
              {summary
                ? summary.distribution.positive +
                  summary.distribution.negative +
                  summary.distribution.neutral
                : 0}{' '}
              announcements
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Sentiment Movers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sentiment Movers</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Stocks with strongest sentiment signals
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.top_movers.slice(0, 8).map((signal) => (
                <div
                  key={signal.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => (window.location.href = `/stock/${signal.symbol}`)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {signal.symbol}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {signal.bullish_count} bullish, {signal.bearish_count} bearish
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: getSentimentColor(signal.sentiment_score) }}
                      >
                        {signal.sentiment_score.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(signal.confidence * 100).toFixed(0)}% conf.
                      </div>
                    </div>
                    <SignalBadge signal={signal.signal as any} size="sm" showIcon={false} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Sentiment Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sentiment Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Symbol
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Signal
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Sentiment Score
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Confidence
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Bullish
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Bearish
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Event Types
                  </th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr
                    key={signal.symbol}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => (window.location.href = `/stock/${signal.symbol}`)}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {signal.symbol}
                    </td>
                    <td className="py-3 px-4">
                      <SignalBadge signal={signal.signal as any} size="sm" showIcon={false} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: getSentimentColor(signal.sentiment_score) }}
                      >
                        {signal.sentiment_score.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {(signal.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-green-600">
                      {signal.bullish_count}
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-red-600">
                      {signal.bearish_count}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {signal.event_types.slice(0, 3).map((type, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {signal.event_types.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{signal.event_types.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {signals.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No sentiment signals available yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
