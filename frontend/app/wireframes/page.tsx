'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Brain,
  Target,
  Activity,
  Shield,
  Layers,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Search,
  Bell,
  Settings,
  Home,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Plus,
  Eye,
  Cpu,
  Database,
  RefreshCw,
  PieChart,
  Minus,
} from 'lucide-react';

/* =============================================================
   ASX Portfolio OS — High-Detail Wireframe Mockups
   "Midnight Indigo" Design System
   ============================================================= */

/* ---------- SHARED MOCK DATA ---------- */

const signalRows = [
  { rank: 1, ticker: 'BHP', company: 'BHP Group', signal: 'STRONG_BUY', confidence: 91, expected: '+4.8%', price: 46.32, change: +1.82 },
  { rank: 2, ticker: 'CBA', company: 'Commonwealth Bank', signal: 'STRONG_BUY', confidence: 87, expected: '+3.5%', price: 108.74, change: +2.31 },
  { rank: 3, ticker: 'CSL', company: 'CSL Limited', signal: 'BUY', confidence: 78, expected: '+2.2%', price: 294.50, change: +1.14 },
  { rank: 4, ticker: 'WBC', company: 'Westpac Banking', signal: 'BUY', confidence: 74, expected: '+1.8%', price: 25.87, change: +0.92 },
  { rank: 5, ticker: 'ANZ', company: 'ANZ Group', signal: 'BUY', confidence: 71, expected: '+1.5%', price: 28.42, change: +0.65 },
  { rank: 6, ticker: 'NAB', company: 'National Australia Bank', signal: 'HOLD', confidence: 52, expected: '+0.2%', price: 35.10, change: -0.18 },
  { rank: 7, ticker: 'WES', company: 'Wesfarmers', signal: 'HOLD', confidence: 48, expected: '-0.1%', price: 62.45, change: -0.42 },
  { rank: 8, ticker: 'TLS', company: 'Telstra Group', signal: 'SELL', confidence: 72, expected: '-2.4%', price: 4.12, change: -1.21 },
  { rank: 9, ticker: 'FMG', company: 'Fortescue Metals', signal: 'SELL', confidence: 68, expected: '-1.9%', price: 18.90, change: -2.15 },
  { rank: 10, ticker: 'STO', company: 'Santos Ltd', signal: 'STRONG_SELL', confidence: 83, expected: '-3.7%', price: 7.24, change: -3.42 },
];

const holdings = [
  { ticker: 'BHP', company: 'BHP Group', shares: 200, avgCost: 43.50, current: 46.32, signal: 'STRONG_BUY', weight: 14.2 },
  { ticker: 'CBA', company: 'Commonwealth Bank', shares: 50, avgCost: 98.20, current: 108.74, signal: 'STRONG_BUY', weight: 8.3 },
  { ticker: 'CSL', company: 'CSL Limited', shares: 20, avgCost: 280.00, current: 294.50, signal: 'BUY', weight: 9.0 },
  { ticker: 'WBC', company: 'Westpac Banking', shares: 300, avgCost: 24.10, current: 25.87, signal: 'BUY', weight: 11.9 },
  { ticker: 'MQG', company: 'Macquarie Group', shares: 15, avgCost: 185.40, current: 192.80, signal: 'HOLD', weight: 4.4 },
  { ticker: 'WES', company: 'Wesfarmers', shares: 40, avgCost: 58.70, current: 62.45, signal: 'HOLD', weight: 3.8 },
  { ticker: 'TLS', company: 'Telstra Group', shares: 500, avgCost: 4.35, current: 4.12, signal: 'SELL', weight: 3.2 },
];

const shapFeatures = [
  { name: 'Momentum (14d)', value: +0.34, color: 'emerald' },
  { name: 'RSI', value: +0.22, color: 'emerald' },
  { name: 'Volume Ratio', value: +0.18, color: 'emerald' },
  { name: 'MA Cross', value: +0.12, color: 'emerald' },
  { name: 'Volatility', value: -0.08, color: 'red' },
  { name: 'Sector Sentiment', value: -0.05, color: 'red' },
  { name: 'Trend Strength', value: +0.15, color: 'emerald' },
];

