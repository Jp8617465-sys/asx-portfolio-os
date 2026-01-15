"""
scripts/cron_daily_prices.py
Render cron entrypoint for daily price sync.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    print("🚀 Starting daily price sync...")
    # sync_live_prices_job runs at module level
    import jobs.sync_live_prices_job
    print("✅ Daily price sync complete.")
