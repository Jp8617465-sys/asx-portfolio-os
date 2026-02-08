'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  Shield,
  Brain,
  ArrowRight,
  ChevronRight,
  Activity,
  LineChart,
  Layers,
  Lock,
} from 'lucide-react';
import { SignalBadge } from '@/features/signals';

/* ---------- DATA ---------- */

const sampleSignals = [
  {
    ticker: 'BHP.AX',
    company: 'BHP Group',
    signal: 'STRONG_BUY' as const,
    confidence: 87,
    expected: '+4.2%',
    rank: 1,
  },
  {
    ticker: 'CBA.AX',
    company: 'Commonwealth Bank',
    signal: 'BUY' as const,
    confidence: 78,
    expected: '+2.8%',
    rank: 2,
  },
  {
    ticker: 'CSL.AX',
    company: 'CSL Limited',
    signal: 'BUY' as const,
    confidence: 74,
    expected: '+2.1%',
    rank: 3,
  },
  {
    ticker: 'WES.AX',
    company: 'Wesfarmers',
    signal: 'HOLD' as const,
    confidence: 55,
    expected: '+0.4%',
    rank: 5,
  },
  {
    ticker: 'TLS.AX',
    company: 'Telstra Group',
    signal: 'SELL' as const,
    confidence: 68,
    expected: '-1.8%',
    rank: 8,
  },
];

const features = [
  {
    icon: Brain,
    title: 'LightGBM Ensemble',
    description:
      'Walk-forward validated momentum model trained on years of ASX price data. Not a black box.',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Target,
    title: 'SHAP Explainability',
    description:
      'See exactly which features drove each signal — momentum, volatility, volume, trend.',
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Live Signal Ranking',
    description: 'Every ASX stock ranked daily by expected return with confidence scores.',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Shield,
    title: 'Portfolio Risk Analysis',
    description:
      'Upload your holdings. Get Sharpe ratio, max drawdown, concentration risk, and rebalancing suggestions.',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    icon: Layers,
    title: 'Multi-Model Fusion',
    description:
      'Technical, fundamental, and sentiment models combined with configurable ensemble weights.',
    accent: 'from-rose-500 to-pink-500',
  },
  {
    icon: Activity,
    title: 'Drift Monitoring',
    description:
      'Continuous model health checks. Get alerted when feature distributions shift beyond thresholds.',
    accent: 'from-sky-500 to-indigo-500',
  },
];

const stats = [
  { label: 'ASX Stocks Tracked', value: '200+' },
  { label: 'Daily Signal Updates', value: '24h' },
  { label: 'Model Features', value: '15+' },
  { label: 'Walk-Forward Splits', value: '5' },
];

