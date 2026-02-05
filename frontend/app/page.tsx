'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StockSearch from '@/components/stock-search';
import { SignalBadge } from '@/features/signals';
import { TrendingUp, Target, BarChart3, Zap, Shield, Clock } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

const features = [
  {
    icon: TrendingUp,
    title: 'AI-Powered Signals',
    description:
      'Get daily buy/sell/hold signals powered by machine learning models trained on years of ASX data.',
  },
  {
    icon: Target,
    title: 'Transparent Accuracy',
    description:
      'See exactly how our models have performed historically. Track prediction accuracy over time.',
  },
  {
    icon: BarChart3,
    title: 'Explainable AI',
    description:
      'Understand why the AI made each recommendation with SHAP-based reasoning and factor analysis.',
  },
  {
    icon: Zap,
    title: 'Daily Updates',
    description:
      'Signals updated daily based on latest market data using momentum and technical indicators.',
  },
  {
    icon: Shield,
    title: 'Portfolio Optimization',
    description:
      'Get AI-driven rebalancing suggestions to optimize your holdings based on current signals.',
  },
  {
    icon: Clock,
    title: 'Watchlist Tracking',
    description:
      'Monitor your favorite stocks and receive alerts when signals change or confidence shifts.',
  },
];

const sampleSignals = [
  { ticker: 'CBA.AX', company: 'Commonwealth Bank', signal: 'BUY' as const, confidence: 78 },
  { ticker: 'BHP.AX', company: 'BHP Group', signal: 'STRONG_BUY' as const, confidence: 85 },
  { ticker: 'WES.AX', company: 'Wesfarmers', signal: 'HOLD' as const, confidence: 62 },
];

export default function LandingPage() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center h-10 w-10 rounded-lg"
                style={{ backgroundColor: designTokens.colors.brand.primary }}
              >
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ASX Portfolio OS
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/app/dashboard"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/app/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: designTokens.colors.brand.primary }}
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Hero content */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              AI-Driven Portfolio
              <br />
              Management for{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ASX Investors
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12">
              Get daily buy/sell signals powered by machine learning. Track accuracy, understand
              reasoning, and optimize your Australian stock portfolio with AI.
            </p>

            {/* Search */}
            <div className="flex justify-center mb-8">
              <StockSearch
                placeholder="Search ASX stocks (e.g., CBA.AX, BHP.AX)..."
                autoFocus={false}
                onSelect={setSelectedTicker}
              />
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app/dashboard"
                className="px-8 py-3 rounded-lg text-base font-semibold text-white transition-all hover:scale-105"
                style={{ backgroundColor: designTokens.colors.brand.primary }}
              >
                Start Free Trial
              </Link>
              <Link
                href="#features"
                className="px-8 py-3 rounded-lg text-base font-semibold text-gray-700 dark:text-gray-300
                         bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Sample signals showcase */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
                Live AI Signals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sampleSignals.map((item) => (
                  <div
                    key={item.ticker}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {item.ticker}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {item.company}
                    </div>
                    <div className="flex items-center justify-between">
                      <SignalBadge signal={item.signal} size="sm" showIcon={true} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Make Smarter Investment Decisions
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powered by LightGBM machine learning models trained on momentum, volatility, and
              technical indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                           hover:shadow-lg transition-all"
                >
                  <div
                    className="inline-flex items-center justify-center h-12 w-12 rounded-lg mb-4"
                    style={{ backgroundColor: `${designTokens.colors.brand.primary}20` }}
                  >
                    <Icon
                      className="h-6 w-6"
                      style={{ color: designTokens.colors.brand.primary }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Optimize Your ASX Portfolio?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join early adopters and get daily AI-powered signals for free during our beta.
          </p>
          <Link
            href="/app/dashboard"
            className="inline-block px-8 py-3 rounded-lg text-base font-semibold
                     bg-white text-blue-600 hover:bg-gray-50 transition-all hover:scale-105"
          >
            Start Your Free Trial
          </Link>
          <p className="text-sm text-blue-100 mt-4">No credit card required • Free during beta</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">© 2026 ASX Portfolio OS. All rights reserved.</p>
            <p className="text-xs">
              Not financial advice. AI signals are for informational purposes only. Always conduct
              your own research before investing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
