'use client';

import React from 'react';
import { AccuracyMetric, SignalType } from '@/lib/types';
import { designTokens } from '@/lib/design-tokens';
import { CheckCircle, XCircle, Target } from 'lucide-react';

interface AccuracyDisplayProps {
  accuracy: AccuracyMetric;
  showBreakdown?: boolean;
}

const getSignalColor = (signal: SignalType): string => {
  const { signals } = designTokens.colors;
  switch (signal) {
    case 'STRONG_BUY':
      return signals.strongBuy;
    case 'BUY':
      return signals.buy;
    case 'HOLD':
      return signals.hold;
    case 'SELL':
      return signals.sell;
    case 'STRONG_SELL':
      return signals.strongSell;
  }
};

export default function AccuracyDisplay({ accuracy, showBreakdown = true }: AccuracyDisplayProps) {
  const overallAccuracy = accuracy.accuracyRate;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Accuracy</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Target className="h-4 w-4" />
          <span>{accuracy.ticker}</span>
        </div>
      </div>

      {/* Overall accuracy gauge */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Accuracy
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {overallAccuracy.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallAccuracy}%`,
              backgroundColor:
                overallAccuracy >= 70
                  ? designTokens.colors.chart.bullish
                  : overallAccuracy >= 50
                    ? designTokens.colors.signals.hold
                    : designTokens.colors.chart.bearish,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>{accuracy.correctPredictions} correct</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>{accuracy.totalPredictions - accuracy.correctPredictions} incorrect</span>
          </div>
        </div>
      </div>

      {/* Signal breakdown */}
      {showBreakdown && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Accuracy by Signal Type
          </h4>
          {Object.entries(accuracy.bySignal).map(([signal, stats]) => {
            const signalType = signal as SignalType;
            const signalAccuracy = stats.accuracy;
            const signalColor = getSignalColor(signalType);

            return (
              <div key={signal} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: signalColor }}>
                    {signal.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {signalAccuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${signalAccuracy}%`,
                      backgroundColor: signalColor,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {stats.correct} / {stats.total} predictions
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confidence note */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Historical accuracy is calculated based on past predictions and actual price movements.
          Past performance does not guarantee future results. Higher confidence signals tend to have
          better accuracy rates.
        </p>
      </div>
    </div>
  );
}
