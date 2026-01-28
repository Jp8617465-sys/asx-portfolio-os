"""
api_clients/yfinance_client.py
Free fundamentals client using yfinance for bootstrap approach.
Falls back to EODHD if needed.
"""

import time
from typing import Dict, List, Optional
import pandas as pd

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    print("⚠️ yfinance not installed. Run: pip install yfinance")


def fetch_fundamentals_yfinance(ticker: str, throttle_s: float = 2.0) -> Optional[Dict]:
    """
    Fetch fundamental data for a single ticker using yfinance.

    Args:
        ticker: Stock ticker (e.g., 'CBA' for CBA.AX)
        throttle_s: Delay in seconds between requests (default 2.0s)

    Returns:
        Dictionary with fundamental metrics, or None if failed
    """
    if not YFINANCE_AVAILABLE:
        raise ImportError("yfinance is not installed")

    try:
        # Add .AX suffix for ASX stocks
        symbol = f"{ticker}.AX" if not ticker.endswith('.AX') else ticker
        stock = yf.Ticker(symbol)
        info = stock.info

        # Check if we got valid data
        if not info or 'symbol' not in info:
            return None

        # Extract fundamental metrics
        fundamentals = {
            'symbol': f"{ticker}.AU",  # Store with .AU suffix to match EODHD format
            'sector': info.get('sector'),
            'industry': info.get('industry'),
            'market_cap': info.get('marketCap'),
            'pe_ratio': info.get('trailingPE'),
            'pb_ratio': info.get('priceToBook'),
            'eps': info.get('trailingEps'),
            'roe': info.get('returnOnEquity'),
            'debt_to_equity': info.get('debtToEquity'),
            'div_yield': info.get('dividendYield'),
            'revenue_growth_yoy': info.get('revenueGrowth'),
            'profit_margin': info.get('profitMargins'),
            'current_ratio': info.get('currentRatio'),
            'quick_ratio': info.get('quickRatio'),
            'eps_growth': info.get('earningsGrowth'),
            'free_cash_flow': info.get('freeCashflow'),
        }

        # Convert percentages to decimals (yfinance returns as decimals, keep consistent)
        if fundamentals['roe'] and fundamentals['roe'] > 1:
            fundamentals['roe'] = fundamentals['roe'] / 100
        if fundamentals['debt_to_equity'] and fundamentals['debt_to_equity'] > 100:
            fundamentals['debt_to_equity'] = fundamentals['debt_to_equity'] / 100

        # Throttle to avoid rate limiting
        time.sleep(throttle_s)

        return fundamentals

    except Exception as e:
        print(f"⚠️ Failed to fetch {ticker} from yfinance: {e}")
        return None


def fetch_fundamentals_batch(
    tickers: List[str],
    throttle_s: float = 2.0,
    max_retries: int = 3
) -> pd.DataFrame:
    """
    Fetch fundamentals for a batch of tickers.

    Args:
        tickers: List of ticker symbols
        throttle_s: Delay between requests
        max_retries: Max retry attempts per ticker

    Returns:
        DataFrame with fundamental data
    """
    if not YFINANCE_AVAILABLE:
        raise ImportError("yfinance is not installed")

    results = []
    failed = []

    for i, ticker in enumerate(tickers, 1):
        print(f"📊 Fetching {ticker} ({i}/{len(tickers)})...", end=' ')

        for attempt in range(max_retries):
            data = fetch_fundamentals_yfinance(ticker, throttle_s)
            if data:
                results.append(data)
                print("✅")
                break
            elif attempt < max_retries - 1:
                print(f"⚠️ Retry {attempt + 1}/{max_retries}...", end=' ')
                time.sleep(throttle_s * 2)  # Longer delay on retry
            else:
                print("❌ Failed")
                failed.append(ticker)

    if failed:
        print(f"\n⚠️ Failed to fetch: {', '.join(failed)}")

    if not results:
        return pd.DataFrame()

    df = pd.DataFrame(results)
    df['updated_at'] = pd.Timestamp.utcnow()

    return df


def test_coverage(tickers: List[str], sample_size: int = 100) -> float:
    """
    Test yfinance coverage on a sample of tickers.

    Args:
        tickers: List of all tickers
        sample_size: Number of tickers to test

    Returns:
        Coverage percentage (0-1)
    """
    import random

    sample = random.sample(tickers, min(sample_size, len(tickers)))
    print(f"🧪 Testing yfinance coverage on {len(sample)} tickers...")

    df = fetch_fundamentals_batch(sample, throttle_s=1.0)

    if df.empty:
        return 0.0

    # Calculate coverage for key metrics
    coverage_pe = df['pe_ratio'].notna().mean()
    coverage_roe = df['roe'].notna().mean()
    coverage_overall = (df['pe_ratio'].notna() & df['roe'].notna()).mean()

    print(f"\n📈 Coverage Results:")
    print(f"   P/E Ratio: {coverage_pe:.1%}")
    print(f"   ROE: {coverage_roe:.1%}")
    print(f"   Both: {coverage_overall:.1%}")

    return coverage_overall


if __name__ == "__main__":
    # Test with sample ASX tickers
    test_tickers = ['CBA', 'BHP', 'CSL', 'WES', 'NAB']

    print("Testing yfinance client...")
    df = fetch_fundamentals_batch(test_tickers)

    if not df.empty:
        print(f"\n✅ Successfully fetched {len(df)} stocks")
        print("\nSample data:")
        print(df[['symbol', 'sector', 'pe_ratio', 'roe', 'debt_to_equity']].head())
    else:
        print("\n❌ No data fetched")
