"""
scripts/cron_weekly_features.py
Render cron entrypoint for weekly extended feature set build.
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.build_extended_feature_set import build_features

if __name__ == "__main__":
    print("🚀 Starting weekly feature set build...")
    end = datetime.utcnow().date()
    start = end - timedelta(days=760)
    build_features(start, end)
    print("✅ Weekly feature set build complete.")
