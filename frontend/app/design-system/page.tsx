'use client';

import { StockCard } from '@/components/ui/StockCard';
import { ModelMetricCard } from '@/components/ui/ModelMetricCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

// Sample data
const sampleStocks = [
  {
    ticker: 'CBA',
    name: 'Commonwealth Bank',
    price: 104.5,
    change: 2.3,
    changePercent: 2.25,
    signal: 'BUY' as const,
    confidence: 0.85,
    expectedReturn: 12.5,
  },
  {
    ticker: 'BHP',
    name: 'BHP Group',
    price: 45.2,
    change: -0.8,
    changePercent: -1.74,
    signal: 'HOLD' as const,
    confidence: 0.72,
    expectedReturn: 5.2,
  },
  {
    ticker: 'NAB',
    name: 'National Australia Bank',
    price: 32.8,
    change: 1.1,
    changePercent: 3.47,
    signal: 'STRONG_BUY' as const,
    confidence: 0.92,
    expectedReturn: 18.3,
  },
];

const tableData = [
  { ticker: 'CBA', price: 104.5, signal: 'BUY', change: 2.25 },
  { ticker: 'BHP', price: 45.2, signal: 'HOLD', change: -1.74 },
  { ticker: 'NAB', price: 32.8, signal: 'STRONG_BUY', change: 3.47 },
  { ticker: 'WES', price: 68.4, signal: 'SELL', change: -2.1 },
];

const columns: Column<(typeof tableData)[0]>[] = [
  { key: 'ticker', header: 'Ticker', sortable: true },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    align: 'right',
    render: (row) => <span className="tabular-nums">${row.price.toFixed(2)}</span>,
  },
  {
    key: 'signal',
    header: 'Signal',
    render: (row) => <Badge variant="success">{row.signal}</Badge>,
  },
  {
    key: 'change',
    header: 'Change %',
    sortable: true,
    align: 'right',
    render: (row) => (
      <span className={row.change >= 0 ? 'text-metric-positive' : 'text-metric-negative'}>
        {row.change >= 0 ? '+' : ''}
        {row.change.toFixed(2)}%
      </span>
    ),
  },
];

export default function DesignSystemShowcase() {
  return (
    <DashboardLayout
      user={{
        name: 'Demo User',
        email: 'demo@example.com',
      }}
      header={<h1 className="text-2xl font-bold">Design System Showcase</h1>}
    >
      <div className="space-y-8">
        {/* Introduction */}
        <section>
          <h2 className="text-3xl font-bold mb-2">ASX Portfolio Design System</h2>
          <p className="text-gray-600 dark:text-gray-400">
            A comprehensive showcase of the unified design language for the ASX Portfolio OS
            platform.
          </p>
        </section>

        {/* Buttons */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="signal-buy">Buy Signal</Button>
            <Button variant="signal-sell">Sell Signal</Button>
            <Button variant="signal-hold">Hold Signal</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* Badges */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Badges</h3>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="success" size="sm">
              Small
            </Badge>
            <Badge variant="success" size="lg">
              Large
            </Badge>
          </div>
        </section>

        {/* Input Fields */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Input Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Input label="Stock Ticker" placeholder="e.g., CBA, BHP" />
            <Input label="Price Target" type="number" placeholder="0.00" />
            <Input
              label="With Helper Text"
              helperText="Enter a valid stock ticker symbol"
              placeholder="Ticker"
            />
            <Input label="With Error" error="This field is required" placeholder="Required" />
          </div>
        </section>

        {/* Stock Cards */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Stock Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleStocks.map((stock) => (
              <StockCard key={stock.ticker} {...stock} />
            ))}
          </div>
        </section>

        {/* Model Metrics */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Model Metrics (Internal Dashboards)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ModelMetricCard
              label="Accuracy"
              value={0.8765}
              format="percentage"
              threshold={{ excellent: 0.85, good: 0.8, acceptable: 0.75 }}
            />
            <ModelMetricCard
              label="Precision"
              value={0.9123}
              format="percentage"
              threshold={{ excellent: 0.85, good: 0.8, acceptable: 0.75 }}
            />
            <ModelMetricCard label="F1 Score" value={0.8432} format="percentage" />
            <ModelMetricCard label="Total Predictions" value={15234} format="integer" />
          </div>
        </section>

        {/* Data Table */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Data Table</h3>
          <DataTable
            columns={columns}
            data={tableData}
            keyExtractor={(item) => item.ticker}
            stickyHeader
            striped
          />
        </section>

        {/* Color Palette */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Color Palette</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Trading Signals</h4>
              <div className="grid grid-cols-5 gap-2">
                <div className="p-4 rounded bg-signal-strong-buy text-white text-center text-sm">
                  Strong Buy
                </div>
                <div className="p-4 rounded bg-signal-buy text-white text-center text-sm">Buy</div>
                <div className="p-4 rounded bg-signal-hold text-white text-center text-sm">
                  Hold
                </div>
                <div className="p-4 rounded bg-signal-sell text-white text-center text-sm">
                  Sell
                </div>
                <div className="p-4 rounded bg-signal-strong-sell text-white text-center text-sm">
                  Strong Sell
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">System Status</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-4 rounded bg-system-healthy text-white text-center text-sm">
                  Healthy
                </div>
                <div className="p-4 rounded bg-system-degraded text-white text-center text-sm">
                  Degraded
                </div>
                <div className="p-4 rounded bg-system-down text-white text-center text-sm">
                  Down
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Typography</h3>
          <div className="space-y-2">
            <p className="text-4xl font-bold">Heading 1 (4xl)</p>
            <p className="text-3xl font-bold">Heading 2 (3xl)</p>
            <p className="text-2xl font-semibold">Heading 3 (2xl)</p>
            <p className="text-xl font-semibold">Heading 4 (xl)</p>
            <p className="text-lg">Large Text (lg)</p>
            <p className="text-base">Base Text (base)</p>
            <p className="text-sm">Small Text (sm)</p>
            <p className="text-xs">Extra Small Text (xs)</p>
            <p className="font-mono">Monospace Font</p>
            <p className="tabular-nums font-numeric">Tabular Numbers: $1,234.56 $987.65 $12.34</p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
