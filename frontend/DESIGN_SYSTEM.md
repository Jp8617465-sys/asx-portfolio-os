# ASX Portfolio OS - Design System Documentation

## Overview

This design system provides a unified visual language for the ASX Portfolio OS platform, balancing professional sophistication with clarity and trust. It supports both user-facing dashboards (clean, action-oriented) and internal dashboards (technical, data-dense).

## Design Philosophy

### Core Principles

1. **Trust Through Clarity**: Financial data demands precision and transparency
2. **Professional Sophistication**: Inspired by Bloomberg Terminal, Morningstar, and Claude's interface
3. **Separation of Concerns**: Distinct visual languages for user-facing vs internal tools
4. **Accessibility First**: WCAG AA compliance minimum, keyboard navigation, proper contrast ratios

## Color System

### Theme Support

The design system supports both light and dark modes, with dark mode as the default. Theme switching is available via the `ThemeToggle` component.

### CSS Variables

All colors are defined as CSS custom properties in `styles/variables.css`:

#### Dark Mode (Default)

```css
--bg-primary: #1a1a1a;
--bg-secondary: #242424;
--bg-tertiary: #2e2e2e;
--bg-elevated: #333333;

--text-primary: #ececec;
--text-secondary: #a0a0a0;
--text-tertiary: #737373;

--accent-primary: #5b9fd7;
--accent-hover: #7ab8e8;
```

#### Light Mode

```css
--bg-primary: #ffffff;
--bg-secondary: #f7f7f5;
--bg-tertiary: #e7e9ed;

--text-primary: #121417;
--text-secondary: #525252;
```

### Trading Signals

Signal colors follow market conventions (green = buy, red = sell):

```css
--signal-strong-buy: #10b981;
--signal-buy: #34d399;
--signal-hold: #9ca3af;
--signal-sell: #f87171;
--signal-strong-sell: #ef4444;
```

Each signal also has a corresponding background color with 10% opacity for subtle indicators.

### Tailwind Colors

Access these colors in your components via Tailwind utilities:

```tsx
<div className="bg-signal-buy text-white dark:bg-signal-dark-buy">Buy Signal</div>
```

## Typography

### Font Families

```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace;
--font-numeric: 'SF Pro Display', -apple-system, sans-serif;
```

### Type Scale

```css
--text-4xl: 2.25rem; /* 36px */
--text-3xl: 1.875rem; /* 30px */
--text-2xl: 1.5rem; /* 24px */
--text-xl: 1.25rem; /* 20px */
--text-lg: 1.125rem; /* 18px */
--text-base: 1rem; /* 16px */
--text-sm: 0.875rem; /* 14px */
--text-xs: 0.75rem; /* 12px */
```

### Financial Data Typography

**IMPORTANT**: Always use tabular numerals for financial data to ensure proper alignment:

```tsx
<div className="tabular-nums font-numeric">${price.toFixed(2)}</div>
```

## Components

### StockCard

Display stock information with trading signals.

```tsx
import { StockCard } from '@/components/ui/StockCard';

<StockCard
  ticker="CBA"
  name="Commonwealth Bank"
  price={104.5}
  change={2.3}
  changePercent={2.25}
  signal="BUY"
  confidence={0.85}
  expectedReturn={12.5}
  onClick={() => handleStockClick('CBA')}
/>;
```

**Features**:

- Color-coded left border by signal strength
- Tabular numerals for prices
- Hover effects with subtle elevation
- Keyboard accessible

### ModelMetricCard

Display model performance metrics (internal dashboards).

```tsx
import { ModelMetricCard } from '@/components/ui/ModelMetricCard';

<ModelMetricCard
  label="Accuracy"
  value={0.8765}
  subtitle="Last 30 days"
  format="percentage"
  threshold={{
    excellent: 0.85,
    good: 0.8,
    acceptable: 0.75,
  }}
/>;
```

**Features**:

- Monospace font for technical feel
- Color-coded by performance threshold
- Compact, data-dense layout

### DataTable

Responsive table for financial data.

```tsx
import { DataTable } from '@/components/ui/DataTable';

const columns = [
  { key: 'ticker', header: 'Ticker', sortable: true },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    align: 'right',
    render: (row) => <span className="tabular-nums">${row.price}</span>,
  },
];

<DataTable
  columns={columns}
  data={stocks}
  keyExtractor={(item) => item.ticker}
  onRowClick={handleRowClick}
  stickyHeader
/>;
```

**Features**:

- Sortable columns
- Sticky headers
- Row click handlers
- Custom cell rendering
- Responsive design

### Button

```tsx
import { Button } from '@/components/ui/button';

<Button variant="primary">Primary Action</Button>
<Button variant="signal-buy">Buy</Button>
<Button variant="signal-sell">Sell</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
```

**Variants**:

- `primary`: Primary actions
- `outline`: Secondary actions
- `ghost`: Tertiary actions
- `signal-buy`: Buy actions
- `signal-sell`: Sell actions
- `signal-hold`: Hold actions

