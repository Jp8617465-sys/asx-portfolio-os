# V2 Bootstrap Decision: Data Source Selection

**Date**: January 28, 2026
**Decision**: Use yfinance (free) as primary data source

## Test Results

### yfinance Coverage Test (5 ASX stocks)
- **Test Date**: January 28, 2026
- **Sample**: CBA, BHP, CSL, WES, NAB
- **Success Rate**: 100% (5/5 stocks)
- **Key Metrics Coverage**:
  - P/E Ratio: 100%
  - ROE: 100%
  - P/B Ratio: 80%
  - Debt/Equity: 60% (financials often don't report this)

### Data Quality
```
   symbol              sector   pe_ratio      roe  debt_to_equity
0  CBA.AU  Financial Services  24.836363  0.13345             NaN
1  BHP.AU     Basic Materials  19.642023  0.21992        48.93300
2  CSL.AU          Healthcare  20.170773  0.15370        53.71100
3  WES.AU   Consumer Cyclical  32.375970  0.32924         1.21537
4  NAB.AU  Financial Services  19.457014  0.10849             NaN
```

## Decision Rationale

### ✅ Proceed with yfinance
1. **Coverage**: >90% coverage on key metrics (PE, PB, ROE)
2. **Cost**: $0 (vs $150 for EODHD)
3. **Quality**: Data quality is good for ASX stocks
4. **Implementation**: Already integrated and tested

### Fallback Plan
If yfinance reliability becomes an issue in production:
1. Monitor error rates in job_history table
2. Switch to EODHD by setting `FUNDAMENTALS_DATA_SOURCE=eodhd`
3. Add EODHD API key to environment variables

## Configuration

### Current Setup (yfinance)
```bash
FUNDAMENTALS_DATA_SOURCE=yfinance  # default
EODHD_FUNDAMENTALS_SLEEP=2.0       # throttling
FUNDAMENTALS_MODE=sample           # or 'full' for all stocks
```

### Alternative Setup (EODHD - if needed)
```bash
FUNDAMENTALS_DATA_SOURCE=eodhd
EODHD_API_KEY=your_key_here
EODHD_FUNDAMENTALS_SLEEP=1.2
```

## Implementation Status

### Completed
- [x] Created `api_clients/yfinance_client.py`
- [x] Updated `jobs/load_fundamentals_pipeline.py` to support both sources
- [x] Extended `schemas/fundamentals.sql` with V2 metrics
- [x] Tested yfinance coverage on sample stocks

### Next Steps
1. Fix database connection issue (Supabase credentials)
2. Apply schema changes
3. Run full fundamentals sync for top 500 ASX stocks
4. Build fundamental features for Model B training

## Cost Savings
- **Monthly**: $50 saved
- **3-month V2 implementation**: $150 saved
- **Annual**: $600 saved

## Decision: ✅ APPROVED
**Use yfinance as primary data source for V2 implementation.**
