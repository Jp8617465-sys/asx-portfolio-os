"""
scripts/cron_daily_announcements.py
Render cron entrypoint for daily ASX announcements scrape.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.asx_announcements_scraper import run_scraper

if __name__ == "__main__":
    print("🚀 Starting ASX announcements scrape...")
    run_scraper()
    print("✅ ASX announcements scrape complete.")
