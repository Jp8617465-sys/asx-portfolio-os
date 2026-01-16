'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { notify } from '@/lib/stores/notification-store';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Bookmark,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AlertPreferences {
  // Notification channels
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;

  // Alert types
  signalChanges: boolean;
  highConfidenceSignals: boolean;
  priceMovements: boolean;
  watchlistUpdates: boolean;
  portfolioRebalancing: boolean;

  // Daily digest
  dailyDigestEnabled: boolean;
  digestTime: string;
  includeTopSignals: boolean;
  includePortfolioSummary: boolean;

  // Thresholds
  confidenceThreshold: number;
  priceMovementThreshold: number;
}

export default function AlertsPage() {
  const [preferences, setPreferences] = useState<AlertPreferences>({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    signalChanges: true,
    highConfidenceSignals: true,
    priceMovements: false,
    watchlistUpdates: true,
    portfolioRebalancing: true,
    dailyDigestEnabled: true,
    digestTime: '08:00',
    includeTopSignals: true,
    includePortfolioSummary: true,
    confidenceThreshold: 80,
    priceMovementThreshold: 5,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/alerts/preferences');
      setPreferences(response.data.data);
    } catch (err: any) {
      // If preferences don't exist, use defaults
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load preferences');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await api.put('/alerts/preferences', preferences);
      notify.success('Preferences saved', 'Your alert preferences have been updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save preferences');
      notify.error('Save failed', err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof AlertPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChange = (key: keyof AlertPreferences, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Alert Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customize how and when you receive notifications
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Channels */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose how you want to receive alerts
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={() => handleToggle('emailEnabled')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Email notifications
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Receive alerts via email
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={() => handleToggle('pushEnabled')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Push notifications (browser)
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Get real-time browser notifications
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer opacity-60">
              <input
                type="checkbox"
                checked={preferences.smsEnabled}
                onChange={() => handleToggle('smsEnabled')}
                disabled
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    SMS notifications
                  </span>
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                    Premium
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Receive critical alerts via SMS (coming soon)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Alert Types */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alert Types
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Select which events trigger notifications
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.signalChanges}
                onChange={() => handleToggle('signalChanges')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Signal changes
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Alert when a signal changes (e.g., BUY → SELL)
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.highConfidenceSignals}
                onChange={() => handleToggle('highConfidenceSignals')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    High confidence signals
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Alert for signals with confidence ≥ {preferences.confidenceThreshold}%
                </p>
                {preferences.highConfidenceSignals && (
                  <div className="mt-3">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Confidence threshold: {preferences.confidenceThreshold}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={preferences.confidenceThreshold}
                      onChange={(e) => handleChange('confidenceThreshold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.priceMovements}
                onChange={() => handleToggle('priceMovements')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Price movements
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Alert for significant price changes ≥ ±{preferences.priceMovementThreshold}%
                </p>
                {preferences.priceMovements && (
                  <div className="mt-3">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Price change threshold: ±{preferences.priceMovementThreshold}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={preferences.priceMovementThreshold}
                      onChange={(e) => handleChange('priceMovementThreshold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.watchlistUpdates}
                onChange={() => handleToggle('watchlistUpdates')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Watchlist updates
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Alert when watchlist stocks have signal changes
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.portfolioRebalancing}
                onChange={() => handleToggle('portfolioRebalancing')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Portfolio rebalancing suggestions
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Alert when new rebalancing opportunities are detected
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Daily Digest */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Daily Digest
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Receive a daily summary of portfolio performance and top signals
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dailyDigestEnabled}
                onChange={() => handleToggle('dailyDigestEnabled')}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  Enable daily summary email
                </span>
              </div>
            </label>

            {preferences.dailyDigestEnabled && (
              <div className="pl-7 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Delivery time
                  </label>
                  <input
                    type="time"
                    value={preferences.digestTime}
                    onChange={(e) => handleChange('digestTime', e.target.value)}
                    className="mt-2 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Include in digest
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.includeTopSignals}
                        onChange={() => handleToggle('includeTopSignals')}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Top signals and opportunities
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.includePortfolioSummary}
                        onChange={() => handleToggle('includePortfolioSummary')}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Portfolio performance summary
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={loadPreferences}
            disabled={isSaving}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
                     disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