**Sizes**: `sm`, `md`, `lg`

### Badge

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Info</Badge>
```

**Variants**: `default`, `secondary`, `outline`, `success`, `warning`, `error`, `info`, `neutral`

**Sizes**: `sm`, `md`, `lg`

### Input

```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Stock Ticker"
  placeholder="Enter ticker symbol"
  helperText="e.g., CBA, BHP, NAB"
  error={errors.ticker}
  fullWidth
/>;
```

**Features**:

- Label support
- Error states with messages
- Helper text
- Focus states with accent ring
- Full width option

### ThemeToggle

```tsx
import ThemeToggle from '@/components/ThemeToggle';

<ThemeToggle />;
```

**Features**:

- Sun/Moon icon toggle
- Smooth transitions
- Persists user preference in localStorage
- Defaults to dark mode

## Layouts

### DashboardLayout (User-Facing)

```tsx
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

<DashboardLayout
  sidebar={<YourSidebar />}
  header={<h1>Dashboard</h1>}
  user={{
    name: 'John Doe',
    email: 'john@example.com',
  }}
>
  {/* Your page content */}
</DashboardLayout>;
```

**Features**:

- Collapsible sidebar (280px wide)
- Fixed header with user profile
- Mobile responsive (hamburger menu)
- Theme toggle integrated

### InternalLayout (Internal Dashboards)

```tsx
import { InternalLayout, SystemStatus, InternalNavLink } from '@/components/layouts/InternalLayout';

<InternalLayout
  title="MODEL PERFORMANCE"
  navigation={
    <>
      <InternalNavLink href="/internal/models" active>
        Models
      </InternalNavLink>
      <InternalNavLink href="/internal/drift">Drift</InternalNavLink>
    </>
  }
  statusIndicators={
    <>
      <SystemStatus status="healthy" label="API" />
      <SystemStatus status="healthy" label="DB" />
    </>
  }
>
  {/* Your internal dashboard content */}
</InternalLayout>;
```

**Features**:

- Technical monospace navigation
- System status indicators
- Dense metrics grid support
- Dark theme optimized

## Spacing

Use consistent spacing with CSS variables or Tailwind utilities:

```css
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem; /* 8px */
--spacing-3: 0.75rem; /* 12px */
--spacing-4: 1rem; /* 16px */
--spacing-6: 1.5rem; /* 24px */
--spacing-8: 2rem; /* 32px */
```

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-card: 0 16px 40px rgba(15, 23, 42, 0.08);
```

## Border Radius

```css
--radius-sm: 0.25rem; /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-full: 9999px;
```

## Accessibility

### Guidelines

1. **Color Contrast**: Maintain 4.5:1 minimum ratio for text
2. **Keyboard Navigation**: All interactive elements must be keyboard accessible
3. **Focus Indicators**: Visible focus states on all interactive elements
4. **ARIA Labels**: Use on complex components (modals, dropdowns, etc.)
5. **Screen Readers**: Test with screen readers

### Focus States

All interactive elements automatically receive focus rings:

```css
.focus-ring {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
  ring-color: var(--accent-primary);
}
```

### Reduced Motion

The design system respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Best Practices

### Do's

✅ Use tabular numerals for all financial data
✅ Maintain consistent spacing (multiples of 4px)
✅ Use semantic color names (signal-buy vs green)
✅ Test in both light and dark modes
✅ Ensure keyboard accessibility
✅ Use the provided components instead of creating custom ones

### Don'ts

❌ Don't use inline styles for colors
❌ Don't mix different font families without purpose
❌ Don't ignore accessibility requirements
❌ Don't create new color values outside the design system
❌ Don't use non-tabular fonts for financial data

## Migration Guide

### Updating Existing Components

1. Replace custom colors with design system variables
2. Add `tabular-nums` class to financial data
3. Update button/badge variants to use new options
4. Wrap pages in appropriate layout components

### Example Migration

**Before:**

```tsx
<div style={{ color: '#10B981' }}>${price}</div>
```

**After:**

```tsx
<div className="text-metric-positive tabular-nums">${price.toFixed(2)}</div>
```

## File Structure

```
frontend/
├── styles/
│   └── variables.css           # CSS custom properties
├── app/
│   └── globals.css             # Global styles
├── components/
│   ├── ui/
│   │   ├── StockCard.tsx
│   │   ├── ModelMetricCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── Input.tsx
│   ├── layouts/
│   │   ├── DashboardLayout.tsx
│   │   └── InternalLayout.tsx
│   └── ThemeToggle.tsx
└── tailwind.config.js          # Tailwind configuration
```

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

For questions or suggestions about the design system, please open an issue in the repository or contact the development team.

## Changelog

### Version 1.0.0 (2026-02-03)

- Initial design system implementation
- Core component library
- Dark/light theme support
- User-facing and internal layouts
- Comprehensive documentation
