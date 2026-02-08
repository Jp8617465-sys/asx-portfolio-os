'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  PiggyBank,
  Receipt,
  Banknote,
  AlertTriangle,
  Plus,
  Trash2,
  Info,
  Calculator,
  Upload,
  FileText,
  X,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Wand2,
  BarChart3,
  Lightbulb,
} from 'lucide-react';

// --- Types ---

interface ExpenseItem {
  id: string;
  label: string;
  amount: number;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';
  category: ExpenseCategory;
}

type ExpenseCategory =
  | 'housing'
  | 'transport'
  | 'food'
  | 'utilities'
  | 'insurance'
  | 'health'
  | 'entertainment'
  | 'debt'
  | 'personal'
  | 'other';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  transport: 'Transport',
  food: 'Food & Groceries',
  utilities: 'Utilities',
  insurance: 'Insurance',
  health: 'Health',
  entertainment: 'Entertainment',
  debt: 'Debt Repayments',
  personal: 'Personal',
  other: 'Other',
};

const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

const DEFAULT_EXPENSES: ExpenseItem[] = [
  { id: '1', label: 'Rent / Mortgage', amount: 0, frequency: 'monthly', category: 'housing' },
  { id: '2', label: 'Groceries', amount: 0, frequency: 'weekly', category: 'food' },
  { id: '3', label: 'Electricity & Gas', amount: 0, frequency: 'quarterly', category: 'utilities' },
  { id: '4', label: 'Internet & Phone', amount: 0, frequency: 'monthly', category: 'utilities' },
  { id: '5', label: 'Car / Transport', amount: 0, frequency: 'monthly', category: 'transport' },
  {
    id: '6',
    label: 'Insurance (Health/Car/Home)',
    amount: 0,
    frequency: 'monthly',
    category: 'insurance',
  },
  {
    id: '7',
    label: 'Subscriptions & Entertainment',
    amount: 0,
    frequency: 'monthly',
    category: 'entertainment',
  },
];

const VALID_FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as const;
const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

function normaliseFrequency(raw: string): ExpenseItem['frequency'] {
  const lower = raw.trim().toLowerCase();
  if (VALID_FREQUENCIES.includes(lower as any)) return lower as ExpenseItem['frequency'];
  if (lower === 'week' || lower === 'w') return 'weekly';
  if (lower === 'fortnight' || lower === 'fn' || lower === '2weeks') return 'fortnightly';
  if (lower === 'month' || lower === 'm') return 'monthly';
  if (lower === 'quarter' || lower === 'q') return 'quarterly';
  if (lower === 'year' || lower === 'annual' || lower === 'annually' || lower === 'y')
    return 'yearly';
  return 'monthly';
}

// --- Auto-classification keyword dictionary ---
// Each category has keywords ordered from most to least specific.
// The classifier scores each category by counting keyword hits.
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  housing: [
    'rent',
    'mortgage',
    'strata',
    'body corp',
    'body corporate',
    'council rates',
    'rates',
    'land tax',
    'home loan',
    'housing',
    'accommodation',
    'lease',
    'property',
    'landlord',
    'tenant',
    'real estate',
    'stamp duty',
  ],
  transport: [
    'car',
    'fuel',
    'petrol',
    'diesel',
    'transport',
    'uber',
    'taxi',
    'lyft',
    'rego',
    'registration',
    'toll',
    'etoll',
    'opal',
    'myki',
    'go card',
    'parking',
    'bus',
    'train',
    'ferry',
    'flight',
    'airfare',
    'airline',
    'vehicle',
    'mechanic',
    'service',
    'roadside',
    'nrma',
    'racv',
    'racq',
    'travel',
    'commut',
  ],
  food: [
    'grocer',
    'coles',
    'woolworths',
    'woolies',
    'aldi',
    'iga',
    'food',
    'dining',
    'restaurant',
    'takeaway',
    'takeout',
    'uber eats',
    'ubereats',
    'doordash',
    'menulog',
    'deliveroo',
    'coffee',
    'cafe',
    'lunch',
    'dinner',
    'breakfast',
    'meal',
    'snack',
    'drink',
    'alcohol',
    'wine',
    'beer',
    'pub',
    'bar',
    'eating out',
    'eat out',
  ],
  utilities: [
    'electricity',
    'electric',
    'power',
    'gas',
    'water',
    'sewerage',
    'internet',
    'broadband',
    'nbn',
    'wifi',
    'phone',
    'mobile',
    'telstra',
    'optus',
    'vodafone',
    'tpg',
    'iinet',
    'aussie broadband',
    'utility',
    'utilities',
    'energy',
    'agl',
    'origin energy',
    'alinta',
  ],
  insurance: [
    'insurance',
    'insur',
    'premium',
    'life insurance',
    'income protection',
    'health insurance',
    'medibank',
    'bupa',
    'hcf',
    'nib',
    'ahm',
    'car insurance',
    'home insurance',
    'contents',
    'travel insurance',
    'tpd',
    'total permanent disability',
    'cover',
    'policy',
  ],
  health: [
    'health',
    'medical',
    'doctor',
    'gp',
    'dentist',
    'dental',
    'physio',
    'physiotherapy',
    'chiropractor',
    'optometrist',
    'glasses',
    'contacts',
    'prescription',
    'pharmacy',
    'chemist',
    'medication',
    'medicine',
    'hospital',
    'specialist',
    'psychologist',
    'therapy',
    'therapist',
    'gym',
    'fitness',
    'yoga',
    'pilates',
    'personal trainer',
    'anytime fitness',
    'f45',
    'crossfit',
    'swimming',
    'sport',
    'wellness',
    'mental health',
  ],
  entertainment: [
    'netflix',
    'stan',
    'disney',
    'spotify',
    'apple music',
    'youtube',
    'amazon prime',
    'hulu',
    'binge',
    'paramount',
    'kayo',
    'foxtel',
    'subscription',
    'streaming',
    'entertainment',
    'movie',
    'cinema',
    'concert',
    'event',
    'ticket',
    'gaming',
    'playstation',
    'xbox',
    'nintendo',
    'steam',
    'hobby',
    'hobbies',
    'recreation',
    'fun',
    'going out',
    'night out',
    'club',
    'festival',
    'audible',
    'podcast',
  ],
  debt: [
    'debt',
    'loan',
    'repayment',
    'repay',
    'credit card',
    'credit',
    'afterpay',
    'zip pay',
    'buy now pay later',
    'bnpl',
    'hecs',
    'help debt',
    'student loan',
    'personal loan',
    'car loan',
    'interest',
    'minimum payment',
    'balance',
    'owing',
    'instalment',
    'installment',
  ],
  personal: [
    'clothing',
    'clothes',
    'shoes',
    'fashion',
    'haircut',
    'hairdresser',
    'barber',
    'beauty',
    'salon',
    'nails',
    'spa',
    'massage',
    'skincare',
    'cosmetics',
    'makeup',
    'personal',
    'grooming',
    'self care',
    'self-care',
    'gift',
    'birthday',
    'christmas',
    'present',
    'donation',
    'charity',
    'child care',
    'childcare',
    'daycare',
    'school',
    'tuition',
    'education',
    'course',
    'book',
    'stationery',
    'pet',
    'vet',
    'veterinary',
  ],
  other: [],
};

