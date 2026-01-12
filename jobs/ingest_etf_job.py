"""
jobs/ingest_etf_job.py
Wrapper to load ETF data.
"""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from load_etf_data import main

if __name__ == "__main__":
    main()
