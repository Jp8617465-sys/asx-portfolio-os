'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, DollarSign, Home, CreditCard, RefreshCw } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface FusionOverview {
  status: string;
  computed_at: string;
  summary: {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    debt_service_ratio: number;
    risk_score: number;
  };
  equities: {
    value: number;
    count: number;
    allocation_pct: number;
  };
  property: {
    value: number;
    count: number;
    allocation_pct: number;
  };
  loans: {
    balance: number;
    count: number;
    monthly_payment: number;
    allocation_pct: number;
  };
}

interface RiskData {
  status: string;
  computed_at: string;
  risk_score: number;
  risk_level: string;
  debt_service_ratio: number;
  leverage_ratio: number;
  metrics: {
    total_liabilities: number;
    net_worth: number;
    loan_allocation_pct: number;
    portfolio_volatility: number | null;
    max_drawdown: number | null;
  };
}

interface AllocationData {
  status: string;
  computed_at: string;
  total_assets: number;
  asset_classes: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export default function FusionDashboard() {
  const [overview, setOverview] = useState<FusionOverview | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [allocationData, setAllocationData] = useState<AllocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFusionData();
  }, []);

  const loadFusionData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [overviewRes, riskRes, allocationRes] = await Promise.all([
        api.getPortfolioFusion(),
        api.getPortfolioRisk(),
        api.getPortfolioAllocation(),
      ]);

      setOverview(overviewRes.data);
      setRiskData(riskRes.data);
      setAllocationData(allocationRes.data);
    } catch (err) {
      console.error('Failed to load fusion data:', err);
      setError('Failed to load portfolio fusion data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.refreshPortfolioFusion();
      await loadFusionData();
    } catch (err) {
      console.error('Failed to refresh fusion data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Prepare pie chart data
  const pieData = allocationData
    ? allocationData.asset_classes
        .filter((ac) => ac.value > 0)
        .map((ac) => ({
          name: ac.name,
          value: ac.value,
          percentage: ac.percentage,
        }))
    : [];

  const COLORS = {
    Equities: '#3b82f6',
    Property: '#10b981',
    'Loans (Liabilities)': '#ef4444',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading portfolio fusion data...</div>
      </div>
    );
  }

  if (error || overview?.status === 'no_data') {
    return (
      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">No Portfolio Fusion Data Available</p>
            <p className="text-sm mt-1">
              Run the portfolio fusion job to generate multi-asset portfolio metrics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated:{' '}
            {overview?.computed_at ? new Date(overview.computed_at).toLocaleString() : 'N/A'}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Net Worth
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(overview?.summary.net_worth || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Assets - Liabilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Assets
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(overview?.summary.total_assets || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Equities + Property</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Liabilities
            </CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(overview?.summary.total_liabilities || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Loan balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Risk Level
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getRiskColor(riskData?.risk_level || 'medium')}>
                {riskData?.risk_level?.toUpperCase() || 'N/A'}
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Score: {riskData?.risk_score?.toFixed(0) || 'N/A'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              DSR: {((riskData?.debt_service_ratio || 0) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Portfolio composition by asset class
            </p>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                No allocation data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Portfolio risk analysis</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Debt Service Ratio</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {((riskData?.debt_service_ratio || 0) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Leverage Ratio</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(riskData?.leverage_ratio || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Loan Allocation</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(riskData?.metrics.loan_allocation_pct || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Portfolio Volatility
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {riskData?.metrics.portfolio_volatility
                    ? `${(riskData.metrics.portfolio_volatility * 100).toFixed(2)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {riskData?.metrics.max_drawdown
                    ? `${(riskData.metrics.max_drawdown * 100).toFixed(2)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Class Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Equities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Equities</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(overview?.equities.value || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Holdings Count</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {overview?.equities.count || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Allocation</p>
                <p className="text-lg font-semibold text-blue-600">
                  {(overview?.equities.allocation_pct || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Property</CardTitle>
            <Home className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(overview?.property.value || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Properties Count</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {overview?.property.count || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Allocation</p>
                <p className="text-lg font-semibold text-green-600">
                  {(overview?.property.allocation_pct || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Loans</CardTitle>
            <CreditCard className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Balance</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(overview?.loans.balance || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Payment</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(overview?.loans.monthly_payment || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loan Count</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {overview?.loans.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