interface ClassificationResult {
  category: ExpenseCategory;
  confidence: number; // 0-1
  matched: string[]; // which keywords hit
}

function classifyExpense(name: string): ClassificationResult {
  const lower = name.trim().toLowerCase();
  if (!lower) return { category: 'other', confidence: 0, matched: [] };

  // Exact category name match
  if (VALID_CATEGORIES.includes(lower as any)) {
    return { category: lower as ExpenseCategory, confidence: 1, matched: [lower] };
  }

  // Score each category
  const scores: { cat: ExpenseCategory; hits: string[]; score: number }[] = [];

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    const hits: string[] = [];
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        hits.push(kw);
        // Longer keyword matches are more specific = higher weight
        score += kw.length;
      }
    }
    if (hits.length > 0) {
      scores.push({ cat: cat as ExpenseCategory, hits, score });
    }
  }

  if (scores.length === 0) {
    return { category: 'other', confidence: 0, matched: [] };
  }

  // Sort by score descending, pick the best
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  // Confidence: strong if multiple hits or a long match
  const confidence = Math.min(1, best.score / 12);

  return {
    category: best.cat,
    confidence,
    matched: best.hits,
  };
}

function normaliseCategory(raw: string): ExpenseCategory {
  return classifyExpense(raw).category;
}

// --- Spending Trend Analysis ---
interface SpendingInsight {
  type: 'warning' | 'info' | 'tip';
  title: string;
  detail: string;
}

const BENCHMARK_PERCENTAGES: Partial<Record<ExpenseCategory, { label: string; max: number }>> = {
  housing: { label: 'Housing', max: 30 },
  food: { label: 'Food', max: 15 },
  transport: { label: 'Transport', max: 15 },
  entertainment: { label: 'Entertainment', max: 10 },
  insurance: { label: 'Insurance', max: 10 },
  personal: { label: 'Personal', max: 10 },
  debt: { label: 'Debt', max: 20 },
};

