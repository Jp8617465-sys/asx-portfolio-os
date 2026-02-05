'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { getModelBSignals } from '@/features/signals/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts';
import SignalBadge from './signal-badge';

interface ModelBSignal {
  symbol: string;
  signal: string;
  confidence: number;
  quality_grade: string;
  quality_score: number;
  pe_ratio: number;
  roe: number;
  debt_to_equity: number;
  net_margin: number;
  as_of: string;
}

interface QualityDistribution {
  grade: string;
  count: number;
  percentage: number;
}

export default function ModelBDashboard() {
  const [signals, setSignals] = useState<ModelBSignal[]>([]);
  const [qualityDistribution, setQualityDistribution] = useState<QualityDistribution[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModelBData();
  }, []);

  const loadModelBData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getModelBSignals({ limit: 100 });
      const signalsData = response.data.signals || [];

      setSignals(signalsData);
      calculateQualityDistribution(signalsData);
    } catch (err) {
      console.error('Failed to load Model B data:', err);
      setError('Failed to load fundamental analysis data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateQualityDistribution = (signalsData: ModelBSignal[]) => {
    const distribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    signalsData.forEach((signal) => {
      const grade = signal.quality_grade || 'F';
      distribution[grade] = (distribution[grade] || 0) + 1;
    });

    const total = signalsData.length || 1;
    const distArray: QualityDistribution[] = Object.entries(distribution).map(([grade, count]) => ({
      grade,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    setQualityDistribution(distArray);
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: '#10b981', // green
      B: '#3b82f6', // blue
      C: '#f59e0b', // yellow
      D: '#f97316', // orange
      F: '#ef4444', // red
    };
    return colors[grade] || '#6b7280';
  };

  const filteredSignals =
    selectedGrade === 'ALL' ? signals : signals.filter((s) => s.quality_grade === selectedGrade);

  const topQualityStocks = signals
    .filter((s) => ['A', 'B'].includes(s.quality_grade))
    .sort((a, b) => b.quality_score - a.quality_score)
    .slice(0, 10);

  // Prepare scatter plot data (P/E vs ROE)
  const scatterData = filteredSignals
    .filter((s) => s.pe_ratio > 0 && s.pe_ratio < 50 && s.roe !== null) // Filter outliers
    .map((s) => ({
      symbol: s.symbol,
      pe: s.pe_ratio,
      roe: s.roe * 100, // Convert to percentage
      grade: s.quality_grade,
      signal: s.signal,
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading fundamental analysis...</div>
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
              Total Analyzed
            </CardTitle>
            <Shield className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{signals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Grade A Stocks
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {qualityDistribution.find((d) => d.grade === 'A')?.count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              High Quality (A/B)
            </CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {signals.filter((s) => ['A', 'B'].includes(s.quality_grade)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Quality Score
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {signals.length > 0
                ? Math.round(signals.reduce((sum, s) => sum + s.quality_score, 0) / signals.length)
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={qualityDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="grade" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.375rem',
                }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {qualityDistribution.map((entry, index) => (
                  <Bar key={index} dataKey="count" fill={getGradeColor(entry.grade)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* P/E vs ROE Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Analysis: P/E Ratio vs ROE</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Look for stocks in the bottom-right quadrant (low P/E, high ROE) for value opportunities
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                dataKey="pe"
                name="P/E Ratio"
                stroke="#9ca3af"
                label={{ value: 'P/E Ratio', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                type="number"
                dataKey="roe"
                name="ROE %"
                stroke="#9ca3af"
                label={{ value: 'ROE %', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis range={[100, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.375rem',
                }}
                labelStyle={{ color: '#f9fafb' }}
                formatter={(value: any, name: string) => {
                  if (name === 'roe') return [`${value.toFixed(2)}%`, 'ROE'];
                  if (name === 'pe') return [value.toFixed(2), 'P/E'];
                  return [value, name];
                }}
              />
              <Legend />
              <Scatter
                name="Grade A"
                data={scatterData.filter((d) => d.grade === 'A')}
                fill="#10b981"
              />
              <Scatter
                name="Grade B"
                data={scatterData.filter((d) => d.grade === 'B')}
                fill="#3b82f6"
              />
              <Scatter
                name="Grade C"
                data={scatterData.filter((d) => d.grade === 'C')}
                fill="#f59e0b"
              />
              <Scatter
                name="Other"
                data={scatterData.filter((d) => !['A', 'B', 'C'].includes(d.grade))}
                fill="#6b7280"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Quality Stocks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Quality Stocks (Grade A/B)</CardTitle>
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
                    Grade
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Signal
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    P/E
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ROE %
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Net Margin %
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Quality Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {topQualityStocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => (window.location.href = `/stock/${stock.symbol}`)}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {stock.symbol}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: getGradeColor(stock.quality_grade) + '20',
                          color: getGradeColor(stock.quality_grade),
                        }}
                      >
                        {stock.quality_grade}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <SignalBadge signal={stock.signal as any} size="sm" showIcon={false} />
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {stock.pe_ratio ? stock.pe_ratio.toFixed(2) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {stock.roe ? (stock.roe * 100).toFixed(2) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {stock.net_margin ? (stock.net_margin * 100).toFixed(2) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {stock.quality_score.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topQualityStocks.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No high-quality stocks (Grade A/B) found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
