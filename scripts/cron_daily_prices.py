"""
scripts/cron_daily_prices.py
Render cron entrypoint for daily price sync.

Uses the direct EODHD API method which doesn't require the API server to be running.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    print("🚀 Starting daily price sync...")
    
    # Try direct method first (doesn't require API server)
    try:
        from jobs.sync_prices_direct_job import sync_last_day_prices
        result = sync_last_day_prices()
        print(f"✅ Daily price sync complete: {result['rows']} rows for {result['date']}")
    except Exception as e:
        print(f"⚠️ Direct sync failed: {e}")
        print("🔄 Trying API method...")
        
        # Fallback to API method
        try:
            import jobs.sync_live_prices_job
            print("✅ Daily price sync complete via API.")
        except Exception as api_error:
            print(f"❌ Both sync methods failed: {api_error}")
            sys.exit(1)
