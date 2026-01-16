'use client';

import React from 'react';
import { RiskMetrics } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface RiskMetricsDashboardProps {
  metrics: RiskMetrics;
}

export default function RiskMetricsDashboard({ metrics }: RiskMetricsDashboardProps) {
  // Sector allocation data (mock - would come from portfolio analysis)
  const sectorData = [
    { name: 'Financials', value: 35, color: '#3b82f6' },
    { name: 'Materials', value: 25, color: '#10b981' },
    { name: 'Healthcare', value: 15, color: '#8b5cf6' },
    { name: 'Energy', value: 12, color: '#f59e0b' },
    { name: 'Technology', value: 8, color: '#ef4444' },
    { name: 'Other', value: 5, color: '#6b7280' },
  ];

  // Helper to render metric card
  const renderMetricCard = (
    title: string,
    value: number | string,
    change?: number,
    icon: React.ReactNode,
    iconColor: string,
    suffix: string = '',
    isPercentage: boolean = false
  ) => {
    const displayValue = typeof value === 'number'
      ? isPercentage
        ? `${value.toFixed(2)}${suffix}`
        : value.toFixed(2)
      : value;

    const changeValue = change !== undefined ? change : 0;
    const isPositive = changeValue >= 0;
    const changeColor = isPositive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {displayValue}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {changeValue.toFixed(2)}
              {isPercentage ? '%' : ''} vs last month
            </span>
          </div>
        )}
      </div>
    );
  };

  // Determine Sharpe ratio quality
  const getSharpeRating = (sharpe: number) => {
    if (sharpe >= 2.0) return { text: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (sharpe >= 1.0) return { text: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (sharpe >= 0.5) return { text: 'Fair', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: 'Poor', color: 'text-red-600 dark:text-red-400' };
  };

  const sharpeRating = getSharpeRating(metrics.sharpeRatio);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Risk Metrics Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Portfolio risk analysis and diversification metrics
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard(
          'Sharpe Ratio',
          metrics.sharpeRatio,
          metrics.sharpeRatio - (metrics.sharpeRatio * 0.9), // Mock previous value
          <Target className="w-5 h-5" />,
          'text-blue-600',
          '',
          false
        )}
        {renderMetricCard(
          'Volatility',
          metrics.volatility * 100,
          (metrics.volatility * 100) - ((metrics.volatility * 100) * 1.05), // Mock previous value
          <Activity className="w-5 h-5" />,
          'text-purple-600',
          '%',
          true
        )}
        {renderMetricCard(
          'Beta',
          metrics.beta,
          metrics.beta - (metrics.beta * 0.95), // Mock previous value
          <TrendingUp className="w-5 h-5" />,
          'text-green-600',
          '',
          false
        )}
        {renderMetricCard(
          'Max Drawdown',
          Math.abs(metrics.maxDrawdown || 0) * 100,
          undefined,
          <AlertTriangle className="w-5 h-5" />,
          'text-red-600',
          '%',
          true
        )}
      </div>

      {/* Sharpe Ratio Interpretation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Risk-Adjusted Performance
        </h3>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Sharpe Ratio:
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.sharpeRatio.toFixed(2)}
              </span>
              <span className={`text-sm font-semibold ${sharpeRating.color}`}>
                ({sharpeRating.text})
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The Sharpe ratio measures risk-adjusted returns. Higher values indicate better returns per unit of risk taken.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Excellent</span> (≥2.0): Outstanding risk-adjusted returns
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Good</span> (1.0-2.0): Above-average performance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Fair</span> (0.5-1.0): Acceptable returns
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Poor</span> (&lt;0.5): Returns don't justify risk
                </span>
              </div>
            </div>
          </div>

          {/* Sharpe Ratio Gauge */}
          <div className="flex-shrink-0 relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={sharpeRating.color.includes('green') ? '#10b981' : sharpeRating.color.includes('blue') ? '#3b82f6' : sharpeRating.color.includes('yellow') ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${Math.min(metrics.sharpeRatio / 3, 1) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {metrics.sharpeRatio.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Allocation & Diversification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Allocation Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sector Allocation
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {sectorData.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{sector.name}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {sector.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Metrics Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Risk Summary
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Volatility</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(metrics.volatility * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${Math.min(metrics.volatility * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Annualized standard deviation of returns
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Beta</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.beta.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min(Math.abs(metrics.beta) * 50, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.beta > 1
                  ? 'More volatile than market'
                  : metrics.beta < 1
                  ? 'Less volatile than market'
                  : 'Moves with market'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {(Math.abs(metrics.maxDrawdown || 0) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${Math.min(Math.abs(metrics.maxDrawdown || 0) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Largest peak-to-trough decline
              </p>
            </div>

            {/* Diversification Score */}
            <div className="pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Diversification Score
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  7.2/10
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Well diversified across {sectorData.length} sectors with no single sector exceeding 35% allocation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Warnings */}
      {(metrics.volatility > 0.25 || Math.abs(metrics.maxDrawdown || 0) > 0.20) && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Risk Warning
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {metrics.volatility > 0.25 && (
                  <li>• High volatility detected ({(metrics.volatility * 100).toFixed(1)}%). Consider rebalancing to reduce risk.</li>
                )}
                {Math.abs(metrics.maxDrawdown || 0) > 0.20 && (
                  <li>• Significant drawdown risk ({(Math.abs(metrics.maxDrawdown || 0) * 100).toFixed(1)}%). Diversification may help.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
