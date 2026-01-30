'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from './ui/badge';

interface DriftSummary {
  latest_drift_score: number;
  drift_trend: string;
  features_drifting: number;
  total_features: number;
  last_audit_date: string;
  psi_threshold: number;
  alerts: Array<{
    feature_name: string;
    psi_score: number;
    status: string;
    message: string;
  }>;
}

interface FeatureDrift {
  feature_name: string;
  psi_score: number;
  status: string;
  baseline_mean?: number;
  current_mean?: number;
  percent_change?: number;
  last_calculated: string;
}

interface DriftHistory {
  date: string;
  feature_name: string;
  psi_score: number;
}

export default function DriftMonitoringDashboard() {
  const [summary, setSummary] = useState<DriftSummary | null>(null);
  const [features, setFeatures] = useState<FeatureDrift[]>([]);
  const [history, setHistory] = useState<DriftHistory[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDriftData();
  }, []);

  useEffect(() => {
    if (selectedFeature) {
      loadFeatureHistory(selectedFeature);
    }
  }, [selectedFeature]);

  const loadDriftData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [summaryResponse, featuresResponse] = await Promise.all([
        api.getDriftSummary(),
        api.getFeatureDrift(),
      ]);

      setSummary(summaryResponse.data);
      setFeatures(featuresResponse.data.features || []);

      // Auto-select first drifting feature for history chart
      const driftingFeature = (featuresResponse.data.features || []).find(
        (f: FeatureDrift) => f.status === 'DRIFT'
      );
      if (driftingFeature) {
        setSelectedFeature(driftingFeature.feature_name);
      }
    } catch (err) {
      console.error('Failed to load drift data:', err);
      setError('Failed to load drift monitoring data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeatureHistory = async (featureName: string) => {
    try {
      const response = await api.getDriftHistory({ feature_name: featureName, days: 90 });
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Failed to load drift history:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRIFT':
        return 'bg-red-500';
      case 'WARNING':
        return 'bg-yellow-500';
      case 'STABLE':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRIFT':
        return <AlertCircle className="h-4 w-4" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const shouldRetrain = summary && summary.latest_drift_score > 0.2;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading drift monitoring data...</div>
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
      {/* Retraining Recommendation Banner */}
      {shouldRetrain && (
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                Model Retraining Recommended
              </h3>
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                Significant drift detected (PSI: {summary?.latest_drift_score.toFixed(3)}). Consider
                retraining the model to maintain prediction accuracy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Latest PSI Score
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary?.latest_drift_score.toFixed(3) || 'N/A'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Threshold: {summary?.psi_threshold || 0.2}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Drift Trend
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary?.drift_trend || 'Stable'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Last audit: {summary?.last_audit_date || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Features Drifting
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.features_drifting || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              of {summary?.total_features || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.alerts?.length || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              PSI &gt; {summary?.psi_threshold || 0.2}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PSI Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>PSI Timeline (Last 90 Days)</CardTitle>
            {selectedFeature && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Feature: {selectedFeature}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any) => [value.toFixed(3), 'PSI Score']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="psi_score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="PSI Score"
                  />
                  {/* Threshold line */}
                  <Line
                    type="monotone"
                    dataKey={() => summary?.psi_threshold || 0.2}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    dot={false}
                    name="Threshold"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                {selectedFeature ? 'No history data available' : 'Select a feature to view history'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drift Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Drift Alerts</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Features requiring attention
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {summary?.alerts && summary.alerts.length > 0 ? (
                summary.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(alert.status)}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {alert.feature_name}
                        </span>
                      </div>
                      <Badge className={getStatusColor(alert.status)}>
                        PSI: {alert.psi_score.toFixed(3)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{alert.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No drift alerts. All features are stable.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Drift Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Drift Details</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Population Stability Index (PSI) for all monitored features
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Feature Name
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    PSI Score
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Baseline Mean
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Current Mean
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    % Change
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {features
                  .sort((a, b) => b.psi_score - a.psi_score)
                  .map((feature, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                        selectedFeature === feature.feature_name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedFeature(feature.feature_name)}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        {feature.feature_name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getStatusColor(feature.status)}>
                          {feature.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            feature.psi_score > 0.2
                              ? 'text-red-600'
                              : feature.psi_score > 0.1
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {feature.psi_score.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                        {feature.baseline_mean?.toFixed(4) || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                        {feature.current_mean?.toFixed(4) || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        <span
                          className={
                            feature.percent_change && Math.abs(feature.percent_change) > 10
                              ? 'text-red-600'
                              : 'text-gray-700 dark:text-gray-300'
                          }
                        >
                          {feature.percent_change
                            ? `${feature.percent_change > 0 ? '+' : ''}${feature.percent_change.toFixed(2)}%`
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(feature.last_calculated).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {features.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No feature drift data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
