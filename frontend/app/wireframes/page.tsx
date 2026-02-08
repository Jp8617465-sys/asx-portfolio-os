'use client';

import React, { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  BarChart3,
  Brain,
  Target,
  Activity,
  Shield,
  Layers,
  ArrowUpRight,
  ChevronDown,
  Search,
  Bell,
  Settings,
  Home,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  Plus,
  PieChart,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

/* =============================================================
   THEME SYSTEM
   Two modes:
     "dark"  → Midnight Indigo (navy, indigo accents)
     "retro" → 90s Retro (cream, teal, hard shadows, Courier)
   ============================================================= */

type ThemeMode = 'dark' | 'retro';

interface Theme {
  mode: ThemeMode;
  // Page
  pageBg: string;
  pageText: string;
  // Section titles
  titleText: string;
  subtitleText: string;
  // Wireframe container
  frameBg: string;
  frameBorder: string;
  frameShadow: string;
  // Sidebar
  sidebarBg: string;
  sidebarBorder: string;
  sidebarLogo: string;
  sidebarLabel: string;
  sidebarActive: string;
  sidebarActiveText: string;
  sidebarItem: string;
  sidebarItemHover: string;
  // Topbar
  topbarBg: string;
  topbarBorder: string;
  topbarTitle: string;
  topbarBreadcrumb: string;
  topbarSearchBg: string;
  topbarSearchBorder: string;
  topbarSearchText: string;
  topbarAvatar: string;
  // Cards / surfaces
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  // Accent
  accent: string;
  accentSubtle: string;
  accentText: string;
  // Ticker
  tickerText: string;
  // Signals
  strongBuyBg: string;
  strongBuyText: string;
  buyBg: string;
  buyText: string;
  holdBg: string;
  holdText: string;
  sellBg: string;
  sellText: string;
  strongSellBg: string;
  strongSellText: string;
  // Positive / Negative
  positive: string;
  negative: string;
  positiveBg: string;
  negativeBg: string;
  // Chart
  chartLine: string;
  chartFillFrom: string;
  chartFillTo: string;
  chartGrid: string;
  chartMarkerStroke: string;
  // Bar / progress
  barTrack: string;
  barHigh: string;
  barMid: string;
  barLow: string;
  barDanger: string;
  // Table
  tableHeaderBg: string;
  tableHeaderText: string;
  tableRowBorder: string;
  tableRowHover: string;
  // Buttons
  btnBg: string;
  btnBorder: string;
  btnText: string;
  btnActiveBg: string;
  btnActiveText: string;
  // Status
  statusHealthyBg: string;
  statusHealthyText: string;
  statusWarningBg: string;
  statusWarningText: string;
  // Filter chips
  chipBg: string;
  chipBorder: string;
  chipText: string;
  // Font
  numericFont: string;
  // Misc
  paginationActive: string;
  paginationActiveText: string;
  liveBadgeBg: string;
  liveBadgeText: string;
  liveDot: string;
  notifDot: string;
  // Donut chart colors
  donut1: string;
  donut2: string;
  donut3: string;
  donut4: string;
  donut5: string;
  // Suggestion cards
  suggestIncreaseBg: string;
  suggestIncreaseBorder: string;
  suggestIncreaseText: string;
  suggestReduceBg: string;
  suggestReduceBorder: string;
  suggestReduceText: string;
  suggestDiversifyBg: string;
  suggestDiversifyBorder: string;
  suggestDiversifyText: string;
  // Importance bar gradient
  importanceBar: string;
  // Drift
  driftStableBorder: string;
  driftWarningBg: string;
  driftWarningBorder: string;
}

const darkTheme: Theme = {
  mode: 'dark',
  pageBg: 'bg-[#060A14]',
  pageText: 'text-slate-100',
  titleText: 'text-white',
  subtitleText: 'text-slate-400',
  frameBg: 'bg-[#0B1121]',
  frameBorder: 'border-white/[0.08]',
  frameShadow: 'shadow-2xl shadow-black/40',
  sidebarBg: 'bg-[#080E1A]',
  sidebarBorder: 'border-white/[0.06]',
  sidebarLogo: 'bg-gradient-to-br from-indigo-500 to-violet-600',
  sidebarLabel: 'text-slate-600',
  sidebarActive: 'bg-indigo-500/10',
  sidebarActiveText: 'text-indigo-400',
  sidebarItem: 'text-slate-500',
  sidebarItemHover: 'hover:text-slate-300',
  topbarBg: '',
  topbarBorder: 'border-white/[0.06]',
  topbarTitle: 'text-white',
  topbarBreadcrumb: 'text-slate-600',
  topbarSearchBg: 'bg-white/[0.04]',
  topbarSearchBorder: 'border-white/[0.06]',
  topbarSearchText: 'text-slate-500',
  topbarAvatar: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white',
  cardBg: 'bg-white/[0.03]',
  cardBorder: 'border-white/[0.06]',
  cardShadow: '',
  textPrimary: 'text-white',
  textSecondary: 'text-slate-300',
  textMuted: 'text-slate-500',
  textDim: 'text-slate-600',
  accent: 'text-indigo-400',
  accentSubtle: 'bg-indigo-500/10',
  accentText: 'text-indigo-400',
  tickerText: 'text-indigo-400',
  strongBuyBg: 'bg-emerald-500/15',
  strongBuyText: 'text-emerald-400',
  buyBg: 'bg-emerald-500/10',
  buyText: 'text-emerald-300',
  holdBg: 'bg-slate-500/15',
  holdText: 'text-slate-400',
  sellBg: 'bg-red-500/10',
  sellText: 'text-red-300',
  strongSellBg: 'bg-red-500/15',
  strongSellText: 'text-red-400',
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  positiveBg: 'bg-emerald-500/10',
  negativeBg: 'bg-red-500/10',
  chartLine: '#818CF8',
  chartFillFrom: 'rgba(129,140,248,0.15)',
  chartFillTo: 'rgba(129,140,248,0)',
  chartGrid: 'rgba(255,255,255,0.04)',
  chartMarkerStroke: '#0B1121',
  barTrack: 'bg-white/[0.06]',
  barHigh: 'bg-emerald-500',
  barMid: 'bg-indigo-500',
  barLow: 'bg-slate-500',
  barDanger: 'bg-red-500',
  tableHeaderBg: '',
  tableHeaderText: 'text-slate-500',
  tableRowBorder: 'border-white/[0.03]',
  tableRowHover: 'hover:bg-white/[0.02]',
  btnBg: 'bg-white/[0.04]',
  btnBorder: 'border-white/[0.06]',
  btnText: 'text-slate-400',
  btnActiveBg: 'bg-indigo-500/15',
  btnActiveText: 'text-indigo-400',
  statusHealthyBg: 'bg-emerald-500/10',
  statusHealthyText: 'text-emerald-400',
  statusWarningBg: 'bg-amber-500/10',
  statusWarningText: 'text-amber-400',
  chipBg: 'bg-emerald-500/10',
  chipBorder: '',
  chipText: 'text-emerald-400',
  numericFont: '',
  paginationActive: 'bg-indigo-500/15',
  paginationActiveText: 'text-indigo-400',
  liveBadgeBg: 'bg-emerald-500/10',
  liveBadgeText: 'text-emerald-400',
  liveDot: 'bg-emerald-400',
  notifDot: 'bg-indigo-500',
  donut1: '#818CF8',
  donut2: '#34D399',
  donut3: '#22D3EE',
  donut4: '#FBBF24',
  donut5: '#F87171',
  suggestIncreaseBg: 'bg-emerald-500/5',
  suggestIncreaseBorder: 'border-emerald-500/20',
  suggestIncreaseText: 'text-emerald-400',
  suggestReduceBg: 'bg-red-500/5',
  suggestReduceBorder: 'border-red-500/20',
  suggestReduceText: 'text-red-400',
  suggestDiversifyBg: 'bg-indigo-500/5',
  suggestDiversifyBorder: 'border-indigo-500/20',
  suggestDiversifyText: 'text-indigo-400',
  importanceBar: 'bg-gradient-to-r from-indigo-500 to-violet-500',
  driftStableBorder: 'border-white/[0.06]',
  driftWarningBg: 'bg-amber-500/5',
  driftWarningBorder: 'border-amber-500/20',
};

const retroTheme: Theme = {
  mode: 'retro',
  pageBg: 'bg-[#F5F0E1]',
  pageText: 'text-[#2C2416]',
  titleText: 'text-[#2C2416]',
  subtitleText: 'text-[#7A6C55]',
  frameBg: 'bg-[#FFFEF6]',
  frameBorder: 'border-[#B8A88A]',
  frameShadow: '',
  sidebarBg: 'bg-[#E8E0CE]',
  sidebarBorder: 'border-[#C4B998]',
  sidebarLogo: 'bg-[#008080]',
  sidebarLabel: 'text-[#8B7D62]',
  sidebarActive: 'bg-[#008080]/15',
  sidebarActiveText: 'text-[#006666]',
  sidebarItem: 'text-[#6B5D4A]',
  sidebarItemHover: 'hover:text-[#2C2416]',
  topbarBg: 'bg-[#FFFEF6]',
  topbarBorder: 'border-[#C4B998]',
  topbarTitle: 'text-[#2C2416]',
  topbarBreadcrumb: 'text-[#8B7D62]',
  topbarSearchBg: 'bg-[#F5F0E1]',
  topbarSearchBorder: 'border-[#C4B998]',
  topbarSearchText: 'text-[#8B7D62]',
  topbarAvatar: 'bg-[#008080] text-white',
  cardBg: 'bg-[#FFFEF6]',
  cardBorder: 'border-[#C4B998]',
  cardShadow: 'shadow-[3px_3px_0px_#C4B998]',
  textPrimary: 'text-[#2C2416]',
  textSecondary: 'text-[#4A3F2F]',
  textMuted: 'text-[#8B7D62]',
  textDim: 'text-[#A89A7E]',
  accent: 'text-[#008080]',
  accentSubtle: 'bg-[#008080]/10',
  accentText: 'text-[#008080]',
  tickerText: 'text-[#0000EE]',
  strongBuyBg: 'bg-[#006400]/15',
  strongBuyText: 'text-[#006400]',
  buyBg: 'bg-[#228B22]/10',
  buyText: 'text-[#228B22]',
  holdBg: 'bg-[#B8860B]/10',
  holdText: 'text-[#8B6914]',
  sellBg: 'bg-[#CD3333]/10',
  sellText: 'text-[#CD3333]',
  strongSellBg: 'bg-[#8B0000]/15',
  strongSellText: 'text-[#8B0000]',
  positive: 'text-[#006400]',
  negative: 'text-[#CD3333]',
  positiveBg: 'bg-[#006400]/10',
  negativeBg: 'bg-[#CD3333]/10',
  chartLine: '#008080',
  chartFillFrom: 'rgba(0,128,128,0.12)',
  chartFillTo: 'rgba(0,128,128,0)',
  chartGrid: 'rgba(180,165,130,0.3)',
  chartMarkerStroke: '#FFFEF6',
  barTrack: 'bg-[#E8E0CE]',
  barHigh: 'bg-[#006400]',
  barMid: 'bg-[#008080]',
  barLow: 'bg-[#B8860B]',
  barDanger: 'bg-[#CD3333]',
  tableHeaderBg: 'bg-[#F0EADB]',
  tableHeaderText: 'text-[#6B5D4A]',
  tableRowBorder: 'border-[#E0D8C4]',
  tableRowHover: 'hover:bg-[#F5F0E1]',
  btnBg: 'bg-[#F0EADB]',
  btnBorder: 'border-[#C4B998]',
  btnText: 'text-[#6B5D4A]',
  btnActiveBg: 'bg-[#008080]/15',
  btnActiveText: 'text-[#006666]',
  statusHealthyBg: 'bg-[#006400]/10',
  statusHealthyText: 'text-[#006400]',
  statusWarningBg: 'bg-[#B8860B]/15',
  statusWarningText: 'text-[#8B6914]',
  chipBg: 'bg-[#006400]/10',
  chipBorder: 'border-[#006400]/30',
  chipText: 'text-[#006400]',
  numericFont: 'font-mono',
  paginationActive: 'bg-[#008080]/15',
  paginationActiveText: 'text-[#006666]',
  liveBadgeBg: 'bg-[#006400]/10',
  liveBadgeText: 'text-[#006400]',
  liveDot: 'bg-[#006400]',
  notifDot: 'bg-[#CD3333]',
  donut1: '#008080',
  donut2: '#006400',
  donut3: '#B8860B',
  donut4: '#CD3333',
  donut5: '#800080',
  suggestIncreaseBg: 'bg-[#006400]/8',
  suggestIncreaseBorder: 'border-[#006400]/25',
  suggestIncreaseText: 'text-[#006400]',
  suggestReduceBg: 'bg-[#CD3333]/8',
  suggestReduceBorder: 'border-[#CD3333]/25',
  suggestReduceText: 'text-[#CD3333]',
  suggestDiversifyBg: 'bg-[#008080]/8',
  suggestDiversifyBorder: 'border-[#008080]/25',
  suggestDiversifyText: 'text-[#008080]',
  importanceBar: 'bg-[#008080]',
  driftStableBorder: 'border-[#C4B998]',
  driftWarningBg: 'bg-[#B8860B]/10',
  driftWarningBorder: 'border-[#B8860B]/30',
};

const ThemeContext = createContext<Theme>(darkTheme);
const useTheme = () => useContext(ThemeContext);

/* ---------- SHARED MOCK DATA ---------- */

const signalRows = [
  {
    rank: 1,
    ticker: 'BHP',
    company: 'BHP Group',
    signal: 'STRONG_BUY',
    confidence: 91,
    expected: '+4.8%',
    price: 46.32,
    change: +1.82,
  },
  {
    rank: 2,
    ticker: 'CBA',
    company: 'Commonwealth Bank',
    signal: 'STRONG_BUY',
    confidence: 87,
    expected: '+3.5%',
    price: 108.74,
    change: +2.31,
  },
  {
    rank: 3,
    ticker: 'CSL',
    company: 'CSL Limited',
    signal: 'BUY',
    confidence: 78,
    expected: '+2.2%',
    price: 294.5,
    change: +1.14,
  },
  {
    rank: 4,
    ticker: 'WBC',
    company: 'Westpac Banking',
    signal: 'BUY',
    confidence: 74,
    expected: '+1.8%',
    price: 25.87,
    change: +0.92,
  },
  {
    rank: 5,
    ticker: 'ANZ',
    company: 'ANZ Group',
    signal: 'BUY',
    confidence: 71,
    expected: '+1.5%',
    price: 28.42,
    change: +0.65,
  },
  {
    rank: 6,
    ticker: 'NAB',
    company: 'National Australia Bank',
    signal: 'HOLD',
    confidence: 52,
    expected: '+0.2%',
    price: 35.1,
    change: -0.18,
  },
  {
    rank: 7,
    ticker: 'WES',
    company: 'Wesfarmers',
    signal: 'HOLD',
    confidence: 48,
    expected: '-0.1%',
    price: 62.45,
    change: -0.42,
  },
  {
    rank: 8,
    ticker: 'TLS',
    company: 'Telstra Group',
    signal: 'SELL',
    confidence: 72,
    expected: '-2.4%',
    price: 4.12,
    change: -1.21,
  },
  {
    rank: 9,
    ticker: 'FMG',
    company: 'Fortescue Metals',
    signal: 'SELL',
    confidence: 68,
    expected: '-1.9%',
    price: 18.9,
    change: -2.15,
  },
  {
    rank: 10,
    ticker: 'STO',
    company: 'Santos Ltd',
    signal: 'STRONG_SELL',
    confidence: 83,
    expected: '-3.7%',
    price: 7.24,
    change: -3.42,
  },
];

const holdings = [
  {
    ticker: 'BHP',
    company: 'BHP Group',
    shares: 200,
    avgCost: 43.5,
    current: 46.32,
    signal: 'STRONG_BUY',
    weight: 14.2,
  },
  {
    ticker: 'CBA',
    company: 'Commonwealth Bank',
    shares: 50,
    avgCost: 98.2,
    current: 108.74,
    signal: 'STRONG_BUY',
    weight: 8.3,
  },
  {
    ticker: 'CSL',
    company: 'CSL Limited',
    shares: 20,
    avgCost: 280.0,
    current: 294.5,
    signal: 'BUY',
    weight: 9.0,
  },
  {
    ticker: 'WBC',
    company: 'Westpac Banking',
    shares: 300,
    avgCost: 24.1,
    current: 25.87,
    signal: 'BUY',
    weight: 11.9,
  },
  {
    ticker: 'MQG',
    company: 'Macquarie Group',
    shares: 15,
    avgCost: 185.4,
    current: 192.8,
    signal: 'HOLD',
    weight: 4.4,
  },
  {
    ticker: 'WES',
    company: 'Wesfarmers',
    shares: 40,
    avgCost: 58.7,
    current: 62.45,
    signal: 'HOLD',
    weight: 3.8,
  },
  {
    ticker: 'TLS',
    company: 'Telstra Group',
    shares: 500,
    avgCost: 4.35,
    current: 4.12,
    signal: 'SELL',
    weight: 3.2,
  },
];

const shapFeatures = [
  { name: 'Momentum (14d)', value: +0.34 },
  { name: 'RSI', value: +0.22 },
  { name: 'Volume Ratio', value: +0.18 },
  { name: 'MA Cross', value: +0.12 },
  { name: 'Volatility', value: -0.08 },
  { name: 'Sector Sentiment', value: -0.05 },
  { name: 'Trend Strength', value: +0.15 },
];

/* ---------- THEMED HELPER COMPONENTS ---------- */

function SignalPill({ signal }: { signal: string }) {
  const t = useTheme();
  const config: Record<string, { bg: string; text: string; label: string }> = {
    STRONG_BUY: { bg: t.strongBuyBg, text: t.strongBuyText, label: 'Strong Buy' },
    BUY: { bg: t.buyBg, text: t.buyText, label: 'Buy' },
    HOLD: { bg: t.holdBg, text: t.holdText, label: 'Hold' },
    SELL: { bg: t.sellBg, text: t.sellText, label: 'Sell' },
    STRONG_SELL: { bg: t.strongSellBg, text: t.strongSellText, label: 'Strong Sell' },
  };
  const c = config[signal] || config.HOLD;
  const retro = t.mode === 'retro';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold ${c.bg} ${c.text} ${retro ? 'border border-current/20 font-mono uppercase tracking-wider' : 'rounded-md font-semibold'}`}
    >
      {c.label}
    </span>
  );
}

function MetricBox({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
}) {
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <div
      className={`p-4 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
    >
      <div
        className={`text-[11px] font-medium ${t.textMuted} mb-1.5 ${retro ? 'uppercase tracking-wider font-mono' : ''}`}
      >
        {label}
      </div>
      <div
        className={`text-xl font-bold ${t.numericFont} tabular-nums ${positive === true ? t.positive : positive === false ? t.negative : t.textPrimary}`}
      >
        {value}
      </div>
      {sub && <div className={`text-[10px] ${t.textDim} mt-1 ${t.numericFont}`}>{sub}</div>}
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  const t = useTheme();
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 text-sm ${active ? `${t.sidebarActive} ${t.sidebarActiveText} font-semibold` : `${t.sidebarItem} ${t.sidebarItemHover}`} ${t.mode === 'retro' ? '' : 'rounded-lg'}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const t = useTheme();
  const color =
    value >= 80 ? t.barHigh : value >= 60 ? t.barMid : value >= 40 ? t.barLow : t.barDanger;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-14 h-1.5 ${t.barTrack} ${t.mode === 'retro' ? '' : 'rounded-full'}`}>
        <div
          className={`h-1.5 ${color} ${t.mode === 'retro' ? '' : 'rounded-full'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${t.textSecondary} ${t.numericFont}`}>
        {value}%
      </span>
    </div>
  );
}

function MiniChart({ data, positive }: { data: number[]; positive: boolean }) {
  const t = useTheme();
  const max = Math.max(...data);
  const retro = t.mode === 'retro';
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className={`w-1 ${retro ? '' : 'rounded-t-sm'} ${positive ? (retro ? 'bg-[#006400]/50' : 'bg-emerald-500/60') : retro ? 'bg-[#CD3333]/50' : 'bg-red-500/60'}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

/* ---------- WIREFRAME SECTION WRAPPER ---------- */

function WireframeSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <section className="mb-24">
      <div className="mb-8">
        <h2
          className={`text-2xl sm:text-3xl font-bold ${t.titleText} mb-3 ${retro ? 'font-mono' : ''}`}
        >
          {title}
        </h2>
        <p className={`text-sm max-w-2xl ${t.subtitleText}`}>{description}</p>
      </div>
      <div
        className={`border-2 ${t.frameBg} ${t.frameBorder} ${t.frameShadow} overflow-hidden ${retro ? 'shadow-[4px_4px_0px_#B8A88A]' : 'rounded-2xl'}`}
      >
        {children}
      </div>
    </section>
  );
}

/* ---------- MOCK SIDEBAR ---------- */

function MockSidebar({ activePage }: { activePage: string }) {
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <div
      className={`w-56 flex-shrink-0 border-r-2 ${t.sidebarBorder} ${t.sidebarBg} p-4 hidden lg:block`}
    >
      <div className="flex items-center gap-2.5 mb-8 px-1">
        <div
          className={`flex items-center justify-center h-8 w-8 ${t.sidebarLogo} ${retro ? '' : 'rounded-lg'}`}
        >
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className={`text-sm font-bold ${t.textPrimary} ${retro ? 'font-mono' : ''}`}>
          {retro ? 'ASX PORTFOLIO OS' : 'ASX Portfolio OS'}
        </span>
      </div>
      <div className="space-y-1 mb-8">
        <div
          className={`px-3 py-1.5 text-[10px] font-semibold ${t.sidebarLabel} uppercase tracking-wider ${retro ? 'font-mono border-b border-dashed border-[#C4B998] pb-2 mb-2' : ''}`}
        >
          Main
        </div>
        <SidebarItem
          icon={Home}
          label={retro ? 'DASHBOARD' : 'Dashboard'}
          active={activePage === 'dashboard'}
        />
        <SidebarItem
          icon={BarChart3}
          label={retro ? 'STOCKS' : 'Stocks'}
          active={activePage === 'stocks'}
        />
        <SidebarItem
          icon={PieChart}
          label={retro ? 'PORTFOLIO' : 'Portfolio'}
          active={activePage === 'portfolio'}
        />
        <SidebarItem
          icon={Star}
          label={retro ? 'WATCHLIST' : 'Watchlist'}
          active={activePage === 'watchlist'}
        />
      </div>
      <div className="space-y-1 mb-8">
        <div
          className={`px-3 py-1.5 text-[10px] font-semibold ${t.sidebarLabel} uppercase tracking-wider ${retro ? 'font-mono border-b border-dashed border-[#C4B998] pb-2 mb-2' : ''}`}
        >
          Intelligence
        </div>
        <SidebarItem
          icon={Brain}
          label={retro ? 'MODELS' : 'Models'}
          active={activePage === 'models'}
        />
        <SidebarItem
          icon={Layers}
          label={retro ? 'FUSION' : 'Fusion'}
          active={activePage === 'fusion'}
        />
        <SidebarItem
          icon={Target}
          label={retro ? 'INSIGHTS' : 'Insights'}
          active={activePage === 'insights'}
        />
        <SidebarItem
          icon={Activity}
          label={retro ? 'DRIFT' : 'Drift Monitor'}
          active={activePage === 'drift'}
        />
      </div>
      <div className="space-y-1">
        <div
          className={`px-3 py-1.5 text-[10px] font-semibold ${t.sidebarLabel} uppercase tracking-wider ${retro ? 'font-mono border-b border-dashed border-[#C4B998] pb-2 mb-2' : ''}`}
        >
          System
        </div>
        <SidebarItem icon={Bell} label={retro ? 'ALERTS' : 'Alerts'} />
        <SidebarItem icon={Settings} label={retro ? 'SETTINGS' : 'Settings'} />
      </div>
    </div>
  );
}