function analyseSpendingTrends(
  expenses: ExpenseItem[],
  totalAnnualExpenses: number,
  annualNetPay: number
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  if (totalAnnualExpenses === 0) return insights;

  // Group by category
  const byCat: Record<string, number> = {};
  for (const e of expenses) {
    const annual = annualise(e.amount, e.frequency);
    byCat[e.category] = (byCat[e.category] || 0) + annual;
  }

  // 1. Check against benchmarks
  for (const [cat, benchmark] of Object.entries(BENCHMARK_PERCENTAGES)) {
    const annual = byCat[cat] || 0;
    if (annual === 0) continue;
    const pct = (annual / (annualNetPay || totalAnnualExpenses)) * 100;
    if (pct > benchmark.max) {
      insights.push({
        type: 'warning',
        title: `${benchmark.label} spending is high`,
        detail:
          `${benchmark.label} is ${pct.toFixed(0)}% of your income (benchmark: under ${benchmark.max}%). ` +
          `That\u2019s ${formatCurrency(annual)}/year \u2014 review if there\u2019s room to optimise.`,
      });
    }
  }

  // 2. Identify the biggest single expense
  const nonZero = expenses.filter((e) => e.amount > 0);
  if (nonZero.length > 0) {
    const largest = [...nonZero].sort(
      (a, b) => annualise(b.amount, b.frequency) - annualise(a.amount, a.frequency)
    )[0];
    const largestAnnual = annualise(largest.amount, largest.frequency);
    const pctOfTotal = (largestAnnual / totalAnnualExpenses) * 100;
    if (pctOfTotal > 30) {
      insights.push({
        type: 'info',
        title: `"${largest.label}" dominates your budget`,
        detail:
          `This single expense is ${pct(pctOfTotal)} of all spending (${formatCurrency(largestAnnual)}/year). ` +
          `Even a small reduction here has outsized impact on your surplus.`,
      });
    }
  }

  // 3. Discretionary vs essential split
  const discretionary = ['entertainment', 'personal', 'food', 'other'];
  const discretionaryTotal = discretionary.reduce((s, c) => s + (byCat[c] || 0), 0);
  const essentialTotal = totalAnnualExpenses - discretionaryTotal;
  const discPct = (discretionaryTotal / totalAnnualExpenses) * 100;
  if (discPct > 40) {
    insights.push({
      type: 'tip',
      title: `Discretionary spending is ${pct(discPct)} of expenses`,
      detail:
        `Discretionary categories (food, entertainment, personal, other) total ${formatCurrency(discretionaryTotal)}/year. ` +
        `Essential spending is ${formatCurrency(essentialTotal)}/year. Cutting discretionary by 10% saves ${formatCurrency(discretionaryTotal * 0.1)}/year.`,
    });
  } else if (totalAnnualExpenses > 0) {
    insights.push({
      type: 'info',
      title: `Discretionary vs essential split`,
      detail:
        `${pct(discPct)} discretionary (${formatCurrency(discretionaryTotal)}/yr) vs ${pct(100 - discPct)} essential (${formatCurrency(essentialTotal)}/yr). ` +
        `A healthy split keeps discretionary under 40%.`,
    });
  }

  // 4. Many small subscriptions add up
  const subscriptionLike = expenses.filter((e) => {
    const l = e.label.toLowerCase();
    return (
      e.category === 'entertainment' ||
      l.includes('subscri') ||
      l.includes('membership') ||
      l.includes('netflix') ||
      l.includes('spotify') ||
      l.includes('stan') ||
      l.includes('disney')
    );
  });
  if (subscriptionLike.length >= 3) {
    const subTotal = subscriptionLike.reduce((s, e) => s + annualise(e.amount, e.frequency), 0);
    if (subTotal > 0) {
      insights.push({
        type: 'tip',
        title: `${subscriptionLike.length} subscriptions totalling ${formatCurrency(subTotal)}/year`,
        detail:
          `Small recurring charges add up. Review whether you actively use all of them. ` +
          `Cancelling even one ${formatCurrency(subTotal / subscriptionLike.length)}/year subscription compounds over time.`,
      });
    }
  }

  // 5. Uncategorised expenses
  const uncategorised = expenses.filter((e) => e.category === 'other' && e.amount > 0);
  if (uncategorised.length >= 2) {
    insights.push({
      type: 'info',
      title: `${uncategorised.length} expenses are uncategorised`,
      detail: `Use the "Auto-Classify All" button to automatically categorise expenses based on their name, or set categories manually for better insights.`,
    });
  }

  // 6. Savings rate
  if (annualNetPay > 0) {
    const savingsRate = ((annualNetPay - totalAnnualExpenses) / annualNetPay) * 100;
    if (savingsRate >= 20) {
      insights.push({
        type: 'info',
        title: `Savings rate: ${savingsRate.toFixed(0)}%`,
        detail: `You\u2019re saving ${savingsRate.toFixed(0)}% of net income \u2014 that\u2019s above the 20% target recommended by the 50/30/20 rule. Well done.`,
      });
    } else if (savingsRate > 0) {
      insights.push({
        type: 'tip',
        title: `Savings rate: ${savingsRate.toFixed(0)}%`,
        detail:
          `The 50/30/20 rule suggests saving at least 20% of net income. You\u2019re at ${savingsRate.toFixed(0)}%. ` +
          `Finding ${formatCurrency(annualNetPay * 0.2 - (annualNetPay - totalAnnualExpenses))}/year in savings would hit that target.`,
      });
    }
  }

  return insights;
}

function pct(value: number): string {
  return `${value.toFixed(0)}%`;
}

// --- Helper: annualise any amount ---
function annualise(amount: number, frequency: string): number {
  return amount * (FREQUENCY_MULTIPLIERS[frequency] || 12);
}

