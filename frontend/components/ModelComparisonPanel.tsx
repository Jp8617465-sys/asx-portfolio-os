'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SignalBadge from '@/components/signal-badge';
import ConfidenceGauge from '@/components/confidence-gauge';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { SignalType } from '@/lib/types';
import { CheckCircle2, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';

interface ModelComparison {
  model_a: {
    signal: SignalType;
    confidence: number;
  };
  model_b: {
    signal: SignalType;
    quality: string;
  };
  ensemble: {
    signal: SignalType;
    confidence: number;
  };
  signals_agree: boolean;
  conflict: boolean;
}

interface ModelComparisonPanelProps {
  ticker: string;
}

export default function ModelComparisonPanel({ ticker }: ModelComparisonPanelProps) {
  const [comparison, setComparison] = useState<ModelComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [ticker]);

  const loadComparison = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getSignalComparison(ticker);
      setComparison(response.data);
    } catch (err) {
      console.error('Failed to load model comparison:', err);
      setError('Comparison data unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !comparison) {
    return null;
  }

  const getQualityColor = (quality: string) => {
    const colorMap: Record<string, string> = {
      A: 'text-green-600 dark:text-green-400',
      B: 'text-lime-600 dark:text-lime-400',
      C: 'text-yellow-600 dark:text-yellow-400',
      D: 'text-orange-600 dark:text-orange-400',
      F: 'text-red-600 dark:text-red-400',
    };
    return colorMap[quality] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Agreement/Conflict Banner */}
      {comparison.signals_agree && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Models Agree</span>
            <span className="text-sm text-green-600 dark:text-green-400">
              Both technical and fundamental analysis support this signal
            </span>
          </div>
        </div>
      )}

      {comparison.conflict && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Model Conflict Detected</span>
            <span className="text-sm text-yellow-600 dark:text-yellow-400">
              Technical and fundamental signals disagree - review carefully
            </span>
          </div>
        </div>
      )}

      {/* Model Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Model A - Momentum/Technical */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg">Model A</CardTitle>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Technical Analysis</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center">
              <SignalBadge
                signal={comparison.model_a.signal as SignalType}
                confidence={comparison.model_a.confidence}
                size="lg"
              />
            </div>
            <div className="flex items-center justify-center">
              <ConfidenceGauge
                confidence={comparison.model_a.confidence}
                signal={comparison.model_a.signal as SignalType}
                size="sm"
              />
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {(comparison.model_a.confidence * 100).toFixed(0)}% Confidence
            </div>
          </CardContent>
        </Card>

        {/* Model B - Fundamentals */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-lg">Model B</CardTitle>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fundamental Analysis</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center">
              <SignalBadge signal={comparison.model_b.signal} confidence={75} size="lg" />
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Quality Score</div>
              <div className={`text-4xl font-bold ${getQualityColor(comparison.model_b.quality)}`}>
                {comparison.model_b.quality}
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              Based on financial metrics
            </div>
          </CardContent>
        </Card>

        {/* Ensemble - Combined */}
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 text-green-600 dark:text-green-400 font-bold">∑</div>
              <CardTitle className="text-lg">Ensemble</CardTitle>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Combined Recommendation</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center">
              <SignalBadge
                signal={comparison.ensemble.signal}
                confidence={comparison.ensemble.confidence}
                size="lg"
              />
            </div>
            <div className="flex items-center justify-center">
              <ConfidenceGauge
                confidence={comparison.ensemble.confidence}
                signal={comparison.ensemble.signal}
                size="sm"
              />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {(comparison.ensemble.confidence * 100).toFixed(0)}% Confidence
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                60% Technical + 40% Fundamental
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Explanation Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
          How the Ensemble Works
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>
            • <strong>Model A</strong> analyzes price momentum, volume trends, and technical
            indicators
          </li>
          <li>
            • <strong>Model B</strong> evaluates financial health, profitability, and valuation
            metrics
          </li>
          <li>
            • <strong>Ensemble</strong> combines both models with 60% weight on technical, 40% on
            fundamentals
          </li>
          <li>
            •{' '}
            {comparison.signals_agree
              ? 'When models agree, the signal is more reliable'
              : 'When models conflict, additional research is recommended'}
          </li>
        </ul>
      </div>
    </div>
  );
}
