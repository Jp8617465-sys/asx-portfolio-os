# Portfolio Upload Documentation

## Overview

The portfolio upload feature allows users to upload their stock holdings via CSV file. The system automatically syncs current prices, fetches AI signals, and calculates P&L metrics.

## CSV Format

### Required Columns

- `ticker`: Stock ticker symbol (automatically adds .AX suffix if missing)
- `shares`: Number of shares held (must be positive)
- `avg_cost`: Average cost per share in dollars (must be non-negative)
- `date_acquired`: (Optional) Date when shares were acquired (YYYY-MM-DD format)

### Example CSV

```csv
ticker,shares,avg_cost,date_acquired
CBA.AX,100,95.50,2023-06-15
BHP.AX,250,42.30,2023-08-20
CSL.AX,50,285.75,2024-01-10
WBC.AX,200,22.80,2023-09-05
NAB.AX,150,30.25,2024-02-01
```

See `sample_portfolio.csv` in the project root for a working example.

### Validation Rules

1. **Ticker**: Must be a valid string. System auto-adds `.AX` suffix if not present
2. **Shares**: Must be a positive number (decimals allowed)
3. **Average Cost**: Must be zero or positive
4. **Date Acquired**: Optional, must be in YYYY-MM-DD format if provided

## Upload Flow

### 1. User Authentication
- User must be logged in with valid JWT token
- Token is stored in HTTP-only cookie (`access_token`)
- Backend validates token and extracts `user_id`

### 2. Frontend Upload
- Navigate to `/app/portfolio`
- Click "Upload New Portfolio" or drag & drop CSV file
- Frontend validates file type and previews first 5 rows
- User confirms and submits upload

### 3. Backend Processing

**Endpoint**: `POST /portfolio/upload`

**Process**:
1. Parse CSV file and validate format
2. Validate each row (ticker, shares, avg_cost)
3. Auto-add `.AX` suffix to tickers if missing
4. Create or update user portfolio
5. Insert holdings into `user_holdings` table
6. Sync current prices via `sync_holding_prices()` stored procedure
7. Update portfolio totals via `update_portfolio_totals()` stored procedure

**Response**:
```json
{
  "status": "success",
  "portfolio_id": 123,
  "holdings_count": 5,
  "message": "Successfully uploaded 5 holdings"
}
```

### 4. Display Portfolio
- Frontend automatically calls `/portfolio/analyze` after upload
- Syncs latest prices and AI signals
- Displays holdings table with:
  - Ticker, Company Name
  - Shares, Avg Cost, Current Price
  - Total Value, P&L ($), P&L (%)
  - AI Signal, Confidence Score

## API Endpoints

### Upload Portfolio
```
POST /api/portfolio/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

Body:
- file: CSV file
- portfolio_name: "My Portfolio" (optional, query param)
```

### Get Portfolio
```
GET /api/portfolio
Authorization: Bearer <jwt_token>

Response:
{
  "portfolioId": 123,
  "userId": "456",
  "name": "My Portfolio",
  "totalValue": 50000.00,
  "totalCostBasis": 45000.00,
  "totalPl": 5000.00,
  "totalPlPct": 11.11,
  "cashBalance": 1000.00,
  "numHoldings": 5,
  "holdings": [
    {
      "id": 1,
      "ticker": "CBA.AX",
      "shares": 100,
      "avgCost": 95.50,
      "dateAcquired": "2023-06-15",
      "currentPrice": 105.20,
      "currentValue": 10520.00,
      "costBasis": 9550.00,
      "unrealizedPl": 970.00,
      "unrealizedPlPct": 10.16,
      "currentSignal": "BUY",
      "signalConfidence": 75.5
    }
  ],
  "lastSyncedAt": "2024-03-15T10:30:00Z"
}
```

### Analyze Portfolio (Sync Prices & Signals)
```
POST /api/portfolio/analyze
Authorization: Bearer <jwt_token>

Response: Same as GET /portfolio
```

### Get Rebalancing Suggestions
```
GET /api/portfolio/rebalancing?regenerate=false
Authorization: Bearer <jwt_token>

Response:
{
  "status": "ok",
  "portfolioId": 123,
  "suggestions": [
    {
      "ticker": "CBA.AX",
      "action": "SELL",
      "suggestedQuantity": 50,
      "suggestedValue": 5260.00,
      "reason": "Strong sell signal (confidence: 85.0%). Returns don't justify risk.",
      "currentSignal": "STRONG_SELL",
      "signalConfidence": 85.0,
      "currentShares": 100,
      "currentWeightPct": 15.5,
      "targetWeightPct": 0,
      "priority": 1,
      "confidenceScore": 85.0
    }
  ],
  "generatedAt": "2024-03-15T10:30:00Z",
  "message": "Generated 3 new suggestions"
}
```

