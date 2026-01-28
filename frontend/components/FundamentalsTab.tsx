'use client';

import useSWR from 'swr';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { getFundamentalsMetrics, getFundamentalsQuality } from '../lib/api';
import type { FundamentalsMetrics, FundamentalsQuality } from '../lib/api';

type FundamentalsTabProps = {
  ticker: string;
};

function getQualityColor(score?: string) {
  switch (score) {
    case 'A':
      return 'bg-green-600 text-white';
    case 'B':
      return 'bg-green-500 text-white';
    case 'C':
      return 'bg-yellow-500 text-white';
    case 'D':
      return 'bg-orange-500 text-white';
    case 'F':
      return 'bg-red-600 text-white';
    default:
      return 'bg-slate-400 text-white';
  }
}

function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return 'n/a';
  return value.toFixed(decimals);
}

function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return 'n/a';
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'n/a';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export default function FundamentalsTab({ ticker }: FundamentalsTabProps) {
  const { data: metrics, isLoading: metricsLoading } = useSWR<FundamentalsMetrics>(
    `fundamentals-metrics-${ticker}`,
    () => getFundamentalsMetrics(ticker)
  );

  const { data: quality, isLoading: qualityLoading } = useSWR<FundamentalsQuality>(
    `fundamentals-quality-${ticker}`,
    () => getFundamentalsQuality(ticker),
    {
      // Don't fail the whole tab if quality is not available
      onError: () => {},
    }
  );

  return (
    <div className="space-y-6">
      {/* Quality Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Model B Quality Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          {qualityLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : quality ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`text-2xl px-4 py-2 ${getQualityColor(quality.quality?.score)}`}>
                  {quality.quality?.score || 'n/a'}
                </Badge>
                <div>
                  <p className="font-semibold text-lg">
                    {quality.quality?.grade_description || 'Unknown'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Confidence: {formatPercent(quality.quality?.confidence)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <span className="text-slate-500">Signal:</span>
                  <span className="ml-2 font-semibold">{quality.signal || 'n/a'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Expected Return:</span>
                  <span className="ml-2 font-semibold">
                    {formatPercent(quality.expected_return)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Rank:</span>
                  <span className="ml-2 font-semibold">{quality.rank || 'n/a'}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Quality score not available. Run generate_signals_model_b.py to generate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fundamental Metrics */}
      {metricsLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <>
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <span className="text-slate-500">Sector:</span>
                  <span className="ml-2 font-semibold">{metrics.sector || 'n/a'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Industry:</span>
                  <span className="ml-2 font-semibold">{metrics.industry || 'n/a'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Last Updated:</span>
                  <span className="ml-2 font-mono text-xs">
                    {metrics.updated_at ? new Date(metrics.updated_at).toLocaleDateString() : 'n/a'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Period End:</span>
                  <span className="ml-2 font-mono text-xs">{metrics.period_end || 'n/a'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Valuation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Valuation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">P/E Ratio</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.metrics?.valuation?.pe_ratio)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">P/B Ratio</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.metrics?.valuation?.pb_ratio)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Market Cap</span>
                  <span className="font-semibold">
                    {formatLargeNumber(metrics.metrics?.valuation?.market_cap)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Profitability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profitability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ROE</span>
                  <span className="font-semibold">
                    {formatPercent(metrics.metrics?.profitability?.roe)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Profit Margin</span>
                  <span className="font-semibold">
                    {formatPercent(metrics.metrics?.profitability?.profit_margin)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">EPS</span>
                  <span className="font-semibold">
                    ${formatNumber(metrics.metrics?.profitability?.eps)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Growth</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Revenue Growth YoY</span>
                  <span className="font-semibold">
                    {formatPercent(metrics.metrics?.growth?.revenue_growth_yoy)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">EPS Growth</span>
                  <span className="font-semibold">
                    {formatPercent(metrics.metrics?.growth?.eps_growth)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Debt/Equity</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.metrics?.financial_health?.debt_to_equity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Ratio</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.metrics?.financial_health?.current_ratio)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quick Ratio</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.metrics?.financial_health?.quick_ratio)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Free Cash Flow</span>
                  <span className="font-semibold">
                    {formatLargeNumber(metrics.metrics?.financial_health?.free_cash_flow)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Income */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Income & Dividends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dividend Yield</span>
                  <span className="font-semibold">
                    {formatPercent(metrics.metrics?.income?.div_yield)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No fundamental data available for {ticker}. Run load_fundamentals_pipeline.py to fetch.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
