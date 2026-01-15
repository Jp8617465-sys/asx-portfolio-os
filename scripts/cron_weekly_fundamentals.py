"""
scripts/cron_weekly_fundamentals.py
Render cron entrypoint for weekly fundamentals refresh.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.load_fundamentals_pipeline import fundamentals_pipeline, get_ticker_list
from jobs.derive_fundamentals_features import derive_features

if __name__ == "__main__":
    print("🚀 Starting weekly fundamentals pipeline...")
    fundamentals_pipeline(get_ticker_list())
    print("🚀 Deriving fundamentals features...")
    derive_features()
    print("✅ Weekly fundamentals complete.")
