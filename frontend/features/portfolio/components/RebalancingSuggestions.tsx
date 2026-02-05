'use client';

import React, { useState } from 'react';
import { Portfolio, RebalancingSuggestion } from '@/contracts';
import { SignalBadge } from '@/features/signals';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface RebalancingSuggestionsProps {
  portfolio: Portfolio;
  suggestions?: RebalancingSuggestion[];
  isLoading?: boolean;
  onApply?: (suggestionId: string) => void;
  onApplyAll?: () => void;
}

export default function RebalancingSuggestions({
  portfolio,
  suggestions = [],
  isLoading = false,
  onApply,
  onApplyAll,
}: RebalancingSuggestionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Portfolio is Well Balanced
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No rebalancing suggestions at this time. Your portfolio aligns well with current AI
          signals.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Rebalancing Suggestions
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Based on current signals and risk tolerance
          </p>
        </div>
        {suggestions.length > 0 && onApplyAll && (
          <button
            onClick={onApplyAll}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply All Suggestions
          </button>
        )}
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((suggestion) => {
          const isExpanded = expandedId === suggestion.id;
          const actionColor =
            suggestion.action === 'BUY'
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
              : suggestion.action === 'SELL'
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
                : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950';

          const priorityColor =
            suggestion.priority === 'high'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : suggestion.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';

          return (
            <div
              key={suggestion.id}
              className="border dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Main Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Action and Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Action Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${actionColor}`}
                      >
                        {suggestion.action} {suggestion.quantity}
                      </span>
                      {/* Priority Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${priorityColor}`}
                      >
                        {suggestion.priority}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {suggestion.ticker} - {suggestion.companyName}
                    </h3>

                    <div className="flex items-center gap-4 mb-3">
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Current Signal:
                        </span>
                        <SignalBadge signal={suggestion.currentSignal} size="sm" showIcon={false} />
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Confidence:
                        </span>
                        <span className="ml-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {suggestion.currentConfidence}%
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      <span className="font-medium">Reason:</span> {suggestion.reason}
                    </p>

                    {/* Impact Summary */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 dark:text-gray-400">Impact:</span>
                        <span
                          className={`font-semibold ${
                            suggestion.impact.expectedReturn > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {suggestion.impact.expectedReturn > 0 ? '+' : ''}
                          {suggestion.impact.expectedReturn.toFixed(1)}% return
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold ${
                            suggestion.impact.volatilityChange > 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {suggestion.impact.volatilityChange > 0 ? '+' : ''}
                          {suggestion.impact.volatilityChange.toFixed(1)}% volatility
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleExpand(suggestion.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="View Details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    {onApply && (
                      <button
                        onClick={() => onApply(suggestion.id)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Detailed Impact Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Expected Return
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          suggestion.impact.expectedReturn > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {suggestion.impact.expectedReturn > 0 ? '+' : ''}
                        {suggestion.impact.expectedReturn.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Volatility Change
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          suggestion.impact.volatilityChange > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {suggestion.impact.volatilityChange > 0 ? '+' : ''}
                        {suggestion.impact.volatilityChange.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        New Allocation
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {suggestion.impact.newAllocation.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-medium mb-1">Investment Consideration</p>
                        <p className="text-blue-700 dark:text-blue-300">
                          {suggestion.action === 'BUY'
                            ? `This suggestion recommends purchasing ${suggestion.quantity} additional shares. Ensure you have sufficient capital and that this aligns with your risk tolerance.`
                            : `This suggestion recommends selling ${suggestion.quantity} shares to reduce exposure. Consider tax implications before proceeding.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} generated
          </span>
          <span className="text-gray-500 dark:text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
