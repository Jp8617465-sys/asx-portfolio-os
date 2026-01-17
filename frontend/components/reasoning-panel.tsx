'use client';

import React from 'react';
import { SignalReasoning, ShapValue } from '@/lib/types';
import { ArrowUp, ArrowDown, Info } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface ReasoningPanelProps {
  reasoning: SignalReasoning;
  isLoading?: boolean;
}

export default function ReasoningPanel({ reasoning, isLoading }: ReasoningPanelProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Signal Reasoning</h3>
      </div>

      {/* Model breakdown */}
      <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Model Contributions
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {reasoning.modelBreakdown.technicalScore}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Technical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {reasoning.modelBreakdown.fundamentalsScore}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fundamentals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {reasoning.modelBreakdown.sentimentScore}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sentiment</div>
          </div>
        </div>
      </div>

      {/* Top factors */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Top Factors Influencing This Signal
        </h4>
        <div className="space-y-3">
          {reasoning.topFactors.map((factor, index) => {
            const impactAbs = Math.abs(factor.impact);
            const isPositive = factor.impact > 0;
            const maxImpact = Math.max(...reasoning.topFactors.map((f) => Math.abs(f.impact)));
            const barWidth = (impactAbs / maxImpact) * 100;

            return (
              <div
                key={index}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              >
                {/* Factor header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isPositive ? (
                        <ArrowUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {factor.feature}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{factor.description}</p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {factor.impact.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {typeof factor.value === 'number' ? factor.value.toFixed(2) : factor.value}
                    </div>
                  </div>
                </div>

                {/* Impact bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: isPositive
                        ? designTokens.colors.chart.bullish
                        : designTokens.colors.chart.bearish,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Impact scores show how much each factor influenced the AI&apos;s decision. Positive values
          support the signal direction, while negative values work against it. Values are derived
          from SHAP (SHapley Additive exPlanations) analysis.
        </p>
      </div>
    </div>
  );
}