/* ---------- HELPER COMPONENTS ---------- */

function SignalPill({ signal }: { signal: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    STRONG_BUY: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Strong Buy' },
    BUY: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', label: 'Buy' },
    HOLD: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Hold' },
    SELL: { bg: 'bg-red-500/10', text: 'text-red-300', label: 'Sell' },
    STRONG_SELL: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Strong Sell' },
  };
  const c = config[signal] || config.HOLD;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function MetricBox({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean | null }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="text-[11px] font-medium text-slate-500 mb-1.5">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active }: { icon: React.ElementType; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-500 hover:text-slate-300'}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-indigo-500' : value >= 40 ? 'bg-slate-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 bg-white/[0.06] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-300">{value}%</span>
    </div>
  );
}

/* Mini sparkline as CSS bars */
function MiniChart({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className={`w-1 rounded-t-sm ${positive ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

/* ---------- WIREFRAME SECTION WRAPPER ---------- */

function WireframeSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-24">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{title}</h2>
        <p className="text-slate-400 text-sm max-w-2xl">{description}</p>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0B1121] shadow-2xl shadow-black/40 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

/* ---------- MOCK SIDEBAR ---------- */

function MockSidebar({ activePage }: { activePage: string }) {
  return (
    <div className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#080E1A] p-4 hidden lg:block">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-1">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white">ASX Portfolio OS</span>
      </div>

      {/* Nav */}
      <div className="space-y-1 mb-8">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Main</div>
        <SidebarItem icon={Home} label="Dashboard" active={activePage === 'dashboard'} />
        <SidebarItem icon={BarChart3} label="Stocks" active={activePage === 'stocks'} />
        <SidebarItem icon={PieChart} label="Portfolio" active={activePage === 'portfolio'} />
        <SidebarItem icon={Star} label="Watchlist" active={activePage === 'watchlist'} />
      </div>
      <div className="space-y-1 mb-8">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Intelligence</div>
        <SidebarItem icon={Brain} label="Models" active={activePage === 'models'} />
        <SidebarItem icon={Layers} label="Fusion" active={activePage === 'fusion'} />
        <SidebarItem icon={Target} label="Insights" active={activePage === 'insights'} />
        <SidebarItem icon={Activity} label="Drift Monitor" active={activePage === 'drift'} />
      </div>
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">System</div>
        <SidebarItem icon={Bell} label="Alerts" />
        <SidebarItem icon={Settings} label="Settings" />
      </div>
    </div>
  );
}

/* ---------- MOCK TOP BAR ---------- */

function MockTopBar({ title, breadcrumb }: { title: string; breadcrumb?: string[] }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
      <div>
        {breadcrumb && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-0.5">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-slate-400' : ''}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-lg font-bold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">Search stocks...</span>
          <span className="text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">/</span>
        </div>
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]">
          <Bell className="h-4 w-4" />
          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
          JP
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   1. DASHBOARD WIREFRAME
   ============================================================= */

function DashboardWireframe() {
  return (
    <WireframeSection
      title="Dashboard"
      description="The primary command center — live signal rankings, market stats, and at-a-glance portfolio health. Updates in real-time via SWR polling."
    >
      <div className="flex min-h-[700px]">
        <MockSidebar activePage="dashboard" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Dashboard" breadcrumb={['Home', 'Dashboard']} />
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBox label="Total Stocks" value="187" sub="ASX listed" />
              <MetricBox label="Strong Buys" value="24" sub="Above 80% confidence" positive={true} />
              <MetricBox label="Avg Confidence" value="72%" sub="Across all signals" />
              <MetricBox label="Model Accuracy" value="68.4%" sub="30-day rolling" positive={true} />
            </div>

            {/* Signal Distribution Bar */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Signal Distribution</span>
                <span className="text-[11px] text-slate-500">Updated 4:10 PM AEST</span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-3">
                <div className="bg-emerald-500" style={{ width: '13%' }} title="Strong Buy" />
                <div className="bg-emerald-400/70" style={{ width: '22%' }} title="Buy" />
                <div className="bg-slate-500/70" style={{ width: '35%' }} title="Hold" />
                <div className="bg-red-400/70" style={{ width: '20%' }} title="Sell" />
                <div className="bg-red-500" style={{ width: '10%' }} title="Strong Sell" />
              </div>
              <div className="flex items-center gap-4 mt-2.5">
                {[
                  { label: 'Strong Buy', color: 'bg-emerald-500', count: 24 },
                  { label: 'Buy', color: 'bg-emerald-400/70', count: 41 },
                  { label: 'Hold', color: 'bg-slate-500/70', count: 66 },
                  { label: 'Sell', color: 'bg-red-400/70', count: 37 },
                  { label: 'Strong Sell', color: 'bg-red-500', count: 19 },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <div className={`w-2 h-2 rounded-sm ${s.color}`} />
                    <span>{s.label}</span>
                    <span className="font-semibold text-slate-400">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Signal Table */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">Live Signals</span>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-medium">Live</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-400">
                    <Filter className="h-3 w-3" /> Filters
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-400">
                    <Download className="h-3 w-3" /> Export
                  </button>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-medium text-slate-500 border-b border-white/[0.06]">
                    <th className="text-left px-4 py-2.5 w-10">#</th>
                    <th className="text-left px-4 py-2.5">Ticker</th>
                    <th className="text-left px-4 py-2.5 hidden lg:table-cell">Company</th>
                    <th className="text-left px-4 py-2.5">Signal</th>
                    <th className="text-right px-4 py-2.5">Confidence</th>
                    <th className="text-right px-4 py-2.5">Price</th>
                    <th className="text-right px-4 py-2.5 hidden md:table-cell">Change</th>
                    <th className="text-right px-4 py-2.5 hidden md:table-cell">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {signalRows.map((row) => (
                    <tr key={row.ticker} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <td className="px-4 py-3 text-xs text-slate-600 font-medium">{row.rank}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-indigo-400">{row.ticker}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 hidden lg:table-cell">{row.company}</td>
                      <td className="px-4 py-3"><SignalPill signal={row.signal} /></td>
                      <td className="px-4 py-3 text-right"><ConfidenceBar value={row.confidence} /></td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-300">${row.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className={`text-xs font-semibold tabular-nums ${row.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className={`text-xs font-semibold tabular-nums ${row.expected.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                          {row.expected}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                <span className="text-[11px] text-slate-500">Showing 1-10 of 187 stocks</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, '...', 19].map((p, i) => (
                    <button
                      key={i}
                      className={`w-7 h-7 rounded-md text-xs font-medium ${p === 1 ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:bg-white/[0.04]'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WireframeSection>
  );
}

/* =============================================================
   2. STOCK DETAIL WIREFRAME
   ============================================================= */

function StockDetailWireframe() {
  return (
    <WireframeSection
      title="Stock Detail"
      description="Deep-dive view for individual stocks — price chart, AI signal with SHAP explainability, technical indicators, and historical signal accuracy."
    >
      <div className="flex min-h-[750px]">
        <MockSidebar activePage="stocks" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="BHP Group" breadcrumb={['Stocks', 'BHP.AX']} />
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Stock Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white tabular-nums">$46.32</h2>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span className="tabular-nums">+$0.83 (+1.82%)</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">BHP Group Limited &middot; ASX &middot; Materials</p>
              </div>
              <div className="flex items-center gap-2">
                <SignalPill signal="STRONG_BUY" />
                <span className="text-sm font-semibold text-slate-300 tabular-nums">91% confidence</span>
                <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]">
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
                    <button
                      key={tf}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${tf === '3M' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:bg-white/[0.04]'}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-[11px] text-slate-500 px-2 py-1 rounded bg-white/[0.04]">Candlestick</button>
                  <button className="text-[11px] text-slate-500 px-2 py-1 rounded bg-white/[0.04]">Volume</button>
                </div>
              </div>
              {/* Simulated price chart area */}
              <div className="relative h-48 rounded-lg bg-gradient-to-b from-indigo-500/5 to-transparent border border-white/[0.04] overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[40, 80, 120, 160].map((y) => (
                    <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  ))}
                  {/* Price line */}
                  <polyline
                    points="0,160 30,155 60,140 90,145 120,130 150,110 180,120 210,100 240,95 270,80 300,85 330,70 360,65 390,55 420,60 450,45 480,40 500,35"
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth="2"
                  />
                  {/* Area fill */}
                  <polygon
                    points="0,160 30,155 60,140 90,145 120,130 150,110 180,120 210,100 240,95 270,80 300,85 330,70 360,65 390,55 420,60 450,45 480,40 500,35 500,200 0,200"
                    fill="url(#chartGradient)"
                  />
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(129,140,248,0.15)" />
                      <stop offset="100%" stopColor="rgba(129,140,248,0)" />
                    </linearGradient>
                  </defs>
                  {/* Signal markers */}
                  <circle cx="270" cy="80" r="4" fill="#10b981" stroke="#0B1121" strokeWidth="2" />
                  <circle cx="150" cy="110" r="4" fill="#818CF8" stroke="#0B1121" strokeWidth="2" />
                </svg>
                {/* Price labels */}
                <div className="absolute right-2 top-2 text-[10px] text-slate-600 tabular-nums">$48.00</div>
                <div className="absolute right-2 bottom-2 text-[10px] text-slate-600 tabular-nums">$42.00</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SHAP Explainability Panel */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Brain className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">SHAP Feature Impact</h3>
                </div>
                <div className="space-y-3">
                  {shapFeatures.map((f) => {
                    const maxVal = 0.4;
                    const width = Math.abs(f.value) / maxVal * 100;
                    return (
                      <div key={f.name} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-28 flex-shrink-0 text-right">{f.name}</span>
                        <div className="flex-1 flex items-center">
                          {f.value < 0 ? (
                            <div className="flex-1 flex justify-end">
                              <div className="bg-red-500/40 h-4 rounded-l-sm" style={{ width: `${width}%` }} />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <div className="bg-emerald-500/40 h-4 rounded-r-sm" style={{ width: `${width}%` }} />
                            </div>
                          )}
                        </div>
                        <span className={`text-xs font-semibold tabular-nums w-10 ${f.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {f.value >= 0 ? '+' : ''}{f.value.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-600">
                  <span>Model: LightGBM v1.1 &middot; Walk-forward split 5/5</span>
                  <span>Base value: 0.50</span>
                </div>
              </div>

              {/* Key Metrics Panel */}
              <div className="space-y-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Key Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">Market Cap</div>
                      <div className="text-sm font-semibold text-slate-300">$236.4B</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">P/E Ratio</div>
                      <div className="text-sm font-semibold text-slate-300">12.8</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">Div Yield</div>
                      <div className="text-sm font-semibold text-slate-300">5.2%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">52w Range</div>
                      <div className="text-sm font-semibold text-slate-300">$38.12 - $49.80</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">Avg Volume</div>
                      <div className="text-sm font-semibold text-slate-300">12.4M</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">Sector</div>
                      <div className="text-sm font-semibold text-slate-300">Materials</div>
                    </div>
                  </div>
                </div>

                {/* Signal History */}
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Signal History (30d)</h3>
                  <div className="space-y-2">
                    {[
                      { date: 'Feb 7', signal: 'STRONG_BUY', conf: 91 },
                      { date: 'Feb 6', signal: 'STRONG_BUY', conf: 88 },
                      { date: 'Feb 5', signal: 'BUY', conf: 76 },
                      { date: 'Feb 4', signal: 'BUY', conf: 72 },
                      { date: 'Feb 3', signal: 'HOLD', conf: 54 },
                    ].map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-slate-500 w-14">{h.date}</span>
                        <SignalPill signal={h.signal} />
                        <span className="text-xs tabular-nums text-slate-400">{h.conf}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WireframeSection>
  );
}

/* =============================================================
   3. PORTFOLIO WIREFRAME
   ============================================================= */

function PortfolioWireframe() {
  const totalValue = holdings.reduce((s, h) => s + h.current * h.shares, 0);
  const totalCost = holdings.reduce((s, h) => s + h.avgCost * h.shares, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = (totalPL / totalCost) * 100;

  return (
    <WireframeSection
      title="Portfolio Manager"
      description="Upload your CSV holdings and get instant AI-enriched analysis — risk metrics, rebalancing suggestions, and per-holding signal overlays."
    >
      <div className="flex min-h-[750px]">
        <MockSidebar activePage="portfolio" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Portfolio" breadcrumb={['Home', 'Portfolio']} />
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Portfolio Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricBox label="Total Value" value={`$${(totalValue / 1000).toFixed(1)}K`} />
              <MetricBox label="Total P&L" value={`+$${(totalPL / 1000).toFixed(1)}K`} sub={`+${totalPLPct.toFixed(1)}%`} positive={totalPL >= 0} />
              <MetricBox label="Sharpe Ratio" value="1.42" sub="Annualized" positive={true} />
              <MetricBox label="Max Drawdown" value="-8.3%" sub="12 months" positive={false} />
              <MetricBox label="Holdings" value={`${holdings.length}`} sub="Active positions" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Allocation Visualization */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Sector Allocation</h3>
                {/* Simulated donut chart */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* Donut segments */}
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#818CF8" strokeWidth="12" strokeDasharray="75.4 176" strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#34D399" strokeWidth="12" strokeDasharray="50.3 201" strokeDashoffset="-75.4" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#22D3EE" strokeWidth="12" strokeDasharray="37.7 213.6" strokeDashoffset="-125.7" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#FBBF24" strokeWidth="12" strokeDasharray="25.1 226.2" strokeDashoffset="-163.4" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#F87171" strokeWidth="12" strokeDasharray="62.8 188.5" strokeDashoffset="-188.5" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white tabular-nums">7</div>
                        <div className="text-[10px] text-slate-500">Holdings</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { sector: 'Financials', pct: '34%', color: 'bg-indigo-500' },
                    { sector: 'Materials', pct: '23%', color: 'bg-emerald-500' },
                    { sector: 'Healthcare', pct: '15%', color: 'bg-cyan-500' },
                    { sector: 'Consumer', pct: '10%', color: 'bg-amber-500' },
                    { sector: 'Telecom', pct: '18%', color: 'bg-red-400' },
                  ].map((s) => (
                    <div key={s.sector} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                        <span className="text-xs text-slate-400">{s.sector}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-300 tabular-nums">{s.pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holdings Table */}
              <div className="lg:col-span-2 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-sm font-semibold text-white">Holdings</span>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] font-medium">
                      <Plus className="h-3 w-3" /> Upload CSV
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-400">
                      <Download className="h-3 w-3" /> Export
                    </button>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] font-medium text-slate-500 border-b border-white/[0.06]">
                      <th className="text-left px-4 py-2.5">Ticker</th>
                      <th className="text-right px-4 py-2.5">Shares</th>
                      <th className="text-right px-4 py-2.5">Current</th>
                      <th className="text-right px-4 py-2.5">P&L</th>
                      <th className="text-left px-4 py-2.5">Signal</th>
                      <th className="text-right px-4 py-2.5">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => {
                      const pl = (h.current - h.avgCost) * h.shares;
                      const plPct = ((h.current - h.avgCost) / h.avgCost) * 100;
                      return (
                        <tr key={h.ticker} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-sm font-semibold text-indigo-400">{h.ticker}</span>
                              <div className="text-[10px] text-slate-600">{h.company}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-400">{h.shares}</td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-300">${h.current.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className={`text-xs font-semibold tabular-nums ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pl >= 0 ? '+' : ''}{pl.toFixed(0)}
                            </div>
                            <div className={`text-[10px] tabular-nums ${pl >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                              {plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-4 py-3"><SignalPill signal={h.signal} /></td>
                          <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-400">{h.weight}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rebalancing Suggestions */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">AI Rebalancing Suggestions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { action: 'Increase', ticker: 'BHP', reason: 'Strong Buy signal with 91% confidence. Currently underweight vs. sector average.', color: 'emerald' },
                  { action: 'Reduce', ticker: 'TLS', reason: 'Sell signal with declining momentum. Consider trimming position to reduce drag.', color: 'red' },
                  { action: 'Diversify', ticker: 'Healthcare', reason: 'Sector underrepresented. Consider adding CSL or RMD for better diversification.', color: 'indigo' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-lg border p-4 ${
                    s.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5' :
                    s.color === 'red' ? 'border-red-500/20 bg-red-500/5' :
                    'border-indigo-500/20 bg-indigo-500/5'
                  }`}>
                    <div className={`text-xs font-semibold mb-1 ${
                      s.color === 'emerald' ? 'text-emerald-400' :
                      s.color === 'red' ? 'text-red-400' :
                      'text-indigo-400'
                    }`}>
                      {s.action} &middot; {s.ticker}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WireframeSection>
  );
}

/* =============================================================
   4. MODELS / ML PIPELINE WIREFRAME
   ============================================================= */

function ModelsWireframe() {
  return (
    <WireframeSection
      title="Models & ML Pipeline"
      description="Monitor model health, accuracy metrics, drift detection, and feature importance across all deployed models."
    >
      <div className="flex min-h-[700px]">
        <MockSidebar activePage="models" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Models" breadcrumb={['Intelligence', 'Models']} />
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Model Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: 'LightGBM v1.1',
                  type: 'Momentum',
                  status: 'healthy',
                  accuracy: 68.4,
                  precision: 71.2,
                  f1: 65.8,
                  signals: 187,
                  lastTrain: '2 days ago',
                  driftStatus: 'stable',
                },
                {
                  name: 'XGBoost v0.9',
                  type: 'Trend Strength',
                  status: 'healthy',
                  accuracy: 64.1,
                  precision: 67.8,
                  f1: 62.3,
                  signals: 187,
                  lastTrain: '3 days ago',
                  driftStatus: 'stable',
                },
                {
                  name: 'Ensemble v1.0',
                  type: 'Multi-Model Fusion',
                  status: 'degraded',
                  accuracy: 72.1,
                  precision: 74.5,
                  f1: 69.8,
                  signals: 187,
                  lastTrain: '1 day ago',
                  driftStatus: 'warning',
                },
              ].map((model) => (
                <div key={model.name} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-white/[0.1] transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{model.name}</h3>
                      <span className="text-[10px] text-slate-500">{model.type}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium ${
                      model.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {model.status === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {model.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <div className="text-[10px] text-slate-600">Accuracy</div>
                      <div className="text-lg font-bold tabular-nums text-white">{model.accuracy}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600">Precision</div>
                      <div className="text-lg font-bold tabular-nums text-slate-300">{model.precision}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600">F1 Score</div>
                      <div className="text-lg font-bold tabular-nums text-slate-300">{model.f1}%</div>
                    </div>
                  </div>

                  {/* Accuracy mini sparkline */}
                  <div className="mb-3">
                    <MiniChart
                      data={[58, 62, 60, 65, 64, 68, 67, 70, 68, 72, 69, 68]}
                      positive={true}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <span className="text-[10px] text-slate-600">Trained {model.lastTrain}</span>
                    <div className={`flex items-center gap-1 text-[10px] font-medium ${
                      model.driftStatus === 'stable' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <Activity className="h-3 w-3" />
                      Drift: {model.driftStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Importance */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Global Feature Importance</h3>
                </div>
                <span className="text-[11px] text-slate-500">LightGBM v1.1</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Momentum (14d)', importance: 0.28 },
                  { name: 'RSI (14)', importance: 0.19 },
                  { name: 'Volume Ratio (20d)', importance: 0.15 },
                  { name: 'MA Cross (10/50)', importance: 0.12 },
                  { name: 'Volatility (21d)', importance: 0.09 },
                  { name: 'Trend ADX', importance: 0.07 },
                  { name: 'Price vs 200MA', importance: 0.05 },
                  { name: 'Sector Return', importance: 0.03 },
                  { name: 'Beta (90d)', importance: 0.02 },
                ].map((f) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-32 flex-shrink-0 text-right">{f.name}</span>
                    <div className="flex-1 bg-white/[0.04] rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${f.importance / 0.3 * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-400 w-10">{(f.importance * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Drift Monitor Strip */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Drift Monitor</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { feature: 'Momentum (14d)', psi: 0.04, status: 'stable' },
                  { feature: 'RSI (14)', psi: 0.08, status: 'stable' },
                  { feature: 'Volume Ratio', psi: 0.18, status: 'warning' },
                  { feature: 'Volatility (21d)', psi: 0.06, status: 'stable' },
                ].map((d) => (
                  <div key={d.feature} className={`rounded-lg border p-3 ${
                    d.status === 'stable' ? 'border-white/[0.06]' : 'border-amber-500/20 bg-amber-500/5'
                  }`}>
                    <div className="text-[10px] text-slate-500 mb-1">{d.feature}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tabular-nums text-white">{d.psi.toFixed(2)}</span>
                      <span className={`text-[10px] font-medium ${d.status === 'stable' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">PSI threshold: 0.15</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WireframeSection>
  );
}

/* =============================================================
   5. STOCKS BROWSE WIREFRAME
   ============================================================= */

function StocksBrowseWireframe() {
  return (
    <WireframeSection
      title="Stocks Browser"
      description="Browse, filter, and sort all 200+ ASX stocks with real-time signal overlays, sector grouping, and quick-add to watchlist."
    >
      <div className="flex min-h-[650px]">
        <MockSidebar activePage="stocks" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Stocks" breadcrumb={['Home', 'Stocks']} />
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Search className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-500">Search by ticker or company name...</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400">
                  Signal <ChevronDown className="h-3 w-3" />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400">
                  Sector <ChevronDown className="h-3 w-3" />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400">
                  Confidence <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Active Filters */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Active filters:</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                Strong Buy + Buy <XCircle className="h-3 w-3 cursor-pointer" />
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[11px] font-medium">
                Confidence &gt; 70% <XCircle className="h-3 w-3 cursor-pointer" />
              </span>
              <button className="text-[11px] text-slate-600 hover:text-slate-400">Clear all</button>
            </div>

            {/* Stock Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signalRows.slice(0, 6).map((stock) => (
                <div key={stock.ticker} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:border-white/[0.1] transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-indigo-400">{stock.ticker}</span>
                        <SignalPill signal={stock.signal} />
                      </div>
                      <span className="text-[11px] text-slate-500">{stock.company}</span>
                    </div>
                    <button className="p-1.5 rounded-md text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xl font-bold tabular-nums text-white">${stock.price.toFixed(2)}</div>
                      <div className={`text-xs font-semibold tabular-nums ${stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <ConfidenceBar value={stock.confidence} />
                      <div className={`text-[10px] font-medium mt-1 ${stock.expected.startsWith('+') ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        Expected: {stock.expected}
                      </div>
                    </div>
                  </div>
                  {/* Mini sparkline */}
                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                    <MiniChart
                      data={[45, 48, 46, 50, 52, 49, 55, 53, 58, 56, 60, 58, 62, 60, 65]}
                      positive={stock.change >= 0}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center pt-4">
              <span className="text-sm text-slate-500">Showing 6 of 65 matching stocks</span>
            </div>
          </div>
        </div>
      </div>
    </WireframeSection>
  );
}

/* =============================================================
   MAIN WIREFRAMES PAGE
   ============================================================= */

export default function WireframesPage() {
  const [currentView, setCurrentView] = useState<string>('all');

  const views = [
    { id: 'all', label: 'All Screens' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'stock-detail', label: 'Stock Detail' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'models', label: 'Models' },
    { id: 'stocks', label: 'Stocks Browse' },
  ];

  return (
    <div className="min-h-screen bg-[#060A14] text-slate-100">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  <span className="text-indigo-400">ASX</span> Portfolio OS
                </span>
              </Link>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                Wireframes
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
                Back to Home
              </Link>
              <Link
                href="/app/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/15 border border-indigo-500/25 hover:bg-indigo-500/25 transition-colors"
              >
                Open App
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            High-Fidelity Wireframes
          </h1>
          <p className="text-lg text-slate-400">
            Detailed mockups of every key screen in the ASX Portfolio OS platform,
            rendered in the &quot;Midnight Indigo&quot; design system.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setCurrentView(v.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === v.id
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Wireframes */}
        {(currentView === 'all' || currentView === 'dashboard') && <DashboardWireframe />}
        {(currentView === 'all' || currentView === 'stock-detail') && <StockDetailWireframe />}
        {(currentView === 'all' || currentView === 'portfolio') && <PortfolioWireframe />}
        {(currentView === 'all' || currentView === 'models') && <ModelsWireframe />}
        {(currentView === 'all' || currentView === 'stocks') && <StocksBrowseWireframe />}

        {/* Design System Summary */}
        <section className="mt-8 mb-16">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <h2 className="text-xl font-bold text-white mb-6">Design System: &quot;Midnight Indigo&quot;</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Color Palette */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Color Palette</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Background', color: '#0B1121', hex: '#0B1121' },
                    { name: 'Surface', color: '#111827', hex: '#111827' },
                    { name: 'Elevated', color: '#1E293B', hex: '#1E293B' },
                    { name: 'Accent Primary', color: '#818CF8', hex: '#818CF8' },
                    { name: 'Accent Hover', color: '#A5B4FC', hex: '#A5B4FC' },
                    { name: 'Strong Buy', color: '#34D399', hex: '#34D399' },
                    { name: 'Sell', color: '#FCA5A5', hex: '#FCA5A5' },
                    { name: 'Warning', color: '#FBBF24', hex: '#FBBF24' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md border border-white/10" style={{ backgroundColor: c.color }} />
                      <span className="text-xs text-slate-400 flex-1">{c.name}</span>
                      <span className="text-[10px] font-mono text-slate-600">{c.hex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Typography</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-slate-600 mb-1">Font Family</div>
                    <div className="text-sm text-slate-300">Inter (sans-serif)</div>
                    <div className="text-sm font-mono text-slate-400">JetBrains Mono (code)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-1">Scale</div>
                    <div className="text-2xl font-bold text-white">Heading 2xl</div>
                    <div className="text-lg font-semibold text-slate-200">Heading lg</div>
                    <div className="text-sm text-slate-300">Body text sm</div>
                    <div className="text-xs text-slate-400">Caption xs</div>
                    <div className="text-[10px] text-slate-500">Micro 10px</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-1">Numeric</div>
                    <div className="text-lg tabular-nums font-semibold text-white">$142,350.00</div>
                  </div>
                </div>
              </div>

              {/* Components */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Components</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-slate-600 mb-2">Signal Badges</div>
                    <div className="flex flex-wrap gap-1.5">
                      <SignalPill signal="STRONG_BUY" />
                      <SignalPill signal="BUY" />
                      <SignalPill signal="HOLD" />
                      <SignalPill signal="SELL" />
                      <SignalPill signal="STRONG_SELL" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-2">Confidence Bars</div>
                    <div className="space-y-1.5">
                      <ConfidenceBar value={91} />
                      <ConfidenceBar value={72} />
                      <ConfidenceBar value={48} />
                      <ConfidenceBar value={25} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-2">Borders & Radius</div>
                    <div className="text-xs text-slate-400">
                      Cards: 0.75rem (xl) &middot; Badges: 0.375rem (md) &middot; Buttons: 0.5rem (lg)
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-2">Shadows</div>
                    <div className="text-xs text-slate-400">
                      Glow: indigo-500/15 &middot; Card: black/40 &middot; Subtle: black/10
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
