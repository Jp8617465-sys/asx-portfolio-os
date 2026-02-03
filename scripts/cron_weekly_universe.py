"""
scripts/cron_weekly_universe.py
Render cron entrypoint for weekly universe refresh.

Runs weekly to ensure new ASX listings are captured and delisted stocks are removed.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    print("🚀 Starting weekly universe refresh...")
    from jobs.refresh_universe_job import refresh_universe
    
    try:
        count = refresh_universe()
        print(f"✅ Weekly universe refresh complete: {count} symbols")
    except Exception as e:
        print(f"❌ Universe refresh failed: {e}")
        sys.exit(1)
