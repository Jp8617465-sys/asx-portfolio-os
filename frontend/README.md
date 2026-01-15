# ASX Portfolio OS - Frontend

Modern Next.js 14 frontend for the ASX Portfolio OS platform, featuring AI-powered stock signals, portfolio management, and explainable predictions.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4
- **Charts**: TradingView Lightweight Charts 4.1
- **Tables**: TanStack Table v8
- **HTTP Client**: Axios 1.6
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives
- **State Management**: React hooks + Zustand (planned)

## Architecture

### Design System

Central design token system (`lib/design-tokens.ts`) provides:
- Brand colors and signal colors (Strong Buy → Strong Sell)
- Typography scale with Inter font family
- Spacing, border radius, shadows
- Animation timings and easing functions
- Component-specific configurations

### API Integration

Type-safe API client (`lib/api-client.ts`) with:
- Axios instance with base URL configuration
- Request/response interceptors for auth and error handling
- Dedicated methods for all API endpoints
- Automatic token management

### Type Safety

Comprehensive TypeScript definitions (`lib/types.ts`) for:
- Signal types and models
- SHAP reasoning values
- Portfolio and holdings
- Chart data (OHLC)
- API responses

## Components

### Core Components

**ConfidenceGauge** (`components/confidence-gauge.tsx`)
- Animated circular SVG gauge showing 0-100% confidence
- Color-coded by signal type
- Smooth animation with easeOutCubic easing
- Three sizes: sm (64px), md (120px), lg (180px)

**StockSearch** (`components/stock-search.tsx`)
- Autocomplete search with 300ms debounce
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click-outside-to-close functionality
- Loading states and error handling

**SignalBadge** (`components/signal-badge.tsx`)
- Color-coded badges for BUY/SELL/HOLD signals
- Lucide React icons
- Optional confidence percentage display

**StockChart** (`components/stock-chart.tsx`)
- TradingView Lightweight Charts wrapper
- Candlestick display with volume histogram
- Signal markers support
- Responsive sizing

**WatchlistTable** (`components/watchlist-table.tsx`)
- TanStack Table with sorting and filtering
- Row click navigation to stock detail
- Remove from watchlist functionality
- Responsive grid layout

**AccuracyDisplay** (`components/accuracy-display.tsx`)
- Overall accuracy gauge
- Per-signal-type breakdown
- Historical prediction metrics

**ReasoningPanel** (`components/reasoning-panel.tsx`)
- SHAP-based explainability
- Model contribution breakdown (Technical/Fundamentals/Sentiment)
- Top factors with impact scores
- Visual impact bars

**Header** / **Footer** (`components/header.tsx`, `components/footer.tsx`)
- Responsive navigation with mobile menu
- Dark mode support (planned)
- Brand consistency

## Pages

### Landing Page (`app/page.tsx`)
- Hero section with gradient background
- Live stock search
- Sample signals showcase
- Features grid (6 features)
- CTA sections
- Inline footer

### Dashboard (`app/app/dashboard/page.tsx`)
- Stats cards (4 metrics)
- Top signals grid (3 cards)
- Full watchlist table
- Add/remove watchlist functionality

### Stock Detail (`app/stock/[ticker]/page.tsx`)
- Stock header with price and signal
- Confidence gauge (large)
- Price chart with volume
- SHAP reasoning panel
- Historical accuracy display
- Watchlist toggle button

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://asx-portfolio-os.onrender.com/api/v1
NEXT_PUBLIC_API_KEY=your_api_key_here
```

## Local Development

### Prerequisites
- Node.js 18+ or Bun 1.0+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Jp8617465-sys/asx-portfolio-os.git
cd asx-portfolio-os/frontend

# Install dependencies
npm install
# or
bun install

# Run development server
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

## Deployment

### Vercel (Recommended)

1. **Import Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your GitHub repository
   - Select the `frontend` directory as the root

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

3. **Set Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://asx-portfolio-os.onrender.com/api/v1
   NEXT_PUBLIC_API_KEY=your_api_key_here
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your app
   - Get your production URL (e.g., `asx-portfolio-os.vercel.app`)

### Automatic Deployments

Every push to `main` will trigger a new deployment on Vercel.

## Features Roadmap

### Phase 1: MVP (Current)
- ✅ Stock search with autocomplete
- ✅ Live AI signals display
- ✅ Confidence gauge visualization
- ✅ Price charts with volume
- ✅ SHAP reasoning explainability
- ✅ Historical accuracy tracking
- ✅ Watchlist management
- ⏳ Backend API integration (in progress)

### Phase 2: Portfolio Management (Week 3-4)
- Portfolio upload (CSV/broker import)
- Holdings analysis
- AI-driven rebalancing suggestions
- Tax optimization recommendations
- Risk metrics dashboard

### Phase 3: Alerts & Monitoring (Week 5-6)
- Email/push notifications
- Signal change alerts
- Custom watchlist alerts
- Daily digest emails

### Phase 4: Advanced Features (Week 7+)
- Portfolio backtesting
- Custom timeframes
- Export functionality
- Dark mode
- Mobile app (React Native)

## Performance Targets

- **Lighthouse Score**: 95+ (Performance, Accessibility, SEO)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 300KB (gzipped)

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari 14+
- Mobile Safari iOS 14+
- Chrome Android (last 2 versions)

## Contributing

See the main repository [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

Proprietary - All rights reserved.

---

**Built with** ❤️ **by the ASX Portfolio OS team**