// --- Collapsible Section Component ---
function ToggleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  accentColor = 'blue',
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${colorMap[accentColor] || colorMap.blue}`} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// --- Info Tooltip ---
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs p-3 shadow-lg leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </span>
      )}
    </span>
  );
}

// --- Currency formatting ---
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// --- Main Page ---
export default function BudgetingPage() {
  // --- Income State ---
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('monthly');
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [otherIncomeFrequency, setOtherIncomeFrequency] = useState<
    'weekly' | 'fortnightly' | 'monthly' | 'yearly'
  >('monthly');

  // --- Expense State ---
  const [expenses, setExpenses] = useState<ExpenseItem[]>(DEFAULT_EXPENSES);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('other');

  // --- Spreadsheet Upload State ---
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<ExpenseItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // --- Investment Params ---
  const [investmentPercent, setInvestmentPercent] = useState<number>(50);
  const [expectedReturn, setExpectedReturn] = useState<number>(8);
  const [investmentYears, setInvestmentYears] = useState<number>(10);

  // --- Missed Investment State ---
  const [missedAmount, setMissedAmount] = useState<number>(100);
  const [missedFrequency, setMissedFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>(
    'weekly'
  );
  const [missedYears, setMissedYears] = useState<number>(20);
  const [missedReturn, setMissedReturn] = useState<number>(8);

  // --- Calculations ---
  const annualGross = useMemo(
    () => annualise(grossSalary, payFrequency),
    [grossSalary, payFrequency]
  );
  const annualOther = useMemo(
    () => annualise(otherIncome, otherIncomeFrequency),
    [otherIncome, otherIncomeFrequency]
  );

  // Simple Australian tax estimate (2024-25 rates)
  const taxEstimate = useMemo(() => {
    const taxable = annualGross;
    if (taxable <= 18200) return 0;
    if (taxable <= 45000) return (taxable - 18200) * 0.16;
    if (taxable <= 135000) return 4288 + (taxable - 45000) * 0.3;
    if (taxable <= 190000) return 31288 + (taxable - 135000) * 0.37;
    return 51638 + (taxable - 190000) * 0.45;
  }, [annualGross]);

  const medicareLevy = useMemo(() => annualGross * 0.02, [annualGross]);
  const superannuation = useMemo(() => annualGross * 0.115, [annualGross]);

  const annualNetPay = useMemo(
    () => annualGross - taxEstimate - medicareLevy,
    [annualGross, taxEstimate, medicareLevy]
  );

  const totalAnnualExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + annualise(e.amount, e.frequency), 0),
    [expenses]
  );

  const annualSurplus = useMemo(
    () => annualNetPay + annualOther - totalAnnualExpenses,
    [annualNetPay, annualOther, totalAnnualExpenses]
  );

  const monthlySurplus = annualSurplus / 12;

  // Spending trend analysis
  const spendingInsights = useMemo(
    () => analyseSpendingTrends(expenses, totalAnnualExpenses, annualNetPay),
    [expenses, totalAnnualExpenses, annualNetPay]
  );

  const investmentAllocation = useMemo(
    () => Math.max(0, annualSurplus * (investmentPercent / 100)),
    [annualSurplus, investmentPercent]
  );

  // Future value of regular investment contributions (compound growth)
  const futureValueOfInvestment = useMemo(() => {
    const monthlyContribution = investmentAllocation / 12;
    const monthlyRate = expectedReturn / 100 / 12;
    const months = investmentYears * 12;
    if (monthlyRate === 0) return monthlyContribution * months;
    return monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }, [investmentAllocation, expectedReturn, investmentYears]);

  const totalContributed = investmentAllocation * investmentYears;
  const investmentGrowth = futureValueOfInvestment - totalContributed;

  // Missed investment opportunity cost
  const missedOpportunityCost = useMemo(() => {
    const annualMissed = annualise(missedAmount, missedFrequency);
    const monthlyMissed = annualMissed / 12;
    const monthlyRate = missedReturn / 100 / 12;
    const months = missedYears * 12;
    if (monthlyRate === 0) return monthlyMissed * months;
    return monthlyMissed * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }, [missedAmount, missedFrequency, missedYears, missedReturn]);

  const totalMissedContributions = annualise(missedAmount, missedFrequency) * missedYears;
  const missedGrowth = missedOpportunityCost - totalMissedContributions;

  // Expense grouped by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const e of expenses) {
      const annual = annualise(e.amount, e.frequency);
      grouped[e.category] = (grouped[e.category] || 0) + annual;
    }
    return Object.entries(grouped)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // --- Expense handlers ---
  const updateExpense = useCallback((id: string, field: keyof ExpenseItem, value: any) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addExpense = useCallback(() => {
    if (!newExpenseLabel.trim()) return;
    // Auto-classify from name, but allow manual override if user changed the dropdown
    const autoCategory = classifyExpense(newExpenseLabel.trim());
    const category = newExpenseCategory !== 'other' ? newExpenseCategory : autoCategory.category;
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: newExpenseLabel.trim(),
        amount: 0,
        frequency: 'monthly',
        category,
      },
    ]);
    setNewExpenseLabel('');
    setNewExpenseCategory('other');
  }, [newExpenseLabel, newExpenseCategory]);

  // Auto-classify: update category when expense name is edited
  const updateExpenseLabel = useCallback((id: string, newLabel: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const result = classifyExpense(newLabel);
        // Only auto-reclassify if we have decent confidence and the name actually changed
        if (result.confidence >= 0.3 && result.category !== 'other') {
          return { ...e, label: newLabel, category: result.category };
        }
        return { ...e, label: newLabel };
      })
    );
  }, []);

  // Auto-classify all expenses based on their names
  const autoClassifyAll = useCallback(() => {
    setExpenses((prev) =>
      prev.map((e) => {
        const result = classifyExpense(e.label);
        if (result.category !== 'other' && result.confidence > 0) {
          return { ...e, category: result.category };
        }
        return e;
      })
    );
  }, []);

  // --- Spreadsheet upload handlers ---
  const parseCSV = useCallback((text: string): ExpenseItem[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2)
      throw new Error('File must contain a header row and at least one data row.');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Find column indices — support common header names
    const nameIdx = headers.findIndex((h) =>
      ['name', 'label', 'description', 'expense', 'item', 'expense_name', 'expense name'].includes(
        h
      )
    );
    const amountIdx = headers.findIndex((h) =>
      ['amount', 'cost', 'value', 'price', '$', 'aud', 'total'].includes(h)
    );
    const frequencyIdx = headers.findIndex((h) =>
      ['frequency', 'freq', 'period', 'cycle', 'interval'].includes(h)
    );
    const categoryIdx = headers.findIndex((h) => ['category', 'cat', 'type', 'group'].includes(h));

    if (nameIdx === -1 && amountIdx === -1) {
      throw new Error(
        'Could not find required columns. Your CSV needs at least a "name" and "amount" column. ' +
          'Accepted headers: name/label/description/expense/item for names, amount/cost/value/price for amounts.'
      );
    }
    if (nameIdx === -1) {
      throw new Error(
        'Could not find a name column. Use a header like "name", "label", "description", or "expense".'
      );
    }
    if (amountIdx === -1) {
      throw new Error(
        'Could not find an amount column. Use a header like "amount", "cost", "value", or "price".'
      );
    }

    const rows: ExpenseItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted CSV values
      const values = parseCSVLine(lines[i]);
      const name = (values[nameIdx] || '').trim();
      const rawAmount = (values[amountIdx] || '').replace(/[^0-9.\-]/g, '');
      const amount = parseFloat(rawAmount);

      if (!name || isNaN(amount)) continue;

      const frequency =
        frequencyIdx >= 0 ? normaliseFrequency(values[frequencyIdx] || '') : 'monthly';
      const category =
        categoryIdx >= 0 ? normaliseCategory(values[categoryIdx] || '') : normaliseCategory(name);

      rows.push({
        id: `upload-${Date.now()}-${i}`,
        label: name,
        amount: Math.abs(amount),
        frequency,
        category,
      });
    }

    if (rows.length === 0) {
      throw new Error(
        'No valid expense rows found. Check that your data has non-empty names and numeric amounts.'
      );
    }

    return rows;
  }, []);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      setUploadError(null);
      setUploadPreview([]);

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv') {
        setUploadError(
          ext === 'xlsx' || ext === 'xls'
            ? 'Excel files (.xlsx/.xls) are not directly supported. Please export your spreadsheet as CSV first (File > Save As > CSV).'
            : 'Please upload a CSV file (.csv). You can export from Excel, Google Sheets, or any spreadsheet app.'
        );
        setUploadFile(null);
        return;
      }

      setUploadFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = parseCSV(text);
          setUploadPreview(parsed);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Failed to parse CSV file.');
          setUploadPreview([]);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read file. Please try again.');
      };
      reader.readAsText(file);
    },
    [parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const importUploadedExpenses = useCallback(
    (mode: 'replace' | 'append') => {
      if (uploadPreview.length === 0) return;
      if (mode === 'replace') {
        setExpenses(uploadPreview);
      } else {
        setExpenses((prev) => [...prev, ...uploadPreview]);
      }
      // Reset upload state
      setUploadFile(null);
      setUploadPreview([]);
      setUploadError(null);
      setShowUpload(false);
    },
    [uploadPreview]
  );

  const clearUpload = useCallback(() => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadError(null);
  }, []);

  const downloadTemplate = useCallback(() => {
    const csv = [
      'name,amount,frequency,category',
      'Rent,2000,monthly,housing',
      'Groceries,150,weekly,food',
      'Electricity,350,quarterly,utilities',
      'Internet,80,monthly,utilities',
      'Car Insurance,1200,yearly,insurance',
      'Gym Membership,60,monthly,health',
      'Netflix,17,monthly,entertainment',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget_expenses_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Investment Budgeting
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Understand your income, expenses, and how much you could put towards investments. Each
            section can be toggled to show or hide.
          </p>
        </div>

        {/* ============================================ */}
        {/* SECTION 1: Understanding Your Pay */}
        {/* ============================================ */}
        <ToggleSection title="Understanding Your Pay" icon={Banknote} accentColor="green">
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-sm text-emerald-900 dark:text-emerald-200 space-y-2">
              <p>
                <strong>Gross Salary</strong> is your total salary before any deductions. This is
                the headline number on your employment contract.
              </p>
              <p>
                <strong>Superannuation (11.5%)</strong> is paid by your employer on top of your
                gross salary into your super fund. It&apos;s not part of your take-home pay but
                it&apos;s growing your retirement savings.
              </p>
              <p>
                <strong>Income Tax</strong> is deducted based on ATO tax brackets. The more you
                earn, the higher percentage you pay on each bracket (progressive tax).
              </p>
              <p>
                <strong>Medicare Levy (2%)</strong> funds Australia&apos;s public health system.
                It&apos;s charged on top of your income tax.
              </p>
              <p>
                <strong>Net Pay (take-home)</strong> = Gross Salary - Income Tax - Medicare Levy.
                This is what actually lands in your bank account.
              </p>
            </div>

            {/* Gross Salary Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gross Salary (before tax){' '}
                  <InfoTip text="Enter your salary per pay period. Select the matching frequency below." />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min={0}
                    value={grossSalary || ''}
                    onChange={(e) => setGrossSalary(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pay Frequency
                </label>
                <select
                  value={payFrequency}
                  onChange={(e) => setPayFrequency(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Other Income */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Other Income (dividends, side hustle, etc.){' '}
                  <InfoTip text="Any additional income outside your main salary. This is added to your net pay for budgeting purposes." />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min={0}
                    value={otherIncome || ''}
                    onChange={(e) => setOtherIncome(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Other Income Frequency
                </label>
                <select
                  value={otherIncomeFrequency}
                  onChange={(e) => setOtherIncomeFrequency(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            {/* Pay Breakdown Summary */}
            {annualGross > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  label="Annual Gross"
                  value={formatCurrency(annualGross)}
                  sub="Before deductions"
                  icon={DollarSign}
                  color="blue"
                />
                <SummaryCard
                  label="Income Tax"
                  value={formatCurrency(taxEstimate)}
                  sub={`Effective rate: ${annualGross > 0 ? ((taxEstimate / annualGross) * 100).toFixed(1) : 0}%`}
                  icon={Receipt}
                  color="red"
                />
                <SummaryCard
                  label="Medicare Levy"
                  value={formatCurrency(medicareLevy)}
                  sub="2% of gross"
                  icon={Receipt}
                  color="amber"
                />
                <SummaryCard
                  label="Annual Net Pay"
                  value={formatCurrency(annualNetPay)}
                  sub={`${formatCurrency(annualNetPay / 12)}/month take-home`}
                  icon={Banknote}
                  color="green"
                />
              </div>
            )}

            {annualGross > 0 && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-900 dark:text-blue-200">
                <strong>Employer Super Contribution:</strong> {formatCurrency(superannuation)}/year
                (11.5% on top of your gross salary, paid into your super fund)
              </div>
            )}
          </div>
        </ToggleSection>

        {/* ============================================ */}
        {/* SECTION 2: Expenses Breakdown */}
        {/* ============================================ */}
        <ToggleSection title="Your Expenses" icon={Receipt} accentColor="amber">
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-900 dark:text-amber-200 space-y-2">
              <p>
                <strong>Fixed expenses</strong> are predictable costs like rent, insurance, and loan
                repayments. These stay roughly the same each period.
              </p>
              <p>
                <strong>Variable expenses</strong> like groceries, entertainment, and fuel
                fluctuate. Use an average amount for these.
              </p>
              <p>
                Enter each expense with its natural frequency (weekly groceries, monthly rent,
                quarterly bills) &mdash; the calculator normalises everything to annual figures
                automatically.
              </p>
            </div>

            {/* Expense Actions Row */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {showUpload ? 'Hide Upload' : 'Import from Spreadsheet'}
              </button>
              <button
                onClick={autoClassifyAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                title="Re-classify all expenses based on their names using the auto-detection engine"
              >
                <Wand2 className="w-4 h-4" />
                Auto-Classify All
              </button>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Download CSV template"
              >
                <Download className="w-4 h-4" />
                Template
              </button>
            </div>

            {showUpload && (
              <div className="space-y-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                {/* Format Guide */}
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    Upload a CSV file with your expenses. Expected columns:
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-md p-3 font-mono text-xs border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500">name,amount,frequency,category</p>
                    <p>Rent,2000,monthly,housing</p>
                    <p>Groceries,150,weekly,food</p>
                    <p>Electricity,350,quarterly,utilities</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    <strong>Required:</strong> name + amount. <strong>Optional:</strong> frequency
                    (defaults to monthly) and category (auto-detected from name). Supports exports
                    from Excel, Google Sheets, or any app that saves CSV.
                  </p>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                      e.target.value = '';
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isDragging
                      ? 'Drop your file here'
                      : 'Drag & drop a CSV file, or click to browse'}
                  </p>
                </div>

                {/* Upload Error */}
                {uploadError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
                  </div>
                )}

                {/* File Info & Preview */}
                {uploadFile && uploadPreview.length > 0 && (
                  <div className="space-y-3">
                    {/* File header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {uploadFile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({(uploadFile.size / 1024).toFixed(1)} KB &middot; {uploadPreview.length}{' '}
                          expense{uploadPreview.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <button
                        onClick={clearUpload}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Clear file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Preview Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                              Name
                            </th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                              Amount
                            </th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                              Frequency
                            </th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                              Category
                            </th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                              Annual
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.slice(0, 10).map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-gray-100 dark:border-gray-800"
                            >
                              <td className="py-1.5 px-3 text-gray-900 dark:text-white">
                                {row.label}
                              </td>
                              <td className="py-1.5 px-3 text-right text-gray-900 dark:text-white">
                                {formatCurrency(row.amount)}
                              </td>
                              <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400 capitalize">
                                {row.frequency}
                              </td>
                              <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400">
                                {CATEGORY_LABELS[row.category]}
                              </td>
                              <td className="py-1.5 px-3 text-right text-gray-500 dark:text-gray-400">
                                {formatCurrency(annualise(row.amount, row.frequency))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 dark:border-gray-700">
                            <td
                              colSpan={4}
                              className="py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                              Total ({uploadPreview.length} items)
                              {uploadPreview.length > 10 && (
                                <span className="font-normal text-gray-500">
                                  {' '}
                                  &mdash; showing first 10
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(
                                uploadPreview.reduce(
                                  (s, r) => s + annualise(r.amount, r.frequency),
                                  0
                                )
                              )}
                              /yr
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Import Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => importUploadedExpenses('replace')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Replace All Expenses
                      </button>
                      <button
                        onClick={() => importUploadedExpenses('append')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Existing
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        &ldquo;Replace&rdquo; clears current expenses. &ldquo;Add&rdquo; appends to
                        them.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expense List */}
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <input
                    type="text"
                    value={expense.label}
                    onChange={(e) => updateExpenseLabel(expense.id, e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={expense.amount || ''}
                      onChange={(e) => updateExpense(expense.id, 'amount', Number(e.target.value))}
                      placeholder="0"
                      className="w-28 pl-6 pr-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <select
                    value={expense.frequency}
                    onChange={(e) => updateExpense(expense.id, 'frequency', e.target.value)}
                    className="w-32 px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(expense.id, 'category', e.target.value)}
                    className="w-36 px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-24 text-right">
                    {formatCurrency(annualise(expense.amount, expense.frequency))}/yr
                  </span>
                  <button
                    onClick={() => removeExpense(expense.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Expense */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <input
                type="text"
                placeholder="New expense name... (category auto-detected)"
                value={newExpenseLabel}
                onChange={(e) => {
                  setNewExpenseLabel(e.target.value);
                  // Live auto-classify as user types
                  const result = classifyExpense(e.target.value);
                  if (result.confidence >= 0.3) {
                    setNewExpenseCategory(result.category);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-36 px-2 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={addExpense}
                disabled={!newExpenseLabel.trim()}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Category Breakdown */}
            {expensesByCategory.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Expense Breakdown by Category (Annual)
                </h3>
                <div className="space-y-2">
                  {expensesByCategory.map(([cat, annual]) => {
                    const pct = totalAnnualExpenses > 0 ? (annual / totalAnnualExpenses) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-36 text-sm text-gray-600 dark:text-gray-400">
                          {CATEGORY_LABELS[cat as ExpenseCategory] || cat}
                        </span>
                        <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(annual)}
                        </span>
                        <span className="w-12 text-right text-xs text-gray-500">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm font-semibold">
                  <span className="text-gray-700 dark:text-gray-300">Total Annual Expenses</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(totalAnnualExpenses)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ToggleSection>

        {/* ============================================ */}
        {/* SECTION 2.5: Spending Trends & Insights */}
        {/* ============================================ */}
        {spendingInsights.length > 0 && (
          <ToggleSection
            title="Spending Trends & Insights"
            icon={BarChart3}
            accentColor="purple"
            defaultOpen={true}
          >
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Auto-generated insights based on your expense data. These update live as you add or
                change expenses.
              </p>
              {spendingInsights.map((insight, i) => {
                const styles = {
                  warning: {
                    bg: 'bg-amber-50 dark:bg-amber-950/30',
                    border: 'border-amber-200 dark:border-amber-800',
                    icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />,
                    title: 'text-amber-900 dark:text-amber-200',
                    detail: 'text-amber-800 dark:text-amber-300',
                  },
                  info: {
                    bg: 'bg-blue-50 dark:bg-blue-950/30',
                    border: 'border-blue-200 dark:border-blue-800',
                    icon: <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />,
                    title: 'text-blue-900 dark:text-blue-200',
                    detail: 'text-blue-800 dark:text-blue-300',
                  },
                  tip: {
                    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                    border: 'border-emerald-200 dark:border-emerald-800',
                    icon: <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />,
                    title: 'text-emerald-900 dark:text-emerald-200',
                    detail: 'text-emerald-800 dark:text-emerald-300',
                  },
                };
                const s = styles[insight.type];
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg} ${s.border}`}
                  >
                    {s.icon}
                    <div>
                      <p className={`text-sm font-semibold ${s.title}`}>{insight.title}</p>
                      <p className={`text-xs mt-0.5 ${s.detail}`}>{insight.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ToggleSection>
        )}

        {/* ============================================ */}
        {/* SECTION 3: Budget Summary & Surplus */}
        {/* ============================================ */}
        <ToggleSection title="Budget Summary" icon={Calculator} accentColor="purple">
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-sm text-purple-900 dark:text-purple-200 space-y-2">
              <p>
                Your <strong>surplus</strong> is what remains after all expenses are paid from your
                net income plus other income. This is the money available for saving and investing.
              </p>
              <p>
                A healthy budget aims to direct a meaningful portion of surplus towards investments.
                Even small, consistent amounts compound significantly over time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                label="Annual Net Income"
                value={formatCurrency(annualNetPay + annualOther)}
                sub="Take-home + other income"
                icon={Banknote}
                color="green"
              />
              <SummaryCard
                label="Annual Expenses"
                value={formatCurrency(totalAnnualExpenses)}
                sub={`${formatCurrency(totalAnnualExpenses / 12)}/month`}
                icon={Receipt}
                color="amber"
              />
              <SummaryCard
                label="Annual Surplus"
                value={formatCurrency(annualSurplus)}
                sub={`${formatCurrency(monthlySurplus)}/month available`}
                icon={annualSurplus >= 0 ? TrendingUp : TrendingDown}
                color={annualSurplus >= 0 ? 'green' : 'red'}
              />
            </div>

            {annualSurplus < 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900 dark:text-red-200">
                  <p className="font-semibold">Your expenses exceed your income.</p>
                  <p className="mt-1">
                    Review your expense categories above to identify areas where you might cut back.
                    Even reducing discretionary spending by a small amount can free up cash for
                    investment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ToggleSection>

        {/* ============================================ */}
        {/* SECTION 4: Investment Allocation */}
        {/* ============================================ */}
        <ToggleSection title="Investment Allocation" icon={PiggyBank} accentColor="green">
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-sm text-emerald-900 dark:text-emerald-200 space-y-2">
              <p>
                Decide what percentage of your surplus to allocate towards investments. The
                remainder stays as a savings buffer for emergencies and short-term goals.
              </p>
              <p>
                <strong>Compound growth</strong> means your returns earn their own returns. Starting
                early and being consistent matters more than the exact amount. Even modest regular
                contributions can grow substantially over a long time horizon.
              </p>
              <p>
                The ASX has historically returned around <strong>8-10% per year</strong> (including
                dividends, before inflation). Adjust the expected return to model different
                scenarios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  % of Surplus to Invest{' '}
                  <InfoTip text="What percentage of your monthly surplus do you want to direct towards investments? The rest stays as cash savings." />
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={investmentPercent}
                    onChange={(e) => setInvestmentPercent(Number(e.target.value))}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className="w-12 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {investmentPercent}%
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expected Annual Return (%){' '}
                  <InfoTip text="Historical ASX average is ~8-10% including dividends. Use a lower figure for a conservative estimate." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Horizon (years)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={investmentYears}
                  onChange={(e) => setInvestmentYears(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {investmentAllocation > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <SummaryCard
                  label="Monthly Investment"
                  value={formatCurrency(investmentAllocation / 12)}
                  sub={`${formatCurrency(investmentAllocation)}/year`}
                  icon={PiggyBank}
                  color="green"
                />
                <SummaryCard
                  label="Total Contributed"
                  value={formatCurrency(totalContributed)}
                  sub={`Over ${investmentYears} years`}
                  icon={DollarSign}
                  color="blue"
                />
                <SummaryCard
                  label="Projected Value"
                  value={formatCurrency(futureValueOfInvestment)}
                  sub={`${formatCurrency(investmentGrowth)} in growth (${expectedReturn}% p.a.)`}
                  icon={TrendingUp}
                  color="green"
                />
              </div>
            )}

            {investmentAllocation > 0 && (
              <GrowthTimeline
                monthlyContribution={investmentAllocation / 12}
                annualReturn={expectedReturn}
                years={investmentYears}
              />
            )}
          </div>
        </ToggleSection>

        {/* ============================================ */}
        {/* SECTION 5: Missed Investment Opportunity Cost */}
        {/* ============================================ */}
        <ToggleSection
          title="Missed Investment Opportunity Cost"
          icon={AlertTriangle}
          accentColor="red"
          defaultOpen={true}
        >
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-900 dark:text-red-200 space-y-2">
              <p>
                Every dollar not invested is a missed opportunity for compound growth. This section
                shows what happens when you skip or delay contributions.
              </p>
              <p>
                For example, spending an extra <strong>$50/week</strong> on discretionary purchases
                instead of investing it could cost you hundreds of thousands over a long timeframe.
                This is the <strong>true cost</strong> of spending &mdash; not just the price tag,
                but the future growth you forgo.
              </p>
              <p>
                Think of it this way: a $5 coffee today could be worth $30+ in 30 years at 8% p.a.
                returns. This doesn&apos;t mean never buy coffee &mdash; it means understand the
                trade-off.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Not Invested{' '}
                  <InfoTip text="How much are you regularly spending (or not investing) that could otherwise go towards building wealth?" />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min={0}
                    value={missedAmount || ''}
                    onChange={(e) => setMissedAmount(Number(e.target.value))}
                    placeholder="100"
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frequency
                </label>
                <select
                  value={missedFrequency}
                  onChange={(e) => setMissedFrequency(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Over How Many Years
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={missedYears}
                  onChange={(e) => setMissedYears(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assumed Return (% p.a.)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={missedReturn}
                  onChange={(e) => setMissedReturn(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {missedAmount > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                  <SummaryCard
                    label="Total Not Invested"
                    value={formatCurrency(totalMissedContributions)}
                    sub={`${formatCurrency(annualise(missedAmount, missedFrequency))}/year for ${missedYears} years`}
                    icon={DollarSign}
                    color="amber"
                  />
                  <SummaryCard
                    label="Missed Growth"
                    value={formatCurrency(missedGrowth)}
                    sub="Returns you never earned"
                    icon={TrendingDown}
                    color="red"
                  />
                  <SummaryCard
                    label="Total Opportunity Cost"
                    value={formatCurrency(missedOpportunityCost)}
                    sub="What that money could have been worth"
                    icon={AlertTriangle}
                    color="red"
                  />
                </div>

                {/* Scenario Table */}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Opportunity Cost at Different Time Horizons
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                            Years
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                            Total Missed
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                            Would Be Worth
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                            Growth Lost
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[5, 10, 15, 20, 25, 30].map((yr) => {
                          const annualMissed = annualise(missedAmount, missedFrequency);
                          const monthlyMissed = annualMissed / 12;
                          const mRate = missedReturn / 100 / 12;
                          const m = yr * 12;
                          const fv =
                            mRate === 0
                              ? monthlyMissed * m
                              : monthlyMissed * ((Math.pow(1 + mRate, m) - 1) / mRate);
                          const totalIn = annualMissed * yr;
                          return (
                            <tr
                              key={yr}
                              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
                            >
                              <td className="py-2 px-3 text-gray-900 dark:text-white">{yr}</td>
                              <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                {formatCurrency(totalIn)}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(fv)}
                              </td>
                              <td className="py-2 px-3 text-right text-red-500">
                                {formatCurrency(fv - totalIn)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </ToggleSection>
      </div>
      <Footer />
    </div>
  );
}

// --- Reusable Summary Card ---
function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${iconColorMap[color] || iconColorMap.blue}`} />
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

// --- Growth Timeline Component ---
function GrowthTimeline({
  monthlyContribution,
  annualReturn,
  years,
}: {
  monthlyContribution: number;
  annualReturn: number;
  years: number;
}) {
  const milestones = useMemo(() => {
    const points: { year: number; contributed: number; value: number }[] = [];
    const monthlyRate = annualReturn / 100 / 12;

    for (let yr = 1; yr <= years; yr++) {
      const m = yr * 12;
      const contributed = monthlyContribution * m;
      const value =
        monthlyRate === 0
          ? contributed
          : monthlyContribution * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate);
      points.push({ year: yr, contributed, value });
    }
    return points;
  }, [monthlyContribution, annualReturn, years]);

  const maxValue = milestones.length > 0 ? milestones[milestones.length - 1].value : 0;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Investment Growth Over Time
      </h3>
      <div className="space-y-2">
        {milestones
          .filter((_, i) => {
            if (years <= 10) return true;
            if (years <= 20) return i % 2 === 0 || i === milestones.length - 1;
            return i % 5 === 0 || i === milestones.length - 1;
          })
          .map((m) => {
            const valuePct = maxValue > 0 ? (m.value / maxValue) * 100 : 0;
            const contributedPct = maxValue > 0 ? (m.contributed / maxValue) * 100 : 0;
            return (
              <div key={m.year} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                  Year {m.year}
                </span>
                <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/30 dark:bg-emerald-400/20 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(valuePct, 100)}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(contributedPct, 100)}%` }}
                  />
                </div>
                <span className="w-28 text-right text-xs font-medium text-gray-900 dark:text-white">
                  {formatCurrency(m.value)}
                </span>
              </div>
            );
          })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          Contributions
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500/30 dark:bg-emerald-400/20" />
          Growth (compound returns)
        </div>
      </div>
    </div>
  );
}