## Database Schema

### user_portfolios
```sql
CREATE TABLE user_portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user_accounts(user_id),
  name VARCHAR(255) DEFAULT 'My Portfolio',
  cash_balance NUMERIC(15, 2) DEFAULT 0,
  total_value NUMERIC(15, 2),
  total_cost_basis NUMERIC(15, 2),
  total_pl NUMERIC(15, 2),
  total_pl_pct NUMERIC(8, 4),
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_holdings
```sql
CREATE TABLE user_holdings (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER NOT NULL REFERENCES user_portfolios(id),
  ticker VARCHAR(20) NOT NULL,
  shares NUMERIC(15, 4) NOT NULL,
  avg_cost NUMERIC(15, 4) NOT NULL,
  date_acquired DATE,
  current_price NUMERIC(15, 4),
  current_value NUMERIC(15, 2),
  cost_basis NUMERIC(15, 2),
  unrealized_pl NUMERIC(15, 2),
  unrealized_pl_pct NUMERIC(8, 4),
  current_signal VARCHAR(20),
  signal_confidence NUMERIC(5, 2),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Stored Procedures

### sync_holding_prices(holding_id INTEGER)
- Fetches latest price for a holding from `daily_prices` table
- Updates `current_price`, `current_value`, `cost_basis`
- Calculates `unrealized_pl` and `unrealized_pl_pct`
- Fetches current AI signal from `ml_signals`
- Updates `last_synced_at` timestamp

### update_portfolio_totals(portfolio_id INTEGER)
- Aggregates all holdings to calculate portfolio totals
- Updates `total_value`, `total_cost_basis`, `total_pl`, `total_pl_pct`
- Updates `last_synced_at` timestamp

### sync_portfolio_prices(portfolio_id INTEGER)
- Calls `sync_holding_prices()` for all holdings in portfolio
- Calls `update_portfolio_totals()` after syncing
- Returns count of updated holdings

## Error Handling

### Common Errors

1. **Missing Required Columns**
   - HTTP 400: "CSV must have columns: ticker, shares, avg_cost"

2. **Invalid Data Format**
   - HTTP 400: "Shares must be positive for BHP.AX"
   - HTTP 400: "Average cost must be non-negative for CBA.AX"

3. **Empty CSV**
   - HTTP 400: "No valid holdings found in CSV"

4. **Authentication Errors**
   - HTTP 401: "Unauthorized" (missing or invalid JWT token)
   - HTTP 403: "User account is inactive"

5. **Portfolio Not Found**
   - HTTP 404: "Portfolio not found" (for GET/analyze requests)

6. **Server Errors**
   - HTTP 500: "Upload failed: {error_message}"

## Testing

### Manual Testing

1. Create test CSV file with sample data
2. Log in to application at `/login`
3. Navigate to `/app/portfolio`
4. Upload CSV file and verify:
   - Preview shows correct data
   - Upload succeeds
   - Holdings table displays with prices and signals
   - P&L calculations are accurate
   - Rebalancing suggestions appear (if applicable)

### Automated Tests

See:
- `frontend/components/__tests__/portfolio-upload.test.tsx`
- `frontend/app/app/__tests__/portfolio-page.test.tsx`
- `tests/test_portfolio_upload.py`
- `tests/test_e2e_portfolio_flow.py`

## Troubleshooting

### Upload Fails with 401 Unauthorized
- Ensure you're logged in
- Check JWT token in browser cookies (`access_token`)
- Token may have expired (1 hour expiry) - log in again

### Prices Not Syncing
- Verify `daily_prices` table has recent data for tickers
- Check backend logs for errors in `sync_holding_prices()`
- Ensure tickers have `.AX` suffix

### Signals Not Showing
- Verify `ml_signals` table has predictions for tickers
- Check Model A is running and generating signals
- Backend may default to 'HOLD' if no signal available

### P&L Shows $0
- Current price may not be available yet
- Run "Analyze Portfolio" to force price sync
- Check if ticker exists in `daily_prices` table

## Future Enhancements

1. **Real-time Price Updates**: WebSocket integration for live prices
2. **Company Name Resolution**: Fetch actual company names from ASX
3. **Sector Classification**: Display holdings by sector
4. **Portfolio Comparison**: Compare multiple portfolios
5. **Transaction History**: Track buys/sells over time
6. **Tax Loss Harvesting**: Identify opportunities for tax optimization
7. **Dividend Tracking**: Record and project dividend income
8. **Performance Charts**: Visualize portfolio performance over time