/* ---------- MOCK TOP BAR ---------- */

function MockTopBar({ title, breadcrumb }: { title: string; breadcrumb?: string[] }) {
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <div
      className={`flex items-center justify-between border-b-2 ${t.topbarBorder} px-6 py-4 ${t.topbarBg}`}
    >
      <div>
        {breadcrumb && (
          <div
            className={`flex items-center gap-1.5 text-[11px] ${t.topbarBreadcrumb} mb-0.5 ${retro ? 'font-mono' : ''}`}
          >
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>{retro ? ' > ' : '/'}</span>}
                <span className={i === breadcrumb.length - 1 ? t.textMuted : ''}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className={`text-lg font-bold ${t.topbarTitle} ${retro ? 'font-mono uppercase' : ''}`}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 ${t.topbarSearchBg} border ${t.topbarSearchBorder} ${retro ? 'border-2' : 'rounded-lg'}`}
        >
          <Search className={`h-3.5 w-3.5 ${t.topbarSearchText}`} />
          <span className={`text-xs ${t.topbarSearchText} ${retro ? 'font-mono' : ''}`}>
            Search stocks...
          </span>
          {!retro && (
            <span className="text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">
              /
            </span>
          )}
        </div>
        <button className={`relative p-2 ${t.textMuted}`}>
          <Bell className="h-4 w-4" />
          <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${t.notifDot}`} />
        </button>
        <div
          className={`w-8 h-8 flex items-center justify-center text-xs font-bold ${t.topbarAvatar} ${retro ? '' : 'rounded-full'}`}
        >
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
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <WireframeSection
      title="Dashboard"
      description="The primary command center — live signal rankings, market stats, and at-a-glance portfolio health. Updates in real-time via SWR polling."
    >
      <div className="flex min-h-[700px]">
        <MockSidebar activePage="dashboard" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Dashboard" breadcrumb={['Home', 'Dashboard']} />
          <div className={`flex-1 p-6 space-y-6 overflow-y-auto ${retro ? 'bg-[#F5F0E1]' : ''}`}>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBox label="Total Stocks" value="187" sub="ASX listed" />
              <MetricBox
                label="Strong Buys"
                value="24"
                sub="Above 80% confidence"
                positive={true}
              />
              <MetricBox label="Avg Confidence" value="72%" sub="Across all signals" />
              <MetricBox
                label="Model Accuracy"
                value="68.4%"
                sub="30-day rolling"
                positive={true}
              />
            </div>

            {/* Signal Distribution */}
            <div
              className={`p-4 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                >
                  Signal Distribution
                </span>
                <span className={`text-[11px] ${t.textMuted} ${retro ? 'font-mono' : ''}`}>
                  Updated 4:10 PM AEST
                </span>
              </div>
              <div className={`flex overflow-hidden h-3 ${retro ? '' : 'rounded-lg'}`}>
                <div
                  className={retro ? 'bg-[#006400]' : 'bg-emerald-500'}
                  style={{ width: '13%' }}
                />
                <div
                  className={retro ? 'bg-[#228B22]' : 'bg-emerald-400/70'}
                  style={{ width: '22%' }}
                />
                <div
                  className={retro ? 'bg-[#B8860B]' : 'bg-slate-500/70'}
                  style={{ width: '35%' }}
                />
                <div
                  className={retro ? 'bg-[#CD3333]/70' : 'bg-red-400/70'}
                  style={{ width: '20%' }}
                />
                <div className={retro ? 'bg-[#8B0000]' : 'bg-red-500'} style={{ width: '10%' }} />
              </div>
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                {[
                  {
                    label: 'Strong Buy',
                    color: retro ? 'bg-[#006400]' : 'bg-emerald-500',
                    count: 24,
                  },
                  { label: 'Buy', color: retro ? 'bg-[#228B22]' : 'bg-emerald-400/70', count: 41 },
                  { label: 'Hold', color: retro ? 'bg-[#B8860B]' : 'bg-slate-500/70', count: 66 },
                  { label: 'Sell', color: retro ? 'bg-[#CD3333]/70' : 'bg-red-400/70', count: 37 },
                  { label: 'Strong Sell', color: retro ? 'bg-[#8B0000]' : 'bg-red-500', count: 19 },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`flex items-center gap-1.5 text-[10px] ${t.textMuted} ${retro ? 'font-mono' : ''}`}
                  >
                    <div className={`w-2 h-2 ${s.color} ${retro ? '' : 'rounded-sm'}`} />
                    <span>{s.label}</span>
                    <span className={`font-bold ${t.textSecondary}`}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Signal Table */}
            <div
              className={`border overflow-hidden ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 border-b-2 ${t.cardBorder} ${retro ? 'bg-[#E8E0CE]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    {retro ? '>> LIVE SIGNALS' : 'Live Signals'}
                  </span>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 ${t.liveBadgeBg} ${t.liveBadgeText} ${retro ? 'font-mono border border-current/20' : 'rounded-md'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${t.liveDot} animate-pulse`} />
                    <span className="text-[10px] font-medium">Live</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[11px] ${t.btnBg} ${t.btnBorder} ${t.btnText} ${retro ? 'border-2 font-mono uppercase' : 'rounded-lg'}`}
                  >
                    <Filter className="h-3 w-3" /> Filters
                  </button>
                  <button
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[11px] ${t.btnBg} ${t.btnBorder} ${t.btnText} ${retro ? 'border-2 font-mono uppercase' : 'rounded-lg'}`}
                  >
                    <Download className="h-3 w-3" /> Export
                  </button>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr
                    className={`text-[11px] font-medium ${t.tableHeaderText} border-b-2 ${t.cardBorder} ${t.tableHeaderBg} ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    <th className="text-left px-4 py-2.5 w-10">#</th>
                    <th className="text-left px-4 py-2.5">Ticker</th>
                    <th className="text-left px-4 py-2.5 hidden lg:table-cell">Company</th>
                    <th className="text-left px-4 py-2.5">Signal</th>
                    <th className="text-right px-4 py-2.5">Conf.</th>
                    <th className="text-right px-4 py-2.5">Price</th>
                    <th className="text-right px-4 py-2.5 hidden md:table-cell">Change</th>
                    <th className="text-right px-4 py-2.5 hidden md:table-cell">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {signalRows.map((row) => (
                    <tr
                      key={row.ticker}
                      className={`border-b ${t.tableRowBorder} last:border-0 ${t.tableRowHover} transition-colors cursor-pointer`}
                    >
                      <td className={`px-4 py-3 text-xs ${t.textDim} font-medium ${t.numericFont}`}>
                        {row.rank}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold ${t.tickerText} ${retro ? 'font-mono underline' : ''}`}
                        >
                          {row.ticker}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${t.textMuted} hidden lg:table-cell`}>
                        {row.company}
                      </td>
                      <td className="px-4 py-3">
                        <SignalPill signal={row.signal} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ConfidenceBar value={row.confidence} />
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm tabular-nums ${t.textSecondary} ${t.numericFont}`}
                      >
                        ${row.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span
                          className={`text-xs font-semibold tabular-nums ${t.numericFont} ${row.change >= 0 ? t.positive : t.negative}`}
                        >
                          {row.change >= 0 ? '+' : ''}
                          {row.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span
                          className={`text-xs font-semibold tabular-nums ${t.numericFont} ${row.expected.startsWith('+') ? t.positive : t.negative}`}
                        >
                          {row.expected}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                className={`flex items-center justify-between px-4 py-3 border-t-2 ${t.cardBorder} ${retro ? 'bg-[#E8E0CE] font-mono' : ''}`}
              >
                <span className={`text-[11px] ${t.textMuted}`}>Showing 1-10 of 187 stocks</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, '...', 19].map((p, i) => (
                    <button
                      key={i}
                      className={`w-7 h-7 text-xs font-medium ${retro ? 'border border-[#C4B998]' : 'rounded-md'} ${p === 1 ? `${t.paginationActive} ${t.paginationActiveText}` : `${t.textMuted} ${t.tableRowHover}`}`}
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
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <WireframeSection
      title="Stock Detail"
      description="Deep-dive view for individual stocks — price chart, AI signal with SHAP explainability, technical indicators, and historical signal accuracy."
    >
      <div className="flex min-h-[750px]">
        <MockSidebar activePage="stocks" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="BHP Group" breadcrumb={['Stocks', 'BHP.AX']} />
          <div className={`flex-1 p-6 space-y-6 overflow-y-auto ${retro ? 'bg-[#F5F0E1]' : ''}`}>
            {/* Stock Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2
                    className={`text-2xl font-bold tabular-nums ${t.textPrimary} ${t.numericFont}`}
                  >
                    $46.32
                  </h2>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 text-sm font-semibold ${t.positiveBg} ${t.positive} ${retro ? 'font-mono border border-current/20' : 'rounded-md'}`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span className="tabular-nums">+$0.83 (+1.82%)</span>
                  </div>
                </div>
                <p className={`text-sm ${t.textMuted}`}>
                  BHP Group Limited &middot; ASX &middot; Materials
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SignalPill signal="STRONG_BUY" />
                <span
                  className={`text-sm font-semibold tabular-nums ${t.textSecondary} ${t.numericFont}`}
                >
                  91% confidence
                </span>
                <button className={`p-2 ${t.textMuted}`}>
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chart */}
            <div
              className={`p-4 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
                    <button
                      key={tf}
                      className={`px-3 py-1.5 text-xs font-medium ${retro ? 'font-mono border' : 'rounded-md'} ${tf === '3M' ? `${t.btnActiveBg} ${t.btnActiveText} ${retro ? 'border-[#008080] border-2' : ''}` : `${t.textMuted} ${retro ? 'border-transparent' : ''} ${t.tableRowHover}`}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`relative h-48 border overflow-hidden ${retro ? 'border-2 border-[#C4B998] bg-[#FFFEF6]' : 'rounded-lg border-white/[0.04] bg-gradient-to-b from-indigo-500/5 to-transparent'}`}
              >
                <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                  {[40, 80, 120, 160].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="500"
                      y2={y}
                      stroke={t.chartGrid}
                      strokeWidth="1"
                    />
                  ))}
                  <polyline
                    points="0,160 30,155 60,140 90,145 120,130 150,110 180,120 210,100 240,95 270,80 300,85 330,70 360,65 390,55 420,60 450,45 480,40 500,35"
                    fill="none"
                    stroke={t.chartLine}
                    strokeWidth={retro ? 3 : 2}
                  />
                  <polygon
                    points="0,160 30,155 60,140 90,145 120,130 150,110 180,120 210,100 240,95 270,80 300,85 330,70 360,65 390,55 420,60 450,45 480,40 500,35 500,200 0,200"
                    fill={`url(#chartGrad-${t.mode})`}
                  />
                  <defs>
                    <linearGradient id={`chartGrad-${t.mode}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.chartFillFrom} />
                      <stop offset="100%" stopColor={t.chartFillTo} />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="270"
                    cy="80"
                    r="4"
                    fill={retro ? '#006400' : '#10b981'}
                    stroke={t.chartMarkerStroke}
                    strokeWidth="2"
                  />
                  <circle
                    cx="150"
                    cy="110"
                    r="4"
                    fill={t.chartLine}
                    stroke={t.chartMarkerStroke}
                    strokeWidth="2"
                  />
                </svg>
                <div
                  className={`absolute right-2 top-2 text-[10px] tabular-nums ${t.textDim} ${t.numericFont}`}
                >
                  $48.00
                </div>
                <div
                  className={`absolute right-2 bottom-2 text-[10px] tabular-nums ${t.textDim} ${t.numericFont}`}
                >
                  $42.00
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SHAP Panel */}
              <div
                className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Brain className={`h-4 w-4 ${t.accentText}`} />
                  <h3
                    className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    SHAP Feature Impact
                  </h3>
                </div>
                <div className="space-y-3">
                  {shapFeatures.map((f) => {
                    const maxVal = 0.4;
                    const width = (Math.abs(f.value) / maxVal) * 100;
                    const posBar = retro ? 'bg-[#006400]/50' : 'bg-emerald-500/40';
                    const negBar = retro ? 'bg-[#CD3333]/50' : 'bg-red-500/40';
                    return (
                      <div key={f.name} className="flex items-center gap-3">
                        <span
                          className={`text-xs w-28 flex-shrink-0 text-right ${t.textMuted} ${retro ? 'font-mono' : ''}`}
                        >
                          {f.name}
                        </span>
                        <div className="flex-1 flex items-center">
                          {f.value < 0 ? (
                            <div className="flex-1 flex justify-end">
                              <div
                                className={`${negBar} h-4 ${retro ? '' : 'rounded-l-sm'}`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <div
                                className={`${posBar} h-4 ${retro ? '' : 'rounded-r-sm'}`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold tabular-nums w-10 ${t.numericFont} ${f.value >= 0 ? t.positive : t.negative}`}
                        >
                          {f.value >= 0 ? '+' : ''}
                          {f.value.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div
                  className={`mt-4 pt-3 border-t ${retro ? 'border-dashed border-[#C4B998]' : 'border-white/[0.06]'} flex items-center justify-between text-[10px] ${t.textDim} ${retro ? 'font-mono' : ''}`}
                >
                  <span>Model: LightGBM v1.1 &middot; Split 5/5</span>
                  <span>Base: 0.50</span>
                </div>
              </div>

              {/* Key Metrics + Signal History */}
              <div className="space-y-4">
                <div
                  className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
                >
                  <h3
                    className={`text-sm font-semibold ${t.textPrimary} mb-4 ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Key Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Market Cap', value: '$236.4B' },
                      { label: 'P/E Ratio', value: '12.8' },
                      { label: 'Div Yield', value: '5.2%' },
                      { label: '52w Range', value: '$38.12 - $49.80' },
                      { label: 'Avg Volume', value: '12.4M' },
                      { label: 'Sector', value: 'Materials' },
                    ].map((m) => (
                      <div key={m.label}>
                        <div
                          className={`text-[10px] ${t.textDim} mb-0.5 ${retro ? 'font-mono uppercase' : ''}`}
                        >
                          {m.label}
                        </div>
                        <div
                          className={`text-sm font-semibold ${t.textSecondary} ${t.numericFont}`}
                        >
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
                >
                  <h3
                    className={`text-sm font-semibold ${t.textPrimary} mb-3 ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Signal History (30d)
                  </h3>
                  <div className="space-y-2">
                    {[
                      { date: 'Feb 7', signal: 'STRONG_BUY', conf: 91 },
                      { date: 'Feb 6', signal: 'STRONG_BUY', conf: 88 },
                      { date: 'Feb 5', signal: 'BUY', conf: 76 },
                      { date: 'Feb 4', signal: 'BUY', conf: 72 },
                      { date: 'Feb 3', signal: 'HOLD', conf: 54 },
                    ].map((h, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between py-1.5 ${retro ? 'border-b border-dashed border-[#E0D8C4] last:border-0' : ''}`}
                      >
                        <span className={`text-xs ${t.textMuted} w-14 ${t.numericFont}`}>
                          {h.date}
                        </span>
                        <SignalPill signal={h.signal} />
                        <span className={`text-xs tabular-nums ${t.textMuted} ${t.numericFont}`}>
                          {h.conf}%
                        </span>
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
  const t = useTheme();
  const retro = t.mode === 'retro';
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
          <div className={`flex-1 p-6 space-y-6 overflow-y-auto ${retro ? 'bg-[#F5F0E1]' : ''}`}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricBox label="Total Value" value={`$${(totalValue / 1000).toFixed(1)}K`} />
              <MetricBox
                label="Total P&L"
                value={`+$${(totalPL / 1000).toFixed(1)}K`}
                sub={`+${totalPLPct.toFixed(1)}%`}
                positive={totalPL >= 0}
              />
              <MetricBox label="Sharpe Ratio" value="1.42" sub="Annualized" positive={true} />
              <MetricBox label="Max Drawdown" value="-8.3%" sub="12 months" positive={false} />
              <MetricBox label="Holdings" value={`${holdings.length}`} sub="Active positions" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut */}
              <div
                className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
              >
                <h3
                  className={`text-sm font-semibold ${t.textPrimary} mb-4 ${retro ? 'font-mono uppercase' : ''}`}
                >
                  Sector Allocation
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={t.donut1}
                        strokeWidth="12"
                        strokeDasharray="75.4 176"
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={t.donut2}
                        strokeWidth="12"
                        strokeDasharray="50.3 201"
                        strokeDashoffset="-75.4"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={t.donut3}
                        strokeWidth="12"
                        strokeDasharray="37.7 213.6"
                        strokeDashoffset="-125.7"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={t.donut4}
                        strokeWidth="12"
                        strokeDasharray="25.1 226.2"
                        strokeDashoffset="-163.4"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={t.donut5}
                        strokeWidth="12"
                        strokeDasharray="62.8 188.5"
                        strokeDashoffset="-188.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className={`text-lg font-bold tabular-nums ${t.textPrimary} ${t.numericFont}`}
                        >
                          7
                        </div>
                        <div className={`text-[10px] ${t.textMuted} ${retro ? 'font-mono' : ''}`}>
                          Holdings
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { sector: 'Financials', pct: '34%', color: t.donut1 },
                    { sector: 'Materials', pct: '23%', color: t.donut2 },
                    { sector: 'Healthcare', pct: '15%', color: t.donut3 },
                    { sector: 'Consumer', pct: '10%', color: t.donut4 },
                    { sector: 'Telecom', pct: '18%', color: t.donut5 },
                  ].map((s) => (
                    <div key={s.sector} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 ${retro ? '' : 'rounded-sm'}`}
                          style={{ backgroundColor: s.color }}
                        />
                        <span className={`text-xs ${t.textMuted}`}>{s.sector}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${t.textSecondary} tabular-nums ${t.numericFont}`}
                      >
                        {s.pct}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holdings Table */}
              <div
                className={`lg:col-span-2 border overflow-hidden ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
              >
                <div
                  className={`flex items-center justify-between px-4 py-3 border-b-2 ${t.cardBorder} ${retro ? 'bg-[#E8E0CE]' : ''}`}
                >
                  <span
                    className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Holdings
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium ${t.accentSubtle} ${t.accentText} ${retro ? 'font-mono border-2 border-[#008080]/30 uppercase' : 'rounded-lg'}`}
                    >
                      <Plus className="h-3 w-3" /> Upload CSV
                    </button>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr
                      className={`text-[11px] font-medium ${t.tableHeaderText} border-b-2 ${t.cardBorder} ${t.tableHeaderBg} ${retro ? 'font-mono uppercase' : ''}`}
                    >
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
                        <tr
                          key={h.ticker}
                          className={`border-b ${t.tableRowBorder} last:border-0 ${t.tableRowHover} transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`text-sm font-bold ${t.tickerText} ${retro ? 'font-mono underline' : ''}`}
                            >
                              {h.ticker}
                            </span>
                            <div className={`text-[10px] ${t.textDim}`}>{h.company}</div>
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm tabular-nums ${t.textMuted} ${t.numericFont}`}
                          >
                            {h.shares}
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm tabular-nums ${t.textSecondary} ${t.numericFont}`}
                          >
                            ${h.current.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={`text-xs font-semibold tabular-nums ${t.numericFont} ${pl >= 0 ? t.positive : t.negative}`}
                            >
                              {pl >= 0 ? '+' : ''}
                              {pl.toFixed(0)}
                            </div>
                            <div
                              className={`text-[10px] tabular-nums ${t.numericFont} ${pl >= 0 ? t.positive : t.negative} opacity-60`}
                            >
                              {plPct >= 0 ? '+' : ''}
                              {plPct.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <SignalPill signal={h.signal} />
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-xs tabular-nums ${t.textMuted} ${t.numericFont}`}
                          >
                            {h.weight}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rebalancing */}
            <div
              className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className={`h-4 w-4 ${t.accentText}`} />
                <h3
                  className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                >
                  AI Rebalancing Suggestions
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    action: 'Increase',
                    ticker: 'BHP',
                    reason:
                      'Strong Buy signal with 91% confidence. Currently underweight vs. sector average.',
                    bg: t.suggestIncreaseBg,
                    border: t.suggestIncreaseBorder,
                    text: t.suggestIncreaseText,
                  },
                  {
                    action: 'Reduce',
                    ticker: 'TLS',
                    reason:
                      'Sell signal with declining momentum. Consider trimming position to reduce drag.',
                    bg: t.suggestReduceBg,
                    border: t.suggestReduceBorder,
                    text: t.suggestReduceText,
                  },
                  {
                    action: 'Diversify',
                    ticker: 'Healthcare',
                    reason:
                      'Sector underrepresented. Consider adding CSL or RMD for better diversification.',
                    bg: t.suggestDiversifyBg,
                    border: t.suggestDiversifyBorder,
                    text: t.suggestDiversifyText,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`border p-4 ${s.bg} ${s.border} ${retro ? 'border-2' : 'rounded-lg'}`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${s.text} ${retro ? 'font-mono uppercase' : ''}`}
                    >
                      {s.action} &middot; {s.ticker}
                    </div>
                    <p className={`text-[11px] ${t.textMuted} leading-relaxed`}>{s.reason}</p>
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
   4. MODELS WIREFRAME
   ============================================================= */

function ModelsWireframe() {
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <WireframeSection
      title="Models & ML Pipeline"
      description="Monitor model health, accuracy metrics, drift detection, and feature importance across all deployed models."
    >
      <div className="flex min-h-[700px]">
        <MockSidebar activePage="models" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Models" breadcrumb={['Intelligence', 'Models']} />
          <div className={`flex-1 p-6 space-y-6 overflow-y-auto ${retro ? 'bg-[#F5F0E1]' : ''}`}>
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
                  lastTrain: '1 day ago',
                  driftStatus: 'warning',
                },
              ].map((model) => (
                <div
                  key={model.name}
                  className={`p-5 border cursor-pointer ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2 hover:bg-[#F5F0E1]' : 'rounded-xl hover:border-white/[0.1]'} transition-colors`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3
                        className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono' : ''}`}
                      >
                        {model.name}
                      </h3>
                      <span className={`text-[10px] ${t.textMuted} ${retro ? 'font-mono' : ''}`}>
                        {model.type}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium ${retro ? 'font-mono border border-current/20' : 'rounded-md'} ${model.status === 'healthy' ? `${t.statusHealthyBg} ${t.statusHealthyText}` : `${t.statusWarningBg} ${t.statusWarningText}`}`}
                    >
                      {model.status === 'healthy' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {retro ? model.status.toUpperCase() : model.status}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Accuracy', val: model.accuracy },
                      { label: 'Precision', val: model.precision },
                      { label: 'F1 Score', val: model.f1 },
                    ].map((m) => (
                      <div key={m.label}>
                        <div
                          className={`text-[10px] ${t.textDim} ${retro ? 'font-mono uppercase' : ''}`}
                        >
                          {m.label}
                        </div>
                        <div
                          className={`text-lg font-bold tabular-nums ${t.textPrimary} ${t.numericFont}`}
                        >
                          {m.val}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <MiniChart
                      data={[58, 62, 60, 65, 64, 68, 67, 70, 68, 72, 69, 68]}
                      positive={true}
                    />
                  </div>
                  <div
                    className={`flex items-center justify-between pt-3 border-t ${retro ? 'border-dashed border-[#C4B998]' : 'border-white/[0.06]'}`}
                  >
                    <span className={`text-[10px] ${t.textDim} ${retro ? 'font-mono' : ''}`}>
                      Trained {model.lastTrain}
                    </span>
                    <div
                      className={`flex items-center gap-1 text-[10px] font-medium ${retro ? 'font-mono' : ''} ${model.driftStatus === 'stable' ? t.statusHealthyText : t.statusWarningText}`}
                    >
                      <Activity className="h-3 w-3" />
                      Drift: {retro ? model.driftStatus.toUpperCase() : model.driftStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Importance */}
            <div
              className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Layers className={`h-4 w-4 ${t.accentText}`} />
                  <h3
                    className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Global Feature Importance
                  </h3>
                </div>
                <span className={`text-[11px] ${t.textMuted} ${retro ? 'font-mono' : ''}`}>
                  LightGBM v1.1
                </span>
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
                    <span
                      className={`text-xs w-32 flex-shrink-0 text-right ${t.textMuted} ${retro ? 'font-mono' : ''}`}
                    >
                      {f.name}
                    </span>
                    <div className={`flex-1 h-2 ${t.barTrack} ${retro ? '' : 'rounded-full'}`}>
                      <div
                        className={`h-2 ${t.importanceBar} ${retro ? '' : 'rounded-full'}`}
                        style={{ width: `${(f.importance / 0.3) * 100}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums w-10 ${t.textMuted} ${t.numericFont}`}
                    >
                      {(f.importance * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Drift Monitor */}
            <div
              className={`p-5 border ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2' : 'rounded-xl'}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`h-4 w-4 ${t.accentText}`} />
                <h3
                  className={`text-sm font-semibold ${t.textPrimary} ${retro ? 'font-mono uppercase' : ''}`}
                >
                  Drift Monitor
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { feature: 'Momentum (14d)', psi: 0.04, status: 'stable' },
                  { feature: 'RSI (14)', psi: 0.08, status: 'stable' },
                  { feature: 'Volume Ratio', psi: 0.18, status: 'warning' },
                  { feature: 'Volatility (21d)', psi: 0.06, status: 'stable' },
                ].map((d) => (
                  <div
                    key={d.feature}
                    className={`border p-3 ${retro ? 'border-2' : 'rounded-lg'} ${d.status === 'stable' ? t.driftStableBorder : `${t.driftWarningBg} ${t.driftWarningBorder}`}`}
                  >
                    <div className={`text-[10px] ${t.textMuted} mb-1 ${retro ? 'font-mono' : ''}`}>
                      {d.feature}
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold tabular-nums ${t.textPrimary} ${t.numericFont}`}
                      >
                        {d.psi.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${retro ? 'font-mono' : ''} ${d.status === 'stable' ? t.statusHealthyText : t.statusWarningText}`}
                      >
                        {retro ? d.status.toUpperCase() : d.status}
                      </span>
                    </div>
                    <div className={`text-[9px] ${t.textDim} mt-0.5 ${retro ? 'font-mono' : ''}`}>
                      PSI threshold: 0.15
                    </div>
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
  const t = useTheme();
  const retro = t.mode === 'retro';
  return (
    <WireframeSection
      title="Stocks Browser"
      description="Browse, filter, and sort all 200+ ASX stocks with real-time signal overlays, sector grouping, and quick-add to watchlist."
    >
      <div className="flex min-h-[650px]">
        <MockSidebar activePage="stocks" />
        <div className="flex-1 flex flex-col">
          <MockTopBar title="Stocks" breadcrumb={['Home', 'Stocks']} />
          <div className={`flex-1 p-6 space-y-5 overflow-y-auto ${retro ? 'bg-[#F5F0E1]' : ''}`}>
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div
                className={`flex-1 flex items-center gap-2 px-3 py-2 border ${t.topbarSearchBg} ${t.topbarSearchBorder} ${retro ? 'border-2' : 'rounded-lg'}`}
              >
                <Search className={`h-4 w-4 ${t.topbarSearchText}`} />
                <span className={`text-sm ${t.topbarSearchText} ${retro ? 'font-mono' : ''}`}>
                  Search by ticker or company name...
                </span>
              </div>
              <div className="flex items-center gap-2">
                {['Signal', 'Sector', 'Confidence'].map((f) => (
                  <button
                    key={f}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs border ${t.btnBg} ${t.btnBorder} ${t.btnText} ${retro ? 'border-2 font-mono uppercase' : 'rounded-lg'}`}
                  >
                    {f} <ChevronDown className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] ${t.textMuted} ${retro ? 'font-mono' : ''}`}>
                Active filters:
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${t.chipBg} ${t.chipText} ${retro ? 'font-mono border-2 border-current/20' : 'rounded-md'}`}
              >
                Strong Buy + Buy <XCircle className="h-3 w-3 cursor-pointer" />
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${t.accentSubtle} ${t.accentText} ${retro ? 'font-mono border-2 border-current/20' : 'rounded-md'}`}
              >
                Confidence &gt; 70% <XCircle className="h-3 w-3 cursor-pointer" />
              </span>
              <button className={`text-[11px] ${t.textDim} ${retro ? 'font-mono underline' : ''}`}>
                Clear all
              </button>
            </div>

            {/* Stock Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signalRows.slice(0, 6).map((stock) => (
                <div
                  key={stock.ticker}
                  className={`p-4 border group cursor-pointer ${t.cardBg} ${t.cardBorder} ${t.cardShadow} ${retro ? 'border-2 hover:bg-[#F5F0E1]' : 'rounded-xl hover:border-white/[0.1]'} transition-colors`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${t.tickerText} ${retro ? 'font-mono underline' : ''}`}
                        >
                          {stock.ticker}
                        </span>
                        <SignalPill signal={stock.signal} />
                      </div>
                      <span className={`text-[11px] ${t.textMuted}`}>{stock.company}</span>
                    </div>
                    <button
                      className={`p-1.5 ${t.textDim} opacity-0 group-hover:opacity-100 transition-all`}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div
                        className={`text-xl font-bold tabular-nums ${t.textPrimary} ${t.numericFont}`}
                      >
                        ${stock.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs font-semibold tabular-nums ${t.numericFont} ${stock.change >= 0 ? t.positive : t.negative}`}
                      >
                        {stock.change >= 0 ? '+' : ''}
                        {stock.change.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <ConfidenceBar value={stock.confidence} />
                      <div
                        className={`text-[10px] font-medium mt-1 ${t.numericFont} ${stock.expected.startsWith('+') ? t.positive : t.negative} opacity-70`}
                      >
                        Expected: {stock.expected}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mt-3 pt-3 border-t ${retro ? 'border-dashed border-[#E0D8C4]' : 'border-white/[0.04]'}`}
                  >
                    <MiniChart
                      data={[45, 48, 46, 50, 52, 49, 55, 53, 58, 56, 60, 58, 62, 60, 65]}
                      positive={stock.change >= 0}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-center pt-4`}>
              <span className={`text-sm ${t.textMuted} ${retro ? 'font-mono' : ''}`}>
                Showing 6 of 65 matching stocks
              </span>
            </div>
          </div>
        </div>
      </div>
    </WireframeSection>
  );
}

/* =============================================================
   MAIN PAGE
   ============================================================= */

export default function WireframesPage() {
  const [currentView, setCurrentView] = useState<string>('all');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  const theme = themeMode === 'dark' ? darkTheme : retroTheme;
  const retro = themeMode === 'retro';

  const views = [
    { id: 'all', label: 'All Screens' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'stock-detail', label: 'Stock Detail' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'models', label: 'Models' },
    { id: 'stocks', label: 'Stocks Browse' },
  ];

  return (
    <ThemeContext.Provider value={theme}>
      <div
        className={`min-h-screen ${theme.pageBg} ${theme.pageText} transition-colors duration-300`}
      >
        {/* Header */}
        <div
          className={`border-b-2 ${retro ? 'border-[#C4B998] bg-[#E8E0CE]' : 'border-white/[0.06]'}`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div
                    className={`flex items-center justify-center h-9 w-9 ${retro ? 'bg-[#008080]' : 'rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow'}`}
                  >
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-xl font-bold tracking-tight ${retro ? 'font-mono' : ''}`}>
                    <span className={retro ? 'text-[#008080]' : 'text-indigo-400'}>ASX</span>
                    {retro ? ' PORTFOLIO OS' : ' Portfolio OS'}
                  </span>
                </Link>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${retro ? 'bg-[#008080]/10 border-2 border-[#008080]/30 text-[#008080] font-mono' : 'rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'}`}
                >
                  Wireframes
                </span>
              </div>
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <div
                  className={`flex items-center border ${retro ? 'border-2 border-[#C4B998]' : 'rounded-lg border-white/[0.1]'} overflow-hidden`}
                >
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${themeMode === 'dark' ? (retro ? '' : 'bg-indigo-500/15 text-indigo-400') : `${retro ? 'bg-[#E8E0CE] text-[#6B5D4A]' : 'text-slate-500 hover:text-slate-300'}`}`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Midnight
                  </button>
                  <button
                    onClick={() => setThemeMode('retro')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${retro ? 'font-mono' : ''} ${themeMode === 'retro' ? `${retro ? 'bg-[#008080]/15 text-[#006666] font-bold' : 'bg-indigo-500/15 text-indigo-400'}` : `${retro ? '' : 'text-slate-500 hover:text-slate-300'}`}`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    {retro ? "90'S RETRO" : "90's Retro"}
                  </button>
                </div>
                <Link
                  href="/"
                  className={`text-sm ${retro ? 'text-[#6B5D4A] hover:text-[#2C2416] font-mono underline' : 'text-slate-400 hover:text-white'} transition-colors`}
                >
                  {retro ? 'HOME' : 'Back to Home'}
                </Link>
                <Link
                  href="/app/dashboard"
                  className={`px-4 py-2 text-sm font-medium ${retro ? 'bg-[#008080] text-white font-mono uppercase border-2 border-[#006666] shadow-[2px_2px_0px_#006666] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]' : 'rounded-lg text-white bg-indigo-500/15 border border-indigo-500/25 hover:bg-indigo-500/25'} transition-all`}
                >
                  {retro ? 'OPEN APP' : 'Open App'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Title */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1
              className={`text-4xl sm:text-5xl font-bold tracking-tight ${theme.titleText} mb-4 ${retro ? 'font-mono' : ''}`}
            >
              {retro ? '>> HIGH-FIDELITY WIREFRAMES' : 'High-Fidelity Wireframes'}
            </h1>
            <p className={`text-lg ${theme.subtitleText} ${retro ? 'font-mono' : ''}`}>
              {retro
                ? "Detailed mockups rendered in the classic 90's terminal aesthetic. Warm tones, hard shadows, monospace type."
                : 'Detailed mockups of every key screen in the ASX Portfolio OS platform, rendered in the "Midnight Indigo" design system.'}
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setCurrentView(v.id)}
                className={`px-4 py-2 text-sm font-medium transition-all ${retro ? 'font-mono border-2 uppercase' : 'rounded-lg border'} ${
                  currentView === v.id
                    ? retro
                      ? 'bg-[#008080]/15 text-[#006666] border-[#008080]/30 font-bold'
                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                    : retro
                      ? `text-[#6B5D4A] border-transparent hover:bg-[#E8E0CE]`
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border-transparent'
                }`}
              >
                {retro ? v.label.toUpperCase() : v.label}
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
            <div
              className={`border-2 p-8 ${retro ? 'border-[#C4B998] bg-[#FFFEF6] shadow-[4px_4px_0px_#C4B998]' : 'rounded-2xl border-white/[0.08] bg-white/[0.02]'}`}
            >
              <h2
                className={`text-xl font-bold ${theme.titleText} mb-6 ${retro ? 'font-mono uppercase' : ''}`}
              >
                {retro ? '>> DESIGN SYSTEM: "90\'S RETRO"' : 'Design System: "Midnight Indigo"'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Colors */}
                <div>
                  <h3
                    className={`text-sm font-semibold ${theme.textSecondary} mb-4 ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Color Palette
                  </h3>
                  <div className="space-y-2">
                    {(retro
                      ? [
                          { name: 'Parchment', color: '#F5F0E1', hex: '#F5F0E1' },
                          { name: 'Warm White', color: '#FFFEF6', hex: '#FFFEF6' },
                          { name: 'Sand', color: '#E8E0CE', hex: '#E8E0CE' },
                          { name: 'Teal Primary', color: '#008080', hex: '#008080' },
                          { name: 'Dark Brown', color: '#2C2416', hex: '#2C2416' },
                          { name: 'Forest Green', color: '#006400', hex: '#006400' },
                          { name: 'Indian Red', color: '#CD3333', hex: '#CD3333' },
                          { name: 'Link Blue', color: '#0000EE', hex: '#0000EE' },
                        ]
                      : [
                          { name: 'Background', color: '#0B1121', hex: '#0B1121' },
                          { name: 'Surface', color: '#111827', hex: '#111827' },
                          { name: 'Elevated', color: '#1E293B', hex: '#1E293B' },
                          { name: 'Accent', color: '#818CF8', hex: '#818CF8' },
                          { name: 'Strong Buy', color: '#34D399', hex: '#34D399' },
                          { name: 'Sell', color: '#FCA5A5', hex: '#FCA5A5' },
                          { name: 'Warning', color: '#FBBF24', hex: '#FBBF24' },
                        ]
                    ).map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 border ${retro ? 'border-2 border-[#C4B998]' : 'rounded-md border-white/10'}`}
                          style={{ backgroundColor: c.color }}
                        />
                        <span className={`text-xs flex-1 ${theme.textMuted}`}>{c.name}</span>
                        <span
                          className={`text-[10px] ${theme.textDim} ${retro ? 'font-mono' : 'font-mono'}`}
                        >
                          {c.hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <h3
                    className={`text-sm font-semibold ${theme.textSecondary} mb-4 ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Typography
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div
                        className={`text-[10px] ${theme.textDim} mb-1 ${retro ? 'font-mono' : ''}`}
                      >
                        Font Family
                      </div>
                      {retro ? (
                        <>
                          <div className="text-sm font-mono text-[#2C2416]">
                            &quot;Courier New&quot;, Courier
                          </div>
                          <div className="text-sm font-mono text-[#6B5D4A]">
                            System monospace stack
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`text-sm ${theme.textSecondary}`}>Inter (sans-serif)</div>
                          <div className={`text-sm font-mono ${theme.textMuted}`}>
                            JetBrains Mono (code)
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <div
                        className={`text-[10px] ${theme.textDim} mb-1 ${retro ? 'font-mono' : ''}`}
                      >
                        Scale
                      </div>
                      <div
                        className={`text-2xl font-bold ${theme.textPrimary} ${retro ? 'font-mono' : ''}`}
                      >
                        Heading 2xl
                      </div>
                      <div
                        className={`text-lg font-semibold ${theme.textSecondary} ${retro ? 'font-mono' : ''}`}
                      >
                        Heading lg
                      </div>
                      <div className={`text-sm ${theme.textSecondary}`}>Body text sm</div>
                      <div className={`text-xs ${theme.textMuted}`}>Caption xs</div>
                    </div>
                    <div>
                      <div
                        className={`text-[10px] ${theme.textDim} mb-1 ${retro ? 'font-mono' : ''}`}
                      >
                        Numeric
                      </div>
                      <div
                        className={`text-lg tabular-nums font-semibold ${theme.textPrimary} ${retro ? 'font-mono' : ''}`}
                      >
                        $142,350.00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Components */}
                <div>
                  <h3
                    className={`text-sm font-semibold ${theme.textSecondary} mb-4 ${retro ? 'font-mono uppercase' : ''}`}
                  >
                    Components
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div
                        className={`text-[10px] ${theme.textDim} mb-2 ${retro ? 'font-mono' : ''}`}
                      >
                        Signal Badges
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <SignalPill signal="STRONG_BUY" />
                        <SignalPill signal="BUY" />
                        <SignalPill signal="HOLD" />
                        <SignalPill signal="SELL" />
                        <SignalPill signal="STRONG_SELL" />
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-[10px] ${theme.textDim} mb-2 ${retro ? 'font-mono' : ''}`}
                      >
                        Confidence Bars
                      </div>
                      <div className="space-y-1.5">
                        <ConfidenceBar value={91} />
                        <ConfidenceBar value={72} />
                        <ConfidenceBar value={48} />
                        <ConfidenceBar value={25} />
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-[10px] ${theme.textDim} mb-2 ${retro ? 'font-mono' : ''}`}
                      >
                        {retro ? 'DESIGN CUES' : 'Borders & Radius'}
                      </div>
                      <div className={`text-xs ${theme.textMuted} ${retro ? 'font-mono' : ''}`}>
                        {retro
                          ? 'Hard shadows, 2px borders, no rounded corners, dashed separators, monospace type'
                          : 'Cards: 0.75rem (xl) · Badges: 0.375rem (md) · Buttons: 0.5rem (lg)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
