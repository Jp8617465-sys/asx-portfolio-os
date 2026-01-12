"""
jobs/ingest_asx_announcements_job.py
Wrapper for ASX announcements scraper.
"""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from asx_announcements_scraper import run_scraper

if __name__ == "__main__":
    run_scraper()