/* ---------- COMPONENT ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* ==================== NAV ==================== */}
      <nav className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-indigo-600 dark:text-indigo-400">ASX</span> Portfolio OS
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/wireframes"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Wireframes
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/app/dashboard"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-hero-glow dark:bg-hero-glow-dark" />
          <div className="absolute inset-0 bg-grid-pattern bg-grid-40 opacity-40 dark:opacity-20" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Models updated daily at market close
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
              <span className="text-slate-900 dark:text-white">AI-powered signals</span>
              <br />
              <span className="text-slate-900 dark:text-white">for the </span>
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 bg-clip-text text-transparent">
                ASX market
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Machine learning models that rank every ASX stock daily by momentum, volatility, and
              trend. Transparent reasoning. Portfolio-level risk analysis. No black boxes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/app/dashboard"
                className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#features"
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
              >
                See how it works
              </Link>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 mb-16">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ==================== PRODUCT PREVIEW ==================== */}
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-2xl dark:shadow-black/40 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B1121]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    app.asxportfolioos.com/dashboard
                  </div>
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="p-6 sm:p-8">
                {/* Top stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      label: 'Total Stocks',
                      value: '187',
                      color: 'text-slate-900 dark:text-white',
                    },
                    {
                      label: 'Strong Buys',
                      value: '24',
                      color: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      label: 'Avg Confidence',
                      value: '72%',
                      color: 'text-indigo-600 dark:text-indigo-400',
                    },
                    {
                      label: 'Last Updated',
                      value: '4:10 PM',
                      color: 'text-slate-900 dark:text-white',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4"
                    >
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {s.label}
                      </div>
                      <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Signal table preview */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Live Signals
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Model A v1.1
                      </span>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                        <th className="text-left px-4 py-2.5">#</th>
                        <th className="text-left px-4 py-2.5">Ticker</th>
                        <th className="text-left px-4 py-2.5 hidden sm:table-cell">Company</th>
                        <th className="text-left px-4 py-2.5">Signal</th>
                        <th className="text-right px-4 py-2.5">Confidence</th>
                        <th className="text-right px-4 py-2.5 hidden sm:table-cell">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleSignals.map((item) => (
                        <tr
                          key={item.ticker}
                          className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-slate-400 font-medium">
                            {item.rank}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                              {item.ticker.replace('.AX', '')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                            {item.company}
                          </td>
                          <td className="px-4 py-3">
                            <SignalBadge signal={item.signal} size="sm" showIcon={true} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-200 dark:bg-white/10 rounded-full h-1.5 hidden sm:block">
                                <div
                                  className="h-1.5 rounded-full bg-indigo-500"
                                  style={{ width: `${item.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                                {item.confidence}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                item.expected.startsWith('+')
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {item.expected}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES BENTO GRID ==================== */}
      <section id="features" className="py-24 lg:py-32 bg-slate-50 dark:bg-[#0F172A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-6">
              Platform
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
              Built for serious
              <br />
              ASX analysis
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Every feature designed to give you an analytical edge. Not tips — transparent,
              quantitative intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group relative p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-indigo-500/5"
                >
                  <div
                    className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${feature.accent} mb-5 shadow-lg`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-24 lg:py-32 bg-white dark:bg-[#0B1121]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-6">
              Process
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
              From raw data to actionable signals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                icon: LineChart,
                title: 'Data Pipeline',
                description:
                  'Daily OHLCV price sync for 200+ ASX stocks. 15+ engineered features including momentum, volatility, trend strength, and volume ratios.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'ML Inference',
                description:
                  'LightGBM ensemble with walk-forward validation generates probability scores. Each stock ranked by expected return with confidence levels.',
              },
              {
                step: '03',
                icon: Target,
                title: 'Signal + Reasoning',
                description:
                  'SHAP values explain every prediction. You see which features contributed and by how much. Upload your portfolio for personalized analysis.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative">
                  <div className="text-6xl font-bold text-indigo-100 dark:text-indigo-500/10 mb-4">
                    {item.step}
                  </div>
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 mb-4">
                    <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== DASHBOARD WIREFRAME PREVIEW ==================== */}
      <section className="py-24 lg:py-32 bg-slate-50 dark:bg-[#0F172A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-6">
                Portfolio Intelligence
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Your holdings, enriched with AI signals
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                Upload a CSV of your portfolio. Instantly see each holding enriched with the latest
                signal, confidence score, and expected return. Get rebalancing suggestions based on
                model output.
              </p>
              <ul className="space-y-4">
                {[
                  'Sharpe ratio, volatility, and max drawdown calculated',
                  'Sector concentration and diversification analysis',
                  'AI-driven rebalancing suggestions',
                  'Export reports to PDF with one click',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                      <ChevronRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Portfolio wireframe mockup */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-xl dark:shadow-black/30 overflow-hidden">
              <div className="p-6">
                {/* Summary strip */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Value</div>
                    <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                      $142,350
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total P&L</div>
                    <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +$12,450
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Sharpe</div>
                    <div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      1.42
                    </div>
                  </div>
                </div>

                {/* Holdings mini table */}
                <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-white/5 px-3 py-2 border-b border-slate-200 dark:border-white/10">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Holdings
                    </span>
                  </div>
                  {[
                    {
                      ticker: 'BHP',
                      shares: 100,
                      value: '$4,523',
                      pl: '+$450',
                      signal: 'BUY',
                      weight: '3.2%',
                    },
                    {
                      ticker: 'CBA',
                      shares: 50,
                      value: '$5,710',
                      pl: '+$320',
                      signal: 'BUY',
                      weight: '4.0%',
                    },
                    {
                      ticker: 'WES',
                      shares: 30,
                      value: '$2,100',
                      pl: '-$85',
                      signal: 'HOLD',
                      weight: '1.5%',
                    },
                    {
                      ticker: 'TLS',
                      shares: 200,
                      value: '$820',
                      pl: '-$40',
                      signal: 'SELL',
                      weight: '0.6%',
                    },
                  ].map((h) => (
                    <div
                      key={h.ticker}
                      className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 w-10">
                          {h.ticker}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {h.shares} shares
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            h.pl.startsWith('+')
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {h.pl}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            h.signal === 'BUY'
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : h.signal === 'SELL'
                                ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {h.signal}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="relative py-24 lg:py-32 bg-white dark:bg-[#0B1121] overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-radial from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            Start analysing the ASX
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              with AI today
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
            Free during beta. Daily signals, portfolio analysis, and model explainability. No credit
            card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app/dashboard"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Free during beta</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Open source</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0F172A] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                ASX Portfolio OS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-lg">
              Not financial advice. AI signals are for informational purposes only. Always conduct
              your own research before investing. Past model performance does not guarantee future
              results.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              &copy; 2026 ASX Portfolio OS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
